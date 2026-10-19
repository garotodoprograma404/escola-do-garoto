import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { Role, SessionUser } from '@vox/contracts'
import { and, count, desc, eq, inArray, ne, or, sql, type SQL } from 'drizzle-orm'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { isUniqueViolation } from '../../database/postgres-errors.js'
import { courses, enrollments, profiles, userRoles, users } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import { hashPassword } from '../auth/crypto/password-hasher.js'
import { SessionsService } from '../auth/sessions.service.js'
import type { AuditContext } from './audit-context.js'
import type {
  AdminUserStatus,
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
} from './admin-users.schemas.js'
import { likeContains } from './sql-search.js'

/** Comissão padrão da plataforma para produtores novos. */
const DEFAULT_PLATFORM_COMMISSION_RATE = 10

/** Usuário no formato que as telas do admin esperam (camelCase). */
export type AdminUserListItem = {
  id: string
  name: string
  email: string
  role: Role
  /** Todos os papéis ativos (a tela mostra `role`, o principal). */
  roles: Role[]
  status: 'active' | 'pending_kyc' | 'suspended'
  avatar?: string
  joinedAt: string
  lastLogin?: string
  phone?: string
  cpf?: string
  birthDate?: string
  bio?: string
  platformCommissionRate?: number
  address?: Address
  kycVerified: boolean
  twoFactorEnabled: boolean
}

type Address = {
  zipCode: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
}

type UserEnrollmentSummary = {
  id: number
  courseId: number
  courseTitle: string
  courseSlug: string | null
  courseThumbnailUrl: string | null
  status: 'active' | 'completed' | 'cancelled' | 'refunded'
  progressPercentage: number
  enrolledAt: string
  completedAt: string | null
  lastAccessedAt: string | null
}

export type AdminUserDetails = AdminUserListItem & {
  enrollments: UserEnrollmentSummary[]
  coursesCount: number
}

/** Chave do cadeado que serializa tudo que pode tirar um admin do ar (proteção do último admin). */
const ADMIN_GUARD_LOCK = 'vox:admin-guard'

const SUSPENDED_LIKE: readonly AdminUserStatus[] = ['suspended', 'banned', 'blocked_finance']

function normalizeCommissionRate(raw: number | null | undefined): number {
  if (raw === null || raw === undefined || !Number.isFinite(raw)) {
    return DEFAULT_PLATFORM_COMMISSION_RATE
  }
  // Valores guardados como fração (0.10 = 10%) são convertidos para percentual.
  const percent = raw >= 0 && raw <= 1 ? raw * 100 : raw
  return Math.round((Math.min(100, Math.max(0, percent)) + Number.EPSILON) * 100) / 100
}

function parseAddress(value: unknown): Address | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const candidate = value as Partial<Address>
  if (
    typeof candidate.zipCode !== 'string' ||
    typeof candidate.street !== 'string' ||
    typeof candidate.number !== 'string' ||
    typeof candidate.neighborhood !== 'string' ||
    typeof candidate.city !== 'string' ||
    typeof candidate.state !== 'string'
  ) {
    return undefined
  }
  return {
    zipCode: candidate.zipCode,
    street: candidate.street,
    number: candidate.number,
    complement: candidate.complement,
    neighborhood: candidate.neighborhood,
    city: candidate.city,
    state: candidate.state,
  }
}

