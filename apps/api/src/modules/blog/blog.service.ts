import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, count, desc, eq, gt, isNotNull, lte, ne, or, sql, type SQL } from 'drizzle-orm'
import { sanitizeRichHtml } from '../../common/html/sanitize-rich-html.js'
import { throttleKey } from '../auth/throttling.js'
import { isUniqueViolation } from '../../common/pipes/id-param.pipe.js'
import { likeContains } from '../../common/search/like-contains.js'
import { DB, type Database } from '../../database/database.module.js'
import { blogPosts, postLikes, postViews, profiles } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import type { AdminListPostsQuery, BlogPostBody, PublicListPostsQuery } from './blog.schemas.js'

type RequestInfo = { ipAddress?: string | null; userAgent?: string | null }

/** Tempo de leitura em minutos: palavras / 200, arredondado para cima. */
function calculateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.ceil(words / 200)
}

/** Navegadores automáticos que não contam como leitor. */
const BOT_PATTERN = /bot|crawler|spider|scraper|curl|wget|python-requests|java|go-http-client/i
/** Mesmo IP lendo o mesmo post de novo dentro desta janela não soma visualização. */
const VIEW_DEDUPE_HOURS = 24

/** Colunas de um post sem o corpo (listas). Formato snake_case que o front já consumia. */
const listColumns = {
  id: blogPosts.id,
  title: blogPosts.title,
  slug: blogPosts.slug,
  excerpt: blogPosts.excerpt,
  featured_image_url: blogPosts.featuredImageUrl,
  category: blogPosts.category,
  tags: blogPosts.tags,
  status: blogPosts.status,
  is_featured: blogPosts.isFeatured,
  published_at: blogPosts.publishedAt,
  seo_title: blogPosts.seoTitle,
  seo_description: blogPosts.seoDescription,
  seo_keywords: blogPosts.seoKeywords,
  total_views: blogPosts.totalViews,
  total_likes: blogPosts.totalLikes,
  total_comments: blogPosts.totalComments,
  reading_time_minutes: blogPosts.readingTimeMinutes,
  created_at: blogPosts.createdAt,
  updated_at: blogPosts.updatedAt,
  author_name: profiles.fullName,
  author_avatar_url: profiles.avatarUrl,
}

const adminListColumns = { ...listColumns, author_id: blogPosts.authorId }
const fullColumns = { ...adminListColumns, content: blogPosts.content }

type ListRow = {
  author_name: string | null
  author_avatar_url: string | null
  [key: string]: unknown
}

/** Troca `author_name/avatar` por `author: { full_name, avatar_url }` (formato público). */
function withAuthor<T extends ListRow>(row: T) {
  const { author_name, author_avatar_url, ...rest } = row
  return {
    ...rest,
    author: author_name === null ? null : { full_name: author_name, avatar_url: author_avatar_url },
  }
}

