import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, count, desc, eq, gt, sql } from 'drizzle-orm'
import { DB, type Database } from '../../../database/database.module.js'
import { producerLeads } from '../../../database/schema/index.js'
import { AuditService } from '../../audit/audit.service.js'
import type { CreateLeadInput, LeadStatus, UpdateLeadInput } from './applications.schemas.js'

export type ProducerLead = {
  id: number
  fullName: string
  email: string
  phone: string
  city: string
  hasOnlineExperience: boolean
  hasRecordedContent: boolean
  topic: string | null
  message: string | null
  adminNotes: string | null
  status: LeadStatus
  source: string
  handledBy: string | null
  contactedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const ONE_HOUR_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * ONE_HOUR_MS
/** Contatos por e-mail em 24 h (acima disso o formulário é abuso, não interesse). */
const MAX_LEADS_PER_EMAIL_PER_DAY = 3
/** Teto global por hora, alto de propósito: só impede inundar o banco, sem barrar contato legítimo. */
const MAX_LEADS_PER_HOUR = 2000
/** Teto de linhas da lista do admin. */
const MAX_LIST = 300

const leadColumns = {
  id: producerLeads.id,
  fullName: producerLeads.fullName,
  email: producerLeads.email,
  phone: producerLeads.phone,
  city: producerLeads.city,
  hasOnlineExperience: producerLeads.hasOnlineExperience,
  hasRecordedContent: producerLeads.hasRecordedContent,
  topic: producerLeads.topic,
  message: producerLeads.notes,
  adminNotes: producerLeads.adminNotes,
  status: producerLeads.status,
  source: producerLeads.source,
  handledBy: producerLeads.handledBy,
  contactedAt: producerLeads.contactedAt,
  createdAt: producerLeads.createdAt,
  updatedAt: producerLeads.updatedAt,
}

function toStatus(value: string): LeadStatus {
  return value === 'contacted' || value === 'qualified' || value === 'archived' ? value : 'new'
}

/** "Contatou" fixa a data do primeiro contato; voltar para "novo" zera. */
export function resolveContactedAt(
  current: Date | null,
  next: LeadStatus,
  now: Date = new Date(),
): Date | null {
  if (next === 'new') return null
  if ((next === 'contacted' || next === 'qualified') && !current) return now
  return current
}

@Injectable()
export class LeadsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /**
   * Recebe o contato do visitante. Limites que valem MESMO quando a chamada vem do servidor do Next
   * (que não passa pelo limite por IP): repetição do mesmo contato é ignorada, no máximo 3 contatos
   * por e-mail por dia e um teto geral alto por hora (só contra inundação).
   */
  async createLead(input: CreateLeadInput): Promise<{ success: true }> {
    const now = Date.now()
    const email = input.email

    return this.db.transaction(async (tx) => {
      // Envios simultâneos do mesmo e-mail esperam um pelo outro (senão o limite diário furaria).
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`producer-lead:${email}`}))`)

      const [duplicate] = await tx
        .select({ id: producerLeads.id })
        .from(producerLeads)
        .where(
          and(
            sql`lower(${producerLeads.email}) = ${email}`,
            eq(producerLeads.phone, input.phone),
            gt(producerLeads.createdAt, new Date(now - ONE_DAY_MS)),
          ),
        )
        .limit(1)
      if (duplicate) return { success: true as const }

      const [perEmail] = await tx
        .select({ total: count() })
        .from(producerLeads)
        .where(
          and(
            sql`lower(${producerLeads.email}) = ${email}`,
            gt(producerLeads.createdAt, new Date(now - ONE_DAY_MS)),
          ),
        )
      if ((perEmail?.total ?? 0) >= MAX_LEADS_PER_EMAIL_PER_DAY) {
        throw new HttpException(
          'Você já enviou contatos recentemente. Aguarde nosso retorno.',
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      // Teto só contra inundação do banco: bem alto, para um spammer não bloquear contato legítimo.
      const [overall] = await tx
        .select({ total: count() })
        .from(producerLeads)
        .where(gt(producerLeads.createdAt, new Date(now - ONE_HOUR_MS)))
      if ((overall?.total ?? 0) >= MAX_LEADS_PER_HOUR) {
        throw new HttpException(
          'Recebemos muitos contatos agora. Tente novamente mais tarde.',
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }

      await tx.insert(producerLeads).values({
        fullName: input.name,
        email,
        phone: input.phone,
        city: input.city,
        hasOnlineExperience: input.hasOnlineExperience,
        hasRecordedContent: input.hasRecordedContent,
        topic: input.topic,
        notes: input.notes,
        status: 'new',
        source: 'become_producer_page',
      })
      return { success: true as const }
    })
  }

  async listLeads(): Promise<ProducerLead[]> {
    const rows = await this.db
      .select(leadColumns)
      .from(producerLeads)
      .orderBy(desc(producerLeads.createdAt), desc(producerLeads.id))
      .limit(MAX_LIST)
    return rows.map((row) => ({ ...row, status: toStatus(row.status) }))
  }

  /** Atualiza o funil de um lead. Só admin chega aqui (a rota tem `@Roles(['admin'])`). */
  async updateLead(
    adminId: string,
    leadId: number,
    input: UpdateLeadInput,
    client: { ipAddress?: string | null; userAgent?: string | null } = {},
  ) {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: producerLeads.status, contactedAt: producerLeads.contactedAt })
        .from(producerLeads)
        .where(eq(producerLeads.id, leadId))
        .for('update')
      if (!current) throw new NotFoundException('Lead não encontrado')

      const [updated] = await tx
        .update(producerLeads)
        .set({
          status: input.status,
          adminNotes: input.adminNotes,
          handledBy: adminId,
          contactedAt: resolveContactedAt(current.contactedAt, input.status),
          updatedAt: new Date(),
        })
        .where(eq(producerLeads.id, leadId))
        .returning(leadColumns)

      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'producer_lead',
          resourceId: leadId,
          changes: { status: { from: current.status, to: input.status } },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent,
        },
        tx,
      )
      return { ...updated, status: toStatus(updated.status) }
    })
  }
}