function uniqueConstraint(error: unknown): string | undefined {
  const read = (e: unknown) => (e as { constraint?: unknown } | null)?.constraint
  const name = read(error) ?? read((error as { cause?: unknown } | null)?.cause)
  return typeof name === 'string' ? name : undefined
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
  ) {}

  // ------------------------------------------------------------------ leitura

  async list(query: ListUsersQuery): Promise<{ users: AdminUserListItem[]; total: number }> {
    const view = this.userView()
    const filters: Array<SQL | undefined> = []
    if (query.role) filters.push(sql`${view.role} = ${query.role}`)
    if (query.status) {
      // "Banido" e "bloqueio financeiro" nunca existiram como estado de fato: filtro vazio.
      const wanted =
        query.status === 'banned' || query.status === 'blocked_finance' ? null : query.status
      filters.push(wanted === null ? sql`false` : sql`${view.status} = ${wanted}`)
    }
    if (query.search) {
      filters.push(
        or(
          likeContains(profiles.fullName, query.search),
          likeContains(users.email, query.search),
          likeContains(profiles.cpf, query.search),
        ),
      )
    }
    const where = and(...filters)
    const offset = (query.page - 1) * query.pageSize
    const newestFirst = [desc(profiles.createdAt), desc(profiles.id)] as const

    // Papel e status vêm de consultas por usuário (lateral). Sem filtro neles, pagina primeiro só em
    // perfis + usuários e calcula papel/status apenas das linhas da página: com 20 mil usuários, isso
    // troca ~140 ms por ~10 ms. Com filtro de papel/status é preciso calcular antes de paginar.
    if (!query.role && !query.status) {
      const base = () =>
        this.db
          .select({ id: profiles.id })
          .from(profiles)
          .innerJoin(users, eq(users.id, profiles.id))
      const [pageIds, [totalRow]] = await Promise.all([
        base()
          .where(where)
          .orderBy(...newestFirst)
          .limit(query.pageSize)
          .offset(offset),
        this.db
          .select({ total: count() })
          .from(profiles)
          .innerJoin(users, eq(users.id, profiles.id))
          .where(where),
      ])
      if (pageIds.length === 0) return { users: [], total: totalRow?.total ?? 0 }
      const rows = await view
        .select()
        .where(
          inArray(
            profiles.id,
            pageIds.map((row) => row.id),
          ),
        )
        .orderBy(...newestFirst)
      return { users: rows.map(toListItem), total: totalRow?.total ?? 0 }
    }

    const rows = await view
      .select()
      .where(where)
      .orderBy(...newestFirst)
      .limit(query.pageSize)
      .offset(offset)

    const [totalRow] = await view.count().where(where)
    return { users: rows.map(toListItem), total: totalRow?.total ?? 0 }
  }

  async get(id: string): Promise<AdminUserListItem> {
    const view = this.userView()
    const [row] = await view.select().where(eq(profiles.id, id))
    if (!row) throw new NotFoundException('Usuário não encontrado')
    return toListItem(row)
  }

  /** Usuário + matrículas (modal de detalhes). */
  async getDetails(id: string): Promise<AdminUserDetails> {
    const user = await this.get(id)
    const rows = await this.db
      .select({
        id: enrollments.id,
        courseId: enrollments.courseId,
        status: enrollments.status,
        progressPercentage: enrollments.progressPercentage,
        createdAt: enrollments.createdAt,
        completedAt: enrollments.completedAt,
        lastAccessedAt: enrollments.lastAccessedAt,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        courseThumbnailUrl: courses.thumbnailUrl,
      })
      .from(enrollments)
      .leftJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.studentId, id))
      .orderBy(desc(enrollments.createdAt), desc(enrollments.id))

    const list: UserEnrollmentSummary[] = rows.map((row) => ({
      id: row.id,
      courseId: row.courseId,
      courseTitle: row.courseTitle || `Curso #${row.courseId}`,
      courseSlug: row.courseSlug,
      courseThumbnailUrl: row.courseThumbnailUrl,
      status: row.status,
      progressPercentage: Math.max(0, Math.min(100, Number(row.progressPercentage) || 0)),
      enrolledAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      lastAccessedAt: row.lastAccessedAt?.toISOString() ?? null,
    }))
    return { ...user, enrollments: list, coursesCount: list.length }
  }

  // ------------------------------------------------------------------ escrita

  /**
   * Cria a conta já com e-mail confirmado (o admin responde por ela) + perfil + um papel.
   * A senha é guardada com argon2, igual à de quem se cadastra pelo site.
   */
  async create(
    actor: SessionUser,
    input: CreateUserInput,
    context: AuditContext,
  ): Promise<{ userId: string }> {
    const passwordHash = await hashPassword(input.password)

    try {
      const userId = await this.db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, input.email))
        if (existing) throw new ConflictException('Já existe um usuário com este e-mail')

        const [created] = await tx
          .insert(users)
          .values({ email: input.email, passwordHash, emailVerifiedAt: new Date() })
          .returning({ id: users.id })

        await tx.insert(profiles).values({
          id: created.id,
          fullName: input.name,
          cpf: input.cpf ?? null,
          phone: input.phone ?? null,
          birthDate: input.birthDate ?? null,
          commissionRate: input.role === 'producer' ? DEFAULT_PLATFORM_COMMISSION_RATE : null,
        })
        await tx
          .insert(userRoles)
          .values({ userId: created.id, role: input.role, grantedBy: actor.id })

        await this.audit.log(
          {
            userId: actor.id,
            action: 'create',
            resourceType: 'user',
            resourceId: created.id,
            changes: { role: input.role, email: input.email },
            ...context,
          },
          tx,
        )
        return created.id
      })
      return { userId }
    } catch (error) {
      if (isUniqueViolation(error)) {
        if (uniqueConstraint(error) === 'profiles_cpf_key') {
          throw new ConflictException('CPF já cadastrado para outro usuário')
        }
        throw new ConflictException('Já existe um usuário com este e-mail ou CPF')
      }
      throw error
    }
  }

  /**
   * Edita dados, papel e status. Regras:
   * - `role` só mexe nos papéis quando é DIFERENTE do papel principal que a tela mostrava: salvar
   *   só o nome de quem tem dois papéis não revoga o outro. Trocar o papel concede o novo e
   *   revoga os demais (`is_active`/`revoked_at`/`revoked_by`), nunca apaga o histórico;
   * - status "suspenso" (ou banido/bloqueio financeiro) suspende a conta e derruba as sessões;
   * - ninguém tira o próprio acesso de admin e o último admin ativo nunca sai do ar.
   */
  async update(
    actor: SessionUser,
    id: string,
    input: UpdateUserInput,
    context: AuditContext,
  ): Promise<void> {
    const suspendTarget = SUSPENDED_LIKE.includes(input.status)

    try {
      await this.db.transaction(async (tx) => {
        await this.lockAdminGuard(tx)

        const current = await this.loadForUpdate(tx, id)
        const wasAdmin = current.activeRoles.includes('admin')
        const wasActive = current.accountStatus === 'active'
        const willBeActive = !suspendTarget
        // Reativar quem foi desativado (sem nenhum papel ativo) exige conceder o papel escolhido.
        const switchRole =
          input.role !== current.displayedRole || (willBeActive && current.activeRoles.length === 0)
        const willBeAdmin = switchRole ? input.role === 'admin' : wasAdmin

        if (id === actor.id && (suspendTarget || (wasAdmin && !willBeAdmin))) {
          throw new BadRequestException(
            'Você não pode suspender a própria conta nem remover o próprio acesso de administrador.',
          )
        }
        const removesAdmin = wasAdmin && wasActive && (!willBeAdmin || !willBeActive)
        if (removesAdmin) await this.assertAnotherAdminRemains(tx, id)

        const now = new Date()

        await tx
          .update(profiles)
          .set({
            fullName: input.name,
            cpf: input.cpf ?? null,
            phone: input.phone ?? null,
            birthDate: input.birthDate ?? null,
            isActive: willBeActive,
            commissionRate:
              input.role === 'producer'
                ? normalizeCommissionRate(input.platformCommissionRate)
                : null,
          })
          .where(eq(profiles.id, id))

        await tx
          .update(users)
          .set({ status: willBeActive ? 'active' : 'suspended' })
          .where(eq(users.id, id))

        if (switchRole) await this.switchRole(tx, actor.id, id, input.role, now)
        // Suspensão derruba o que já estava aberto (a sessão só vale com a conta ativa).
        if (!willBeActive && wasActive) await this.sessions.revokeAllUserSessions(tx, id)

        await this.audit.log(
          {
            userId: actor.id,
            action:
              !willBeActive && wasActive
                ? 'deactivate'
                : willBeActive && !wasActive
                  ? 'activate'
                  : 'update',
            resourceType: 'user',
            resourceId: id,
            changes: {
              ...(switchRole ? { role: { from: current.displayedRole, to: input.role } } : {}),
              ...(wasActive !== willBeActive
                ? {
                    status: {
                      from: current.accountStatus,
                      to: willBeActive ? 'active' : 'suspended',
                    },
                  }
                : {}),
              fields: ['name', 'phone', 'cpf', 'birthDate'],
            },
            ...context,
          },
          tx,
        )
      })
    } catch (error) {
      if (isUniqueViolation(error) && uniqueConstraint(error) === 'profiles_cpf_key') {
        throw new ConflictException('CPF já cadastrado para outro usuário')
      }
      throw error
    }
  }

  /**
   * "Excluir" do admin = desativar: a conta é suspensa, os papéis são
   * revogados e as sessões caem. Nada é apagado: matrículas, pedidos, tickets e financeiro ficam
   * íntegros (não há dependência a quebrar).
   */
  async deactivate(actor: SessionUser, id: string, context: AuditContext): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.lockAdminGuard(tx)
      const current = await this.loadForUpdate(tx, id)

      if (id === actor.id) {
        throw new BadRequestException('Você não pode desativar a própria conta.')
      }
      if (current.activeRoles.includes('admin') && current.accountStatus === 'active') {
        await this.assertAnotherAdminRemains(tx, id)
      }

      const now = new Date()
      await tx.update(profiles).set({ isActive: false }).where(eq(profiles.id, id))
      await tx.update(users).set({ status: 'suspended' }).where(eq(users.id, id))
      await tx
        .update(userRoles)
        .set({ isActive: false, revokedAt: now, revokedBy: actor.id, updatedAt: now })
        .where(and(eq(userRoles.userId, id), eq(userRoles.isActive, true)))
      await this.sessions.revokeAllUserSessions(tx, id)

      await this.audit.log(
        {
          userId: actor.id,
          action: 'delete',
          resourceType: 'user',
          resourceId: id,
          changes: { revokedRoles: current.activeRoles },
          metadata: { soft: true },
          ...context,
        },
        tx,
      )
    })
  }

  // ------------------------------------------------------------------ apoio

  /** Serializa operações que podem remover admins (duas ao mesmo tempo não zeram o grupo). */
  private async lockAdminGuard(tx: DbExecutor) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${ADMIN_GUARD_LOCK}))`)
  }

  private async assertAnotherAdminRemains(tx: DbExecutor, excludingUserId: string) {
    const [row] = await tx
      .select({ total: count() })
      .from(userRoles)
      .innerJoin(users, eq(users.id, userRoles.userId))
      .where(
        and(
          eq(userRoles.role, 'admin'),
          eq(userRoles.isActive, true),
          sql`${userRoles.revokedAt} is null`,
          eq(users.status, 'active'),
          ne(userRoles.userId, excludingUserId),
        ),
      )
    if (!row || row.total === 0) {
      throw new ConflictException('Não é possível remover o último administrador da plataforma.')
    }
  }

  private async loadForUpdate(tx: DbExecutor, id: string) {
    const [account] = await tx
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, id))
      .for('update')
    if (!account) throw new NotFoundException('Usuário não encontrado')

    const roles = await tx
      .select({
        role: userRoles.role,
        isActive: userRoles.isActive,
        createdAt: userRoles.createdAt,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, id))
      .orderBy(desc(userRoles.createdAt), desc(userRoles.id))
    const active = roles.filter((row) => row.isActive)
    return {
      accountStatus: account.status,
      activeRoles: active.map((row) => row.role),
      // O papel que a lista mostra: o ativo mais recente (ou o último que teve, ou aluno).
      displayedRole: (active[0] ?? roles[0])?.role ?? 'student',
    }
  }

  /** Concede `role` (reativando se já existiu) e revoga todos os outros papéis ativos. */
  private async switchRole(tx: DbExecutor, actorId: string, userId: string, role: Role, now: Date) {
    await tx
      .update(userRoles)
      .set({ isActive: false, revokedAt: now, revokedBy: actorId, updatedAt: now })
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.isActive, true), ne(userRoles.role, role)),
      )
    await tx
      .insert(userRoles)
      .values({ userId, role, grantedBy: actorId })
      .onConflictDoUpdate({
        target: [userRoles.userId, userRoles.role],
        set: {
          isActive: true,
          revokedAt: null,
          revokedBy: null,
          grantedAt: now,
          grantedBy: actorId,
          updatedAt: now,
        },
      })
  }

  /** Perfil + conta + papéis numa visão só, com `role` e `status` calculados. */
  private userView() {
    const activeRole = this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(and(eq(userRoles.userId, profiles.id), eq(userRoles.isActive, true)))
      .orderBy(desc(userRoles.createdAt), desc(userRoles.id))
      .limit(1)
      .as('active_role')
    const latestRole = this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, profiles.id))
      .orderBy(desc(userRoles.createdAt), desc(userRoles.id))
      .limit(1)
      .as('latest_role')

    const role = sql<Role>`coalesce(${activeRole.role}, ${latestRole.role}, 'student')`
    const status = sql<'active' | 'pending_kyc' | 'suspended'>`case
      when ${users.status} = 'suspended' or ${profiles.isActive} is false or ${activeRole.role} is null then 'suspended'
      when ${users.emailVerifiedAt} is null then 'pending_kyc'
      else 'active' end`
    const activeRoles = sql<Role[]>`coalesce((
      select array_agg(ur.role::text order by ur.created_at, ur.id)
      from ${userRoles} ur where ur.user_id = ${profiles.id} and ur.is_active = true
    ), '{}')`

    const from = () =>
      this.db
        .select({
          id: profiles.id,
          name: profiles.fullName,
          email: users.email,
          role,
          roles: activeRoles,
          status,
          avatarUrl: profiles.avatarUrl,
          createdAt: profiles.createdAt,
          lastLoginAt: users.lastLoginAt,
          emailVerifiedAt: users.emailVerifiedAt,
          phone: profiles.phone,
          cpf: profiles.cpf,
          birthDate: profiles.birthDate,
          bio: profiles.bio,
          commissionRate: profiles.commissionRate,
          address: profiles.address,
        })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.id))
        .leftJoinLateral(activeRole, sql`true`)
        .leftJoinLateral(latestRole, sql`true`)

    return {
      role,
      status,
      select: from,
      count: () =>
        this.db
          .select({ total: count() })
          .from(profiles)
          .innerJoin(users, eq(users.id, profiles.id))
          .leftJoinLateral(activeRole, sql`true`)
          .leftJoinLateral(latestRole, sql`true`),
    }
  }
}

type ViewRow = {
  id: string
  name: string
  email: string
  role: Role
  roles: Role[]
  status: 'active' | 'pending_kyc' | 'suspended'
  avatarUrl: string | null
  createdAt: Date
  lastLoginAt: Date | null
  emailVerifiedAt: Date | null
  phone: string | null
  cpf: string | null
  birthDate: string | null
  bio: string | null
  commissionRate: number | null
  address: unknown
}

function toListItem(row: ViewRow): AdminUserListItem {
  return {
    id: row.id,
    name: row.name || row.email.split('@')[0] || 'Usuário',
    email: row.email,
    role: row.role,
    roles: row.roles,
    status: row.status,
    ...(row.avatarUrl ? { avatar: row.avatarUrl } : {}),
    joinedAt: row.createdAt.toISOString(),
    ...(row.lastLoginAt ? { lastLogin: row.lastLoginAt.toISOString() } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.cpf ? { cpf: row.cpf } : {}),
    ...(row.birthDate ? { birthDate: row.birthDate } : {}),
    ...(row.bio ? { bio: row.bio } : {}),
    ...(row.role === 'producer'
      ? { platformCommissionRate: normalizeCommissionRate(row.commissionRate) }
      : {}),
    ...(parseAddress(row.address) ? { address: parseAddress(row.address) } : {}),
    kycVerified: row.emailVerifiedAt !== null,
    twoFactorEnabled: false,
  }
}
