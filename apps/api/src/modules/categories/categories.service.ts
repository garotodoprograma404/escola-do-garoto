import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, asc, eq, isNull, or, sql, type SQL } from 'drizzle-orm'
import { likeContains } from '../../common/search/like-contains.js'
import { isForeignKeyViolation, isUniqueViolation } from '../../common/pipes/id-param.pipe.js'
import { DB, type Database, type DbExecutor } from '../../database/database.module.js'
import { categories, courses } from '../../database/schema/index.js'
import { AuditService } from '../audit/audit.service.js'
import { validateParent } from './categories.hierarchy.js'
import type { CategoryBody, ListCategoriesQuery } from './categories.schemas.js'

type RequestInfo = { ipAddress?: string | null; userAgent?: string | null }

/** Campos do admin (formato snake_case que o front consome). */
const adminFields = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  description: categories.description,
  icon: categories.icon,
  color: categories.color,
  parent_id: categories.parentId,
  display_order: categories.displayOrder,
  is_active: categories.isActive,
  is_featured: categories.isFeatured,
  cover_image_url: categories.coverImageUrl,
  meta_title: categories.metaTitle,
  meta_description: categories.metaDescription,
  created_at: categories.createdAt,
  updated_at: categories.updatedAt,
  courses_count: sql<number>`(select count(*)::int from courses c where c.category_id = categories.id)`,
}

