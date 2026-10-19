import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, ne } from 'drizzle-orm'
import { ENV } from '../../../config/config.module.js'
import type { Env } from '../../../config/env.js'
import { DB, type Database } from '../../../database/database.module.js'
import { passwordResetTokens, profiles, sessions, users } from '../../../database/schema/index.js'
import { hashPassword, verifyPassword } from '../../auth/crypto/password-hasher.js'
import type {
  ChangePasswordInput,
  UpdateAvatarInput,
  UpdateProfileInput,
} from './profile.schemas.js'
import { buildDefaultSlug, slugify } from './slug.js'

type SocialLinks = {
  website?: string
  instagram?: string
  youtube?: string
  linkedin?: string
  facebook?: string
}

export type ProducerProfile = {
  id: string
  full_name: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  slug: string | null
  expertise_areas: string[] | null
  social_links: SocialLinks | null
  cover_url: string | null
  public_profile_enabled: boolean
  created_at: Date
  updated_at: Date
}

const SOCIAL_KEYS = ['website', 'instagram', 'youtube', 'linkedin', 'facebook'] as const

function parseSocialLinks(value: unknown): SocialLinks | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const links: SocialLinks = {}
  for (const key of SOCIAL_KEYS) {
    const raw = record[key]
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (trimmed.length > 0) links[key] = trimmed
  }
  return Object.keys(links).length > 0 ? links : null
}

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseExpertiseAreas(value: string | undefined): string[] | null {
  const text = optionalText(value)
  if (!text) return null
  const areas = [
    ...new Set(
      text
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
  return areas.length > 0 ? areas.slice(0, 20) : null
}

/** O Drizzle embrulha o erro do driver (`cause`); o código SQLSTATE fica em um dos dois. */
function isUniqueViolation(error: unknown): boolean {
  const code = error as { code?: string; cause?: { code?: string } } | null
  return code?.code === '23505' || code?.cause?.code === '23505'
}

@Injectable()
export class ProfileService {
  private readonly webOrigin: string

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) env: Env,
  ) {
    this.webOrigin = new URL(env.WEB_ORIGIN).origin
  }

  async getProfile(userId: string): Promise<ProducerProfile> {
    const [row] = await this.db
      .select({
        id: profiles.id,
        full_name: profiles.fullName,
        display_name: profiles.displayName,
        avatar_url: profiles.avatarUrl,
        bio: profiles.bio,
        slug: profiles.slug,
        expertise_areas: profiles.expertiseAreas,
        social_links: profiles.socialLinks,
        cover_url: profiles.coverUrl,
        public_profile_enabled: profiles.publicProfileEnabled,
        created_at: profiles.createdAt,
        updated_at: profiles.updatedAt,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
    if (!row) throw new NotFoundException('Perfil não encontrado')
    return { ...row, social_links: parseSocialLinks(row.social_links) }
  }

  /** Atualiza SÓ o perfil de quem está logado (o id vem da sessão). */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const displayName = optionalText(input.display_name)
    const typedSlug = optionalText(input.slug)
    const requestedSlug = typedSlug ? slugify(typedSlug) : null
    if (typedSlug && !requestedSlug) {
      throw new BadRequestException('Slug inválido. Use apenas letras, números e hífen.')
    }

    // Campo vazio MANTÉM o slug atual: o endereço já divulgado nunca é liberado sem querer
    // (outra pessoa poderia registrá-lo e receber os links antigos).
    let slug = requestedSlug
    if (!slug) {
      const [current] = await this.db
        .select({ slug: profiles.slug })
        .from(profiles)
        .where(eq(profiles.id, userId))
      slug = current?.slug ?? null
    }
    if (input.public_profile_enabled && !slug) {
      slug = buildDefaultSlug(displayName, input.full_name, userId)
    }

    const links = Object.fromEntries(
      (
        [
          ['website', optionalText(input.website_url)],
          ['instagram', optionalText(input.instagram_url)],
          ['youtube', optionalText(input.youtube_url)],
          ['linkedin', optionalText(input.linkedin_url)],
          ['facebook', optionalText(input.facebook_url)],
        ] as const
      ).filter(([, value]) => value !== null),
    )

    try {
      const [updated] = await this.db
        .update(profiles)
        .set({
          fullName: input.full_name,
          displayName,
          bio: optionalText(input.bio),
          slug,
          expertiseAreas: parseExpertiseAreas(input.expertise_areas),
          coverUrl: optionalText(input.cover_url),
          socialLinks: Object.keys(links).length > 0 ? links : null,
          publicProfileEnabled: input.public_profile_enabled,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, userId))
        .returning({ id: profiles.id })
      if (!updated) throw new NotFoundException('Perfil não encontrado')
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Esse slug já está em uso. Escolha outro para seu perfil público.',
        )
      }
      throw error
    }

    return { slug }
  }

  /**
   * Troca o avatar. Aceitar qualquer texto como `avatar_url` (inclusive `javascript:`) seria
   * perigoso, então só vale uma foto que a PRÓPRIA pessoa enviou pelo upload da plataforma.
   */
  async updateAvatar(userId: string, input: UpdateAvatarInput) {
    const path = this.ownAvatarPath(input.avatar_url, userId)
    if (!path) throw new BadRequestException('Avatar inválido. Envie a foto pela plataforma.')

    await this.db
      .update(profiles)
      .set({ avatarUrl: path, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
    return { avatar_url: path }
  }

  /**
   * Troca a senha. Exige a senha atual; as OUTRAS sessões abertas (e links de redefinição ainda
   * válidos) deixam de valer, a atual continua.
   */
  async changePassword(userId: string, sessionId: string, input: ChangePasswordInput) {
    const [credentials] = await this.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
    if (!credentials || !(await verifyPassword(input.currentPassword, credentials.passwordHash))) {
      throw new BadRequestException('Senha atual incorreta')
    }
    if (input.newPassword === input.currentPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual')
    }

    const passwordHash = await hashPassword(input.newPassword)
    await this.db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, userId))
      await tx.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, sessionId)))
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId))
    })
    return { success: true }
  }

  /** Caminho `/api/files/public/public/avatars/<userId>/<arquivo>` ou `null` se não for da pessoa. */
  private ownAvatarPath(raw: string, userId: string): string | null {
    let path = raw
    if (!raw.startsWith('/')) {
      try {
        const url = new URL(raw)
        if (url.origin !== this.webOrigin) return null
        path = url.pathname
      } catch {
        return null
      }
    }
    const prefix = `/api/files/public/public/avatars/${userId}/`
    const file = path.startsWith(prefix) ? path.slice(prefix.length) : null
    return file && /^[A-Za-z0-9._-]+$/.test(file) ? `${prefix}${file}` : null
  }
}
