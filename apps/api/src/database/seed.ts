/**
 * Dados de DESENVOLVIMENTO: contas de teste (admin, produtor, aluno), categorias e cursos de exemplo
 * para ver o sistema funcionando. Idempotente.
 *
 *   pnpm db:seed
 *
 * Contas (senha de desenvolvimento, só para uso local): admin@escola.local, produtor@escola.local,
 * aluno@escola.local, todas com a senha `senha-dev-123`.
 *
 * Em produção só roda no ambiente de demonstração (`DEMO_MODE=true`). Fora do banco local (ou em
 * produção) cada conta usa a senha forte de `SEED_ADMIN_PASSWORD`, `SEED_PRODUCER_PASSWORD` e
 * `SEED_STUDENT_PASSWORD` (16+ caracteres): a senha de desenvolvimento só vale na própria máquina.
 */
import { existsSync } from 'node:fs'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { seedAccountPassword } from './seed-password.js'
import { hashPassword, verifyPassword } from '../modules/auth/crypto/password-hasher.js'
import { DEMO_ACCOUNTS } from '../modules/auth/demo-accounts.js'
import * as schema from './schema/index.js'

if (existsSync('.env')) process.loadEnvFile('.env')
const isProduction = process.env.NODE_ENV === 'production'
if (isProduction && process.env.DEMO_MODE !== 'true') {
  throw new Error('O seed não roda em produção (só no ambiente de demonstração, DEMO_MODE=true).')
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não definido')

const { categories, courseLessons, courseModules, courses, profiles, userRoles, users } = schema

const ACCOUNTS = [
  {
    email: DEMO_ACCOUNTS.admin,
    name: 'Admin da Escola',
    role: 'admin',
    passwordEnv: 'SEED_ADMIN_PASSWORD',
  },
  {
    email: DEMO_ACCOUNTS.producer,
    name: 'Marina Produtora',
    role: 'producer',
    passwordEnv: 'SEED_PRODUCER_PASSWORD',
  },
  {
    email: DEMO_ACCOUNTS.student,
    name: 'Aluno Teste',
    role: 'student',
    passwordEnv: 'SEED_STUDENT_PASSWORD',
  },
] as const

/** Senha da conta: a de desenvolvimento no local; em produção (demonstração), a forte do ambiente. */

const CATEGORIES = [
  { name: 'Programação', slug: 'programacao', icon: 'code', color: '#f59e0b' },
  { name: 'Design', slug: 'design', icon: 'palette', color: '#ec4899' },
  { name: 'Marketing', slug: 'marketing', icon: 'megaphone', color: '#22c55e' },
]

const COURSES = [
  {
    slug: 'logica-de-programacao',
    title: 'Lógica de Programação do Zero',
    category: 'programacao',
    price: 197,
    discountPrice: 147,
    featured: true,
    short: 'Aprenda a pensar como programador antes de escolher uma linguagem.',
    modules: [
      {
        title: 'Primeiros passos',
        lessons: ['O que é um algoritmo', 'Variáveis e tipos', 'Decisões com se/senão'],
      },
      { title: 'Repetição e funções', lessons: ['Laços de repetição', 'Funções', 'Projeto final'] },
    ],
  },
  {
    slug: 'design-para-iniciantes',
    title: 'Design para Iniciantes',
    category: 'design',
    price: 129,
    discountPrice: null,
    featured: false,
    short: 'Cores, tipografia e composição para criar peças bonitas.',
    modules: [{ title: 'Fundamentos', lessons: ['Cores', 'Tipografia', 'Composição'] }],
  },
  {
    slug: 'marketing-digital-na-pratica',
    title: 'Marketing Digital na Prática',
    category: 'marketing',
    price: 0,
    discountPrice: null,
    featured: false,
    short: 'Do zero ao primeiro anúncio no ar (curso gratuito).',
    modules: [{ title: 'Começando', lessons: ['Público e oferta', 'Seu primeiro anúncio'] }],
  },
] as const

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const db = drizzle(pool, { schema, casing: 'snake_case' })

  try {
    const ids = new Map<string, string>()

    for (const account of ACCOUNTS) {
      const password = seedAccountPassword(account.passwordEnv)
      const passwordHash = await hashPassword(password)
      const [existing] = await db
        .select({ id: users.id, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, account.email))
      let id = existing?.id
      if (existing && isProduction) {
        // Na demonstração o cadastro público já nasce confirmado: alguém pode ter criado este e-mail
        // antes do seed. Só reaproveita a conta se ela tem o papel esperado e a senha do ambiente.
        const [role] = await db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(and(eq(userRoles.userId, existing.id), eq(userRoles.role, account.role)))
        if (!role || !(await verifyPassword(password, existing.passwordHash))) {
          throw new Error(
            `${account.email} já existe sem o papel ou a senha do seed: não foi criada por ele. ` +
              'Remova essa conta (ou zere o banco) antes de rodar o seed.',
          )
        }
      }
      if (!id) {
        const [created] = await db
          .insert(users)
          .values({ email: account.email, passwordHash, emailVerifiedAt: new Date() })
          .returning({ id: users.id })
        id = created.id
        await db.insert(profiles).values({ id, fullName: account.name })
        await db.insert(userRoles).values({ userId: id, role: account.role })
      }
      ids.set(account.role, id)
    }

    const categoryIds = new Map<string, number>()
    for (const category of CATEGORIES) {
      await db.insert(categories).values(category).onConflictDoNothing({ target: categories.slug })
      const [row] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, category.slug))
      categoryIds.set(category.slug, row.id)
    }

    for (const course of COURSES) {
      const [existing] = await db
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.slug, course.slug))
      if (existing) continue

      const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0)
      const [created] = await db
        .insert(courses)
        .values({
          producerId: ids.get('producer')!,
          categoryId: categoryIds.get(course.category)!,
          title: course.title,
          slug: course.slug,
          description: `${course.short} Curso de exemplo para desenvolvimento.`,
          shortDescription: course.short,
          price: course.price,
          discountPrice: course.discountPrice,
          status: 'approved',
          isPublished: true,
          publishedAt: new Date(),
          isFeatured: course.featured,
          totalLessons,
          totalDurationMinutes: totalLessons * 10,
          whatYouWillLearn: ['Base sólida', 'Prática guiada', 'Projeto para o portfólio'],
          requirements: ['Computador com internet'],
          targetAudience: ['Quem está começando'],
        })
        .returning({ id: courses.id })

      for (const [moduleIndex, module] of course.modules.entries()) {
        const [createdModule] = await db
          .insert(courseModules)
          .values({
            courseId: created.id,
            title: module.title,
            displayOrder: moduleIndex,
            isPublished: true,
          })
          .returning({ id: courseModules.id })
        await db.insert(courseLessons).values(
          module.lessons.map((title, index) => ({
            moduleId: createdModule.id,
            title,
            type: 'video' as const,
            durationMinutes: 10,
            displayOrder: index,
            isPublished: true,
            isFreePreview: moduleIndex === 0 && index === 0,
          })),
        )
      }
    }

    console.log('Seed de desenvolvimento aplicado.')
  } finally {
    await pool.end()
  }
}

await main()