/** Só o que a vitrine pública precisa. */
const publicFields = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  description: categories.description,
  icon: categories.icon,
  color: categories.color,
  parent_id: categories.parentId,
  display_order: categories.displayOrder,
  is_featured: categories.isFeatured,
  cover_image_url: categories.coverImageUrl,
  meta_title: categories.metaTitle,
  meta_description: categories.metaDescription,
}

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Categorias ativas (leitura pública). */
  listPublic() {
    return this.db
      .select(publicFields)
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.displayOrder), asc(categories.id))
  }

  list(query: ListCategoriesQuery) {
    const conditions: SQL[] = []
    if (query.status !== 'ALL') conditions.push(eq(categories.isActive, query.status === 'active'))
    if (query.featured) conditions.push(eq(categories.isFeatured, query.featured === 'true'))
    const term = query.search?.trim()
    if (term) {
      conditions.push(
        or(
          likeContains(categories.name, term),
          likeContains(categories.slug, term),
          likeContains(categories.description, term),
        )!,
      )
    }
    return this.db
      .select(adminFields)
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.displayOrder), asc(categories.id))
  }

  async get(id: number) {
    const [row] = await this.db.select(adminFields).from(categories).where(eq(categories.id, id))
    if (!row) throw new NotFoundException('Categoria não encontrada')
    return { ...row, children_count: await this.countChildren(this.db, id) }
  }

  /** O que impede (ou desaconselha) apagar: subcategorias e cursos vinculados. */
  async getDependencies(id: number) {
    await this.requireCategory(this.db, id)
    const [childrenCount, coursesCount] = await Promise.all([
      this.countChildren(this.db, id),
      this.countCourses(this.db, id),
    ])
    return {
      children_count: childrenCount,
      courses_count: coursesCount,
      can_delete: childrenCount === 0 && coursesCount === 0,
    }
  }

  async create(body: CategoryBody, adminId: string, request: RequestInfo) {
    try {
      return await this.db.transaction(async (tx) => {
        await this.assertSlugFree(tx, body.slug)
        await this.assertParentOk(tx, null, body.parentId)

        const [created] = await tx
          .insert(categories)
          .values({
            name: body.name,
            slug: body.slug,
            description: body.description,
            icon: body.icon,
            color: body.color,
            parentId: body.parentId,
            displayOrder: body.displayOrder,
            isActive: body.isActive,
            isFeatured: body.isFeatured,
          })
          .returning({ id: categories.id, name: categories.name, slug: categories.slug })

        await this.audit.log(
          {
            userId: adminId,
            action: 'create',
            resourceType: 'category',
            resourceId: created!.id,
            changes: { name: body.name, slug: body.slug, parentId: body.parentId },
            ...request,
          },
          tx,
        )
        return created!
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw this.slugTaken()
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('Categoria pai não encontrada')
      }
      throw error
    }
  }

  async update(id: number, body: CategoryBody, adminId: string, request: RequestInfo) {
    try {
      return await this.db.transaction(async (tx) => {
        const existing = await this.requireCategory(tx, id, true)
        if (body.slug !== existing.slug) await this.assertSlugFree(tx, body.slug, id)

        if (body.parentId !== existing.parentId) {
          if (body.parentId !== null && (await this.countChildren(tx, id)) > 0) {
            throw new BadRequestException(
              'Não é possível mover uma categoria que possui subcategorias. Remova as subcategorias primeiro.',
            )
          }
          await this.assertParentOk(tx, id, body.parentId)
        }

        const [updated] = await tx
          .update(categories)
          .set({
            name: body.name,
            slug: body.slug,
            description: body.description,
            icon: body.icon,
            color: body.color,
            parentId: body.parentId,
            displayOrder: body.displayOrder,
            isActive: body.isActive,
            isFeatured: body.isFeatured,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, id))
          .returning({ id: categories.id, name: categories.name, slug: categories.slug })

        await this.audit.log(
          {
            userId: adminId,
            action: 'update',
            resourceType: 'category',
            resourceId: id,
            changes: { name: body.name, slug: body.slug, parentId: body.parentId },
            ...request,
          },
          tx,
        )
        return updated!
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw this.slugTaken()
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('Categoria pai não encontrada')
      }
      throw error
    }
  }

  /** Liga/desliga a categoria. Não deixa desativar com subcategorias ativas. */
  async toggleStatus(id: number, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const category = await this.requireCategory(tx, id, true)
      const isActive = !category.isActive

      if (!isActive) {
        const [row] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(categories)
          .where(and(eq(categories.parentId, id), eq(categories.isActive, true)))
        const count = row?.count ?? 0
        if (count > 0) {
          throw new BadRequestException(
            `Esta categoria possui ${count} subcategoria(s) ativa(s). Desative as subcategorias primeiro.`,
          )
        }
      }

      await tx
        .update(categories)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(categories.id, id))
      await this.audit.log(
        {
          userId: adminId,
          action: isActive ? 'activate' : 'deactivate',
          resourceType: 'category',
          resourceId: id,
          ...request,
        },
        tx,
      )
      return { id, is_active: isActive }
    })
  }

  async toggleFeatured(id: number, adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const category = await this.requireCategory(tx, id, true)
      const isFeatured = !category.isFeatured
      await tx
        .update(categories)
        .set({ isFeatured, updatedAt: new Date() })
        .where(eq(categories.id, id))
      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'category',
          resourceId: id,
          changes: { isFeatured },
          ...request,
        },
        tx,
      )
      return { id, is_featured: isFeatured }
    })
  }

  /**
   * Sobe/desce a categoria entre as irmãs (mesmo pai). Troca de lugar na lista ordenada e
   * regrava a ordem 0..n-1: funciona mesmo quando várias têm a mesma `display_order`.
   */
  async move(id: number, direction: 'up' | 'down', adminId: string, request: RequestInfo) {
    return this.db.transaction(async (tx) => {
      const category = await this.requireCategory(tx, id)
      const siblings = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(
          category.parentId === null
            ? isNull(categories.parentId)
            : eq(categories.parentId, category.parentId),
        )
        .orderBy(asc(categories.displayOrder), asc(categories.id))
        .for('update')

      const index = siblings.findIndex((s) => s.id === id)
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (index === -1) throw new NotFoundException('Categoria não encontrada na lista')
      if (direction === 'up' && index === 0)
        throw new BadRequestException('Categoria já está no topo')
      if (direction === 'down' && index === siblings.length - 1) {
        throw new BadRequestException('Categoria já está no final')
      }

      const reordered = siblings.map((s) => s.id)
      ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex]!, reordered[index]!]
      const now = new Date()
      for (const [position, siblingId] of reordered.entries()) {
        await tx
          .update(categories)
          .set({ displayOrder: position, updatedAt: now })
          .where(eq(categories.id, siblingId))
      }

      await this.audit.log(
        {
          userId: adminId,
          action: 'update',
          resourceType: 'category',
          resourceId: id,
          changes: { moved: direction },
          ...request,
        },
        tx,
      )
      return { moved_id: id, swapped_id: siblings[targetIndex]!.id }
    })
  }

  async remove(id: number, adminId: string, request: RequestInfo) {
    try {
      return await this.db.transaction(async (tx) => {
        // Trava a linha: quem cria subcategoria/curso nela espera, e a checagem abaixo vale.
        const category = await this.requireCategory(tx, id, true)

        const childrenCount = await this.countChildren(tx, id)
        if (childrenCount > 0) {
          throw new ConflictException(
            `Não é possível excluir: Esta categoria possui ${childrenCount} subcategoria(s) vinculada(s).`,
          )
        }
        const coursesCount = await this.countCourses(tx, id)
        if (coursesCount > 0) {
          throw new ConflictException(
            `Não é possível excluir: Existem ${coursesCount} curso(s) vinculado(s) a esta categoria.`,
          )
        }

        await tx.delete(categories).where(eq(categories.id, id))
        await this.audit.log(
          {
            userId: adminId,
            action: 'delete',
            resourceType: 'category',
            resourceId: id,
            changes: { name: category.name, slug: category.slug },
            ...request,
          },
          tx,
        )
        return { name: category.name }
      })
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Não é possível excluir: Existem cursos vinculados a esta categoria.',
        )
      }
      throw error
    }
  }

  // --------------------------------------------------------------------------------------------

  private async requireCategory(executor: DbExecutor, id: number, lock = false) {
    const query = executor
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
        isActive: categories.isActive,
        isFeatured: categories.isFeatured,
      })
      .from(categories)
      .where(eq(categories.id, id))
    const [row] = await (lock ? query.for('update') : query)
    if (!row) throw new NotFoundException('Categoria não encontrada')
    return row
  }

  private async countChildren(executor: DbExecutor, id: number): Promise<number> {
    const [row] = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.parentId, id))
    return row?.count ?? 0
  }

  private async countCourses(executor: DbExecutor, id: number): Promise<number> {
    const [row] = await executor
      .select({ count: sql<number>`count(*)::int` })
      .from(courses)
      .where(eq(courses.categoryId, id))
    return row?.count ?? 0
  }

  private async assertSlugFree(executor: DbExecutor, slug: string, exceptId?: number) {
    const [existing] = await executor
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
    if (existing && existing.id !== exceptId) throw this.slugTaken()
  }

  private async assertParentOk(
    executor: DbExecutor,
    categoryId: number | null,
    parentId: number | null,
  ) {
    if (parentId === null) return
    const all = await executor
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories)
    const error = validateParent(categoryId, parentId, all)
    if (error) throw new BadRequestException(error)
  }

  private slugTaken() {
    return new ConflictException('Já existe uma categoria com este slug. Por favor, escolha outro.')
  }
}
