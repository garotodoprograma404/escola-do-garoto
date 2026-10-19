import {
  BadRequestException,
  Inject,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, isNotNull, ne } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  courses,
  enrollments,
  lessonNotes,
  profiles,
  passwordResetTokens,
  sessions,
  users,
} from '../../database/schema/index.js'
import { hashPassword, verifyPassword } from '../auth/crypto/password-hasher.js'
import { UsersService } from '../users/users.service.js'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPreferencesSchema,
  type ChangePasswordInput,
  type NotificationPreferencesInput,
  type UpdateAvatarInput,
  type UpdateProfileInput,
} from './student.schemas.js'

export type ActivityLogItem = {
  id: string
  type: 'enrollment' | 'completion' | 'certificate' | 'note' | 'review'
  description: string
  metadata: Record<string, unknown>
  created_at: Date
}

/** O avatar só pode ser um arquivo enviado pela PRÓPRIA pessoa pela API de arquivos. */
function avatarUrlPattern(userId: string): RegExp {
  return new RegExp(`^/api/files/public/public/avatars/${userId}/[A-Za-z0-9_.-]+$`)
}

/**
 * Perfil do aluno. Sempre o do usuário da sessão (nada de id vindo do cliente) e só os campos
 * que a tela edita: devolver o perfil inteiro (`select *`) ou aceitar QUALQUER coluna no update
 * exporia ou alteraria dados indevidos.
 */
/** Erros de "senha atual" tolerados por conta numa janela (além do limite por IP da rota). */
const PASSWORD_MAX_FAILURES = 5
const PASSWORD_FAILURE_WINDOW_MS = 15 * 60 * 1000

@Injectable()
export class StudentProfileService {
  /** Falhas por usuário (em memória do processo): segura quem troca de IP com um cookie roubado. */
  private readonly passwordFailures = new Map<string, number[]>()

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

  async getProfile(userId: string) {
    const [row] = await this.db
      .select({
        id: profiles.id,
        email: users.email,
        full_name: profiles.fullName,
        avatar_url: profiles.avatarUrl,
        bio: profiles.bio,
        phone: profiles.phone,
        created_at: profiles.createdAt,
        updated_at: profiles.updatedAt,
      })
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.id))
      .where(eq(profiles.id, userId))
    if (!row) throw new NotFoundException('Perfil não encontrado')
    return row
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const updated = await this.db
      .update(profiles)
      .set({ fullName: input.full_name, bio: input.bio, phone: input.phone, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
      .returning({ id: profiles.id })
    if (updated.length === 0) throw new NotFoundException('Perfil não encontrado')
    return this.getProfile(userId)
  }

  async updateAvatar(userId: string, input: UpdateAvatarInput) {
    if (!avatarUrlPattern(userId).test(input.avatar_url)) {
      throw new BadRequestException('Imagem de avatar inválida: envie o arquivo pelo seu perfil')
    }
    await this.db
      .update(profiles)
      .set({ avatarUrl: input.avatar_url, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
    return { avatar_url: input.avatar_url }
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferencesInput> {
    const [row] = await this.db
      .select({ preferences: profiles.notificationPreferences })
      .from(profiles)
      .where(eq(profiles.id, userId))
    const stored = notificationPreferencesSchema.partial().safeParse(row?.preferences ?? {})
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(stored.success ? stored.data : {}),
    } as NotificationPreferencesInput
  }

  async updateNotificationPreferences(userId: string, input: NotificationPreferencesInput) {
    await this.db
      .update(profiles)
      .set({ notificationPreferences: input, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
    return input
  }

  /** Últimas atividades: matrículas, cursos concluídos e notas (as 20 mais recentes). */
  async getActivity(userId: string): Promise<ActivityLogItem[]> {
    const [enrolled, completed, notes] = await Promise.all([
      this.db
        .select({ id: enrollments.id, at: enrollments.createdAt, title: courses.title })
        .from(enrollments)
        .innerJoin(courses, eq(courses.id, enrollments.courseId))
        .where(eq(enrollments.studentId, userId))
        .orderBy(desc(enrollments.createdAt))
        .limit(10),
      this.db
        .select({ id: enrollments.id, at: enrollments.completedAt, title: courses.title })
        .from(enrollments)
        .innerJoin(courses, eq(courses.id, enrollments.courseId))
        .where(and(eq(enrollments.studentId, userId), isNotNull(enrollments.completedAt)))
        .orderBy(desc(enrollments.completedAt))
        .limit(10),
      this.db
        .select({ id: lessonNotes.id, at: lessonNotes.createdAt, title: courses.title })
        .from(lessonNotes)
        .innerJoin(courses, eq(courses.id, lessonNotes.courseId))
        .where(eq(lessonNotes.userId, userId))
        .orderBy(desc(lessonNotes.createdAt))
        .limit(10),
    ])

    const items: ActivityLogItem[] = [
      ...enrolled.map((row) => ({
        id: `enrollment-${row.id}`,
        type: 'enrollment' as const,
        description: `Matriculou-se em ${row.title || 'curso'}`,
        metadata: { enrollment_id: row.id },
        created_at: row.at,
      })),
      ...completed.map((row) => ({
        id: `completion-${row.id}`,
        type: 'completion' as const,
        description: `Concluiu ${row.title || 'curso'}`,
        metadata: { enrollment_id: row.id },
        created_at: row.at!,
      })),
      ...notes.map((row) => ({
        id: row.id,
        type: 'note' as const,
        description: `Criou uma nota em ${row.title || 'curso'}`,
        metadata: { note_id: row.id },
        created_at: row.at,
      })),
    ]
    return items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, 20)
  }

  /**
   * Troca de senha: confere a senha atual, grava o novo hash e derruba as OUTRAS sessões (quem
   * roubou o cookie perde o acesso); a sessão de quem trocou continua aberta.
   */
  async changePassword(userId: string, currentSessionId: string, input: ChangePasswordInput) {
    const recent = (this.passwordFailures.get(userId) ?? []).filter(
      (at) => Date.now() - at < PASSWORD_FAILURE_WINDOW_MS,
    )
    if (recent.length >= PASSWORD_MAX_FAILURES) {
      throw new HttpException(
        'Muitas tentativas com a senha atual. Tente de novo em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    const [account] = await this.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
    // Sempre roda o hash (mesmo sem conta) para o tempo de resposta não revelar nada.
    const matches = await verifyPassword(
      input.currentPassword,
      account?.passwordHash ?? (await getDummyHash()),
    )
    if (!account || !matches) {
      this.passwordFailures.set(userId, [...recent, Date.now()])
      throw new BadRequestException('Senha atual incorreta')
    }
    this.passwordFailures.delete(userId)

    const passwordHash = await hashPassword(input.newPassword)
    await this.db.transaction(async (tx) => {
      await this.users.updatePasswordHash(tx, userId, passwordHash)
      await tx
        .delete(sessions)
        .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)))
      // Link de redefinição que tenha vazado antes da troca deixa de valer.
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId))
    })
  }
}

let dummyHash: Promise<string> | undefined
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('senha-descartavel-para-igualar-o-tempo')
  return dummyHash
}