@Injectable()
export class BlogService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ============================================================================================
  // Leitura pública (só post publicado e com data de publicação já passada)
  // ============================================================================================

  private visibleNow(): SQL {
    return and(
      eq(blogPosts.status, 'published'),
      isNotNull(blogPosts.publishedAt),
      lte(blogPosts.publishedAt, new Date()),
    )!
  }

  async listPublic(query: PublicListPostsQuery) {
    const conditions: SQL[] = [this.visibleNow()]
    if (query.category) conditions.push(eq(blogPosts.category, query.category))
    const term = query.search?.trim()
    if (term) {
      conditions.push(
        // Só título e resumo: buscar no corpo (até 500 KB de HTML por post) custa proporcional
        // à tabela inteira e é aberto ao público.
        or(likeContains(blogPosts.title, term), likeContains(blogPosts.excerpt, term))!,
      )
    }
    const where = and(...conditions)

    const [rows, [totalRow], categoryRows] = await Promise.all([
      this.db
        .select({ ...listColumns })
        .from(blogPosts)
        .leftJoin(profiles, eq(profiles.id, blogPosts.authorId))
        .where(where)
        .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ total: count() }).from(blogPosts).where(where),
      this.db
        .selectDistinct({ category: blogPosts.category })
        .from(blogPosts)
        .where(and(this.visibleNow(), isNotNull(blogPosts.category)))
        .orderBy(asc(blogPosts.category)),
    ])

    const total = totalRow?.total ?? 0
    return {
      posts: rows.map(withAuthor),
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
      categories: categoryRows.map((row) => row.category as string),
    }
  }

  async getPublicBySlug(slug: string) {
    const [row] = await this.db
      .select({ ...listColumns, content: blogPosts.content })
      .from(blogPosts)
      .leftJoin(profiles, eq(profiles.id, blogPosts.authorId))
      .where(and(eq(blogPosts.slug, slug), this.visibleNow()))
    if (!row) throw new NotFoundException('Post não encontrado')
    // Defesa dupla: mesmo que haja HTML sujo no banco, ele sai sanitizado.
    return withAuthor({ ...row, content: sanitizeRichHtml(row.content) })
  }

  async listFeatured(limit: number) {
    const rows = await this.db
      .select({ ...listColumns })
      .from(blogPosts)
      .leftJoin(profiles, eq(profiles.id, blogPosts.authorId))
      .where(and(this.visibleNow(), eq(blogPosts.isFeatured, true)))
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
      .limit(limit)
    return rows.map(withAuthor)
  }

  /** Posts da mesma categoria do post `id` (ou os mais novos, se ele não tem categoria). */
  async listRelated(id: number, limit: number) {
    const [post] = await this.db
      .select({ category: blogPosts.category })
      .from(blogPosts)
      .where(and(eq(blogPosts.id, id), this.visibleNow()))
    if (!post) return []

    const conditions: SQL[] = [this.visibleNow(), ne(blogPosts.id, id)]
    if (post.category) conditions.push(eq(blogPosts.category, post.category))
    const rows = await this.db
      .select({ ...listColumns })
      .from(blogPosts)
      .leftJoin(profiles, eq(profiles.id, blogPosts.authorId))
      .where(and(...conditions))
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
      .limit(limit)
    return rows.map(withAuthor)
  }

  // ============================================================================================
  // Visualizações e curtidas
  // ============================================================================================

  /**
   * Conta uma visualização. Não infla: ignora robôs, conta uma por sessão (restrição única do
   * banco) E uma por IP a cada 24 h, então trocar de `sessionId` a cada chamada não adianta.
   * A contagem em `total_views` é mantida pelo trigger do banco.
   */
  async trackView(
    postId: number,
    input: { sessionId: string; userId: string | null; ip: string | null; userAgent: string },
  ): Promise<{ counted: boolean; reason?: 'bot' | 'already_viewed' }> {
    if (!input.userAgent || BOT_PATTERN.test(input.userAgent)) {
      return { counted: false, reason: 'bot' }
    }

    const [post] = await this.db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(and(eq(blogPosts.id, postId), this.visibleNow()))
    if (!post) throw new NotFoundException('Post não encontrado')

    // Tudo dentro de uma transação com lock por (post, rede do IP): requisições simultâneas do
    // mesmo leitor não passam juntas pela checagem. IPv6 é agrupado por /64 (como no limite de
    // tentativas), senão quem troca de endereço dentro da própria rede somaria uma visita por chamada.
    const network = input.ip ? throttleKey(input.ip) : null
    return this.db.transaction(async (tx) => {
      if (network) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`${postId}|${network}`}, 0))`,
        )
        const since = new Date(Date.now() - VIEW_DEDUPE_HOURS * 60 * 60 * 1000)
        const [recent] = await tx
          .select({ id: postViews.id })
          .from(postViews)
          .where(
            and(
              eq(postViews.postId, postId),
              sql`${postViews.ipAddress} <<= ${network}::inet`,
              gt(postViews.viewedAt, since),
            ),
          )
          .limit(1)
        if (recent) return { counted: false, reason: 'already_viewed' as const }
      }

      const inserted = await tx
        .insert(postViews)
        .values({
          postId,
          userId: input.userId,
          sessionId: input.sessionId,
          ipAddress: input.ip,
          userAgent: input.userAgent.slice(0, 300),
        })
        .onConflictDoNothing({ target: [postViews.postId, postViews.sessionId] })
        .returning({ id: postViews.id })

      return inserted.length > 0
        ? { counted: true }
        : { counted: false, reason: 'already_viewed' as const }
    })
  }

  async isLikedBy(postId: number, userId: string): Promise<{ isLiked: boolean }> {
    const [like] = await this.db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    return { isLiked: Boolean(like) }
  }

  /** Curte/descurte (o trigger do banco ajusta `total_likes`). Sempre do usuário da sessão. */
  async toggleLike(postId: number, userId: string) {
    return this.db.transaction(async (tx) => {
      const [post] = await tx
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.id, postId), this.visibleNow()))
      if (!post) throw new NotFoundException('Post não encontrado')

      const inserted = await tx
        .insert(postLikes)
        .values({ postId, userId })
        .onConflictDoNothing({ target: [postLikes.postId, postLikes.userId] })
        .returning({ id: postLikes.id })

      let action: 'liked' | 'unliked' = 'liked'
      if (inserted.length === 0) {
        await tx
          .delete(postLikes)
          .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        action = 'unliked'
      }

      const [counter] = await tx
        .select({ total_likes: blogPosts.totalLikes })
        .from(blogPosts)
        .where(eq(blogPosts.id, postId))
      return { action, total_likes: counter?.total_likes ?? 0 }
    })
  }

  // ============================================================================================
  // Admin
  // ============================================================================================

  async adminList(query: AdminListPostsQuery) {
    const conditions: SQL[] = []
    if (query.status) conditions.push(eq(blogPosts.status, query.status))
    if (query.category) conditions.push(eq(blogPosts.category, query.category))
    if (query.authorId) conditions.push(eq(blogPosts.authorId, query.authorId))
    if (query.featured) conditions.push(eq(blogPosts.isFeatured, true))
    const term = query.search?.trim()
    if (term) {
      conditions.push(
        or(likeContains(blogPosts.title, term), likeContains(blogPosts.excerpt, term))!,
      )
    }
    const where = and(...conditions)

    const [rows, [totalRow]] = await Promise.all([
      this.db
        .select(adminListColumns)
        .from(blogPosts)
        .leftJoin(profiles, eq(profiles.id, blogPosts.authorId))
        .where(where)
        .orderBy(desc(blogPosts.createdAt), desc(blogPosts.id))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      this.db.select({ total: count() }).from(blogPosts).where(where),
    ])
    return { posts: rows, total: totalRow?.total ?? 0 }
  }

  /** Post completo (qualquer status) para editar ou pré-visualizar. */
  async adminGet(by: { id: number } | { slug: string }) {
    const [row] = await this.db
      .select(fullColumns)
      .from(blogPosts)
      .leftJoin(profiles, eq(profiles.id, blogPosts.authorId))
      .where('id' in by ? eq(blogPosts.id, by.id) : eq(blogPosts.slug, by.slug))
    if (!row) throw new NotFoundException('Post não encontrado')
    // O conteúdo chega limpo ao editor e à pré-visualização mesmo que haja HTML sujo no banco.
    return { ...row, content: sanitizeRichHtml(row.content) }
  }

  async adminStats() {
    const [row] = await this.db
      .select({
        total_posts: count(),
        published_posts: sql<number>`count(*) filter (where ${blogPosts.status} = 'published')::int`,
        draft_posts: sql<number>`count(*) filter (where ${blogPosts.status} = 'draft')::int`,
        total_views: sql<number>`coalesce(sum(${blogPosts.totalViews}), 0)::int`,
        total_likes: sql<number>`coalesce(sum(${blogPosts.totalLikes}), 0)::int`,
      })
      .from(blogPosts)
    return row!
  }

  adminCategories() {
    return this.db
      .select({ name: blogPosts.category, posts_count: count() })
      .from(blogPosts)
      .where(isNotNull(blogPosts.category))
      .groupBy(blogPosts.category)
      .orderBy(asc(blogPosts.category))
  }

  async create(body: BlogPostBody, authorId: string, request: RequestInfo) {
    const content = sanitizeRichHtml(body.content)
    try {
      const created = await this.db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: blogPosts.id })
          .from(blogPosts)
          .where(eq(blogPosts.slug, body.slug))
        if (existing) throw this.slugTaken()

        const [row] = await tx
          .insert(blogPosts)
          .values({ ...this.toColumns(body, content), authorId, status: 'draft' })
          .returning({ id: blogPosts.id })
        await this.audit.log(
          {
            userId: authorId,
            action: 'create',
            resourceType: 'blog_post',
            resourceId: row!.id,
            changes: { title: body.title, slug: body.slug },
            ...request,
          },
          tx,
        )
        return row!
      })
      return this.adminGet({ id: created.id })
    } catch (error) {
      if (isUniqueViolation(error)) throw this.slugTaken()
      throw error
    }
  }

  async update(id: number, body: BlogPostBody, adminId: string, request: RequestInfo) {
    const content = sanitizeRichHtml(body.content)
    try {
      await this.db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: blogPosts.id, slug: blogPosts.slug })
          .from(blogPosts)
          .where(eq(blogPosts.id, id))
          .for('update')
        if (!existing) throw new NotFoundException('Post não encontrado')

        if (body.slug !== existing.slug) {
          const [taken] = await tx
            .select({ id: blogPosts.id })
            .from(blogPosts)
            .where(and(eq(blogPosts.slug, body.slug), ne(blogPosts.id, id)))
          if (taken) throw this.slugTaken()
        }

        await tx
          .update(blogPosts)
          .set({ ...this.toColumns(body, content), updatedAt: new Date() })
          .where(eq(blogPosts.id, id))
        await this.audit.log(
          {
            userId: adminId,
            action: 'update',
            resourceType: 'blog_post',
            resourceId: id,
            changes: { title: body.title, slug: body.slug },
            ...request,
          },
          tx,
        )
      })
      return this.adminGet({ id })
    } catch (error) {
      if (isUniqueViolation(error)) throw this.slugTaken()
      throw error
    }
  }

  async remove(id: number, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(blogPosts)
        .where(eq(blogPosts.id, id))
        .returning({ id: blogPosts.id, title: blogPosts.title })
      if (!deleted) throw new NotFoundException('Post não encontrado')
      await this.audit.log(
        {
          userId: adminId,
          action: 'delete',
          resourceType: 'blog_post',
          resourceId: id,
          changes: { title: deleted.title },
          ...request,
        },
        tx,
      )
      return { success: true }
    })
  }

  /** Publica (data de publicação = agora). Já publicado: não mexe (mantém a data original). */
  publish(id: number, adminId: string, request: RequestInfo) {
    return this.changeStatus(id, 'published', adminId, request)
  }

  /** Volta para rascunho e limpa a data de publicação. */
  unpublish(id: number, adminId: string, request: RequestInfo) {
    return this.changeStatus(id, 'draft', adminId, request)
  }

  archive(id: number, adminId: string, request: RequestInfo) {
    return this.changeStatus(id, 'archived', adminId, request)
  }

  // --------------------------------------------------------------------------------------------

  private async changeStatus(
    id: number,
    status: 'draft' | 'published' | 'archived',
    adminId: string,
    request: RequestInfo,
  ) {
    return this.db.transaction(async (tx) => {
      const [post] = await tx
        .select({ status: blogPosts.status })
        .from(blogPosts)
        .where(eq(blogPosts.id, id))
        .for('update')
      if (!post) throw new NotFoundException('Post não encontrado')
      if (post.status === status && status !== 'draft') return { success: true }

      const now = new Date()
      await tx
        .update(blogPosts)
        .set({
          status,
          updatedAt: now,
          ...(status === 'published' ? { publishedAt: now } : {}),
          ...(status === 'draft' ? { publishedAt: null } : {}),
        })
        .where(eq(blogPosts.id, id))
      await this.audit.log(
        {
          userId: adminId,
          action: status === 'published' ? 'activate' : 'update',
          resourceType: 'blog_post',
          resourceId: id,
          changes: { status },
          ...request,
        },
        tx,
      )
      return { success: true }
    })
  }

  private toColumns(body: BlogPostBody, sanitizedContent: string) {
    return {
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt,
      content: sanitizedContent,
      category: body.category,
      tags: body.tags.length > 0 ? body.tags : null,
      featuredImageUrl: body.featuredImageUrl,
      isFeatured: body.isFeatured,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
      seoKeywords: body.seoKeywords.length > 0 ? body.seoKeywords : null,
      readingTimeMinutes: calculateReadingTime(sanitizedContent),
    }
  }

  private slugTaken() {
    return new ConflictException('Já existe um post com este slug')
  }
}
