/**
 * Ambiente de DEMONSTRAÇÃO: zera o banco e os arquivos enviados e popula a plataforma com os cursos
 * do Garoto do Programa, um modelo de certificado, posts no blog, um cupom e 40 alunos com
 * matrículas, progresso, quiz, avaliações, perguntas e certificados. Também serve de reset (cron).
 *
 *   node dist/database/seed-demo.js
 *
 * Usa os SERVIÇOS da própria API (não escreve direto nas tabelas, a não ser datas e categorias):
 * assim pedidos, comissões, contadores e certificados ficam iguais aos de uso real.
 *
 * Só roda com `DEMO_MODE=true`. Variáveis:
 * - `DEMO_MEDIA_URL`: endereço público dos vídeos (ex.: https://dominio/midia);
 * - `DEMO_ASSETS_DIR`: pasta com `imagens/` (capas, avatar, imagens do blog, PDF de apoio);
 * - `SEED_ADMIN_PASSWORD`, `SEED_PRODUCER_PASSWORD`, `SEED_STUDENT_PASSWORD` (16+ em produção);
 * - `DEMO_COMPANY_DOCUMENT` (opcional): CNPJ mostrado nos termos.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import type { INestApplicationContext } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { AppModule } from '../app.module.js'
import { DB, type Database } from './database.module.js'
import {
  categories,
  checkoutOrders,
  courseLessons,
  courseModules,
  courses,
  enrollments,
  quizOptions,
  quizQuestions,
} from './schema/index.js'
import { seedAccountPassword } from './seed-password.js'
import { hashPassword } from '../modules/auth/crypto/password-hasher.js'
import { DEMO_ACCOUNTS } from '../modules/auth/demo-accounts.js'
import { UsersService } from '../modules/users/users.service.js'
import { FilesService } from '../modules/files/files.service.js'
import { SettingsService } from '../modules/settings/settings.service.js'
import { DEFAULT_SETTINGS, SETTINGS_INPUT_SCHEMAS } from '../modules/settings/settings.registry.js'
import { ProfileService } from '../modules/producer/profile/profile.service.js'
import { updateProfileSchema } from '../modules/producer/profile/profile.schemas.js'
import { ProducerCoursesService } from '../modules/producer-courses/producer-courses.service.js'
import { completeCourseSchema } from '../modules/producer-courses/course-input.schemas.js'
import { AdminCoursesService } from '../modules/admin-courses/admin-courses.service.js'
import { CertificateTemplatesService } from '../modules/certificates/certificate-templates.service.js'
import { createTemplateSchema } from '../modules/certificates/certificates.schemas.js'
import type { CertificateBuilderSchema } from '../modules/certificates/builder-schema.js'
import { AdminCouponsService } from '../modules/checkout/admin-coupons.service.js'
import { couponFormSchema } from '../modules/checkout/admin-coupons.schemas.js'
import { OrdersService } from '../modules/checkout/orders.service.js'
import { PaymentsService } from '../modules/checkout/payments.service.js'
import { createOrderSchema } from '../modules/checkout/checkout.schemas.js'
import { ProgressService } from '../modules/learning/progress.service.js'
import { QuizService } from '../modules/learning/quiz.service.js'
import { ReviewsService } from '../modules/learning/reviews.service.js'
import { QuestionsService } from '../modules/learning/questions.service.js'
import { NotesService } from '../modules/learning/notes.service.js'
import {
  askQuestionSchema,
  createNoteSchema,
  saveReviewSchema,
  submitQuizSchema,
} from '../modules/learning/learning.schemas.js'
import { ReviewsService as ProducerReviewsService } from '../modules/producer/reviews/reviews.service.js'
import { QuestionsService as ProducerQuestionsService } from '../modules/producer/questions/questions.service.js'
import { BlogService } from '../modules/blog/blog.service.js'
import { GamificationService } from '../modules/gamification/gamification.service.js'
import { blogPostBodySchema } from '../modules/blog/blog.schemas.js'

if (existsSync('.env')) process.loadEnvFile('.env')
if (process.env.DEMO_MODE !== 'true') {
  throw new Error('O seed de demonstração só roda com DEMO_MODE=true.')
}
const MEDIA_URL = (process.env.DEMO_MEDIA_URL ?? '').replace(/\/+$/, '')
if (!/^https?:\/\//.test(MEDIA_URL))
  throw new Error('Defina DEMO_MEDIA_URL (ex.: https://dominio/midia)')
const ASSETS_DIR = resolve(process.env.DEMO_ASSETS_DIR ?? './demo-assets')
if (!existsSync(join(ASSETS_DIR, 'imagens')))
  throw new Error(`Faltam as imagens em ${ASSETS_DIR}/imagens`)

const DAY_MS = 24 * 60 * 60 * 1000

/** Gerador pseudoaleatório com semente: o reset de toda noite gera sempre a mesma demonstração. */
function makeRandom(seed: number) {
  let state = seed
  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
  }
}
const random = makeRandom(20261019)

function asset(name: string, mimetype: string) {
  const buffer = readFileSync(join(ASSETS_DIR, 'imagens', name))
  return { buffer, mimetype, size: buffer.length }
}

const video = (name: string) => `${MEDIA_URL}/videos/${name}.mp4`

// ---------------------------------------------------------------- conteúdo

const GAROTO_BIO =
  'Garoto do Programa; é um canal de tecnologia, programação e IA com humor ácido e estética de HQ. ' +
  'Aqui a programação começa pela lógica, sem decoreba, e cada episódio vira uma aula curta. ' +
  'Também fazemos sistemas grátis para a comunidade. Conteúdo usado nesta demonstração da Escola do Garoto;.'

const QUIZ_LOGICA = [
  {
    text: 'O que é um algoritmo?',
    options: [
      ['Uma sequência de passos para resolver um problema', true],
      ['Um tipo de computador', false],
      ['Uma linguagem de programação', false],
    ],
  },
  {
    text: 'Em programação, a ordem dos comandos importa.',
    trueFalse: true,
    options: [
      ['Verdadeiro', true],
      ['Falso', false],
    ],
  },
  {
    text: 'Para que serve uma variável?',
    options: [
      ['Para guardar um valor e usar depois', true],
      ['Para deixar o programa mais rápido', false],
      ['Para conectar na internet', false],
    ],
  },
  {
    text: 'Qual comando do Python mostra algo na tela?',
    options: [
      ['print()', true],
      ['input()', false],
      ['show()', false],
    ],
  },
] as const

const RESUMO_LOGICA = `<h2>Os 3 pilares da lógica</h2>
<p>Antes de escolher uma linguagem, vale dominar três ideias que aparecem em qualquer programa:</p>
<ul>
<li><strong>Algoritmo:</strong> a receita. Passos claros, na ordem certa, que resolvem um problema.</li>
<li><strong>Sequência:</strong> o computador executa um comando depois do outro. Trocar a ordem muda o resultado.</li>
<li><strong>Variável:</strong> uma caixinha com nome, onde o programa guarda um valor para usar depois.</li>
</ul>
<p>Com isso na cabeça, qualquer linguagem vira só uma forma diferente de escrever a mesma lógica.</p>`

function courseLogica(categoryId: number, thumbnailUrl: string) {
  return completeCourseSchema.parse({
    title: 'Lógica de Programação com o Garoto',
    slug: 'logica-de-programacao-com-o-garoto',
    short_description:
      'Do primeiro algoritmo à variável, em aulas curtas, sem decoreba e com humor duvidoso.',
    description:
      'Curso gratuito para quem nunca programou. Cada aula é um episódio curto do Garoto do Programa: ' +
      'você entende o que é um algoritmo, por que a ordem importa e para que serve uma variável, ' +
      'sempre com exemplos do dia a dia e um pouco de Python. No fim, um resumo e um quiz para fixar.',
    category_id: String(categoryId),
    level: 'beginner',
    thumbnail_url: thumbnailUrl,
    what_you_will_learn: [
      'Pensar como programador antes de escolher uma linguagem',
      'Escrever seu primeiro algoritmo em Python',
      'Entender sequência, decisão e variável',
      'Reconhecer algoritmos no mundo real',
    ],
    requirements: ['Um computador ou celular com internet', 'Vontade de aprender (só isso)'],
    target_audience: ['Quem quer começar a programar do zero', 'Quem já tentou e desistiu'],
    price: 0,
    is_free: true,
    discount_price: null,
    has_certificate: true,
    modules: [
      {
        title: 'Primeiros passos',
        order: 1,
        lessons: [
          {
            title: 'EP. 01: seu primeiro algoritmo em Python',
            type: 'video',
            content_url: video('ep01-algoritmo'),
            duration_minutes: 2,
            order: 1,
            is_preview: true,
          },
          {
            title: 'EP. 02: a ordem importa',
            type: 'video',
            content_url: video('ep02-sequencia'),
            duration_minutes: 2,
            order: 2,
            is_preview: false,
          },
          {
            title: 'EP. 03: variável',
            type: 'video',
            content_url: video('ep03-variavel'),
            duration_minutes: 2,
            order: 3,
            is_preview: false,
          },
        ],
      },
      {
        title: 'Algoritmo no mundo real',
        order: 2,
        lessons: [
          {
            title: 'O algoritmo escolhe seu candidato?',
            type: 'video',
            content_url: video('algoritmo-candidato'),
            duration_minutes: 3,
            order: 1,
            is_preview: false,
          },
          {
            title: 'Pente-fino do Garoto: a vaga dos sonhos (Python)',
            type: 'video',
            content_url: video('pente-fino'),
            duration_minutes: 3,
            order: 2,
            is_preview: false,
          },
          {
            title: 'Resumo: os 3 pilares da lógica',
            type: 'text',
            content_text: RESUMO_LOGICA,
            duration_minutes: 5,
            order: 3,
            is_preview: false,
          },
          {
            title: 'Quiz: lógica na prática',
            type: 'quiz',
            duration_minutes: 5,
            order: 4,
            is_preview: false,
            quiz_settings: {
              passing_score: 70,
              allow_retake: true,
              show_answers_after: true,
              shuffle_questions: false,
              shuffle_options: true,
            },
            quiz_questions: QUIZ_LOGICA.map((question, index) => ({
              type: 'trueFalse' in question ? 'true_false' : 'multiple_choice',
              question_text: question.text,
              points: 1,
              order: index + 1,
              options: question.options.map(([text, correct], optionIndex) => ({
                option_text: text,
                is_correct: correct,
                order: optionIndex + 1,
              })),
            })),
          },
        ],
      },
    ],
  })
}

function courseTecnologia(categoryId: number, thumbnailUrl: string, checklistUrl: string) {
  return completeCourseSchema.parse({
    title: 'Por Dentro da Tecnologia',
    slug: 'por-dentro-da-tecnologia',
    short_description:
      'IA que alucina, invasões famosas e a urna eletrônica explicada de verdade, sem jargão.',
    description:
      'Uma viagem pelos bastidores da tecnologia que está no seu dia a dia. Você vai entender por que ' +
      'a inteligência artificial inventa respostas com confiança, como um único programador quase ' +
      'abriu uma porta dos fundos na internet inteira, como Kevin Mitnick enganava pessoas em vez de ' +
      'máquinas e o que dá (e o que não dá) para auditar numa urna eletrônica.',
    category_id: String(categoryId),
    level: 'beginner',
    thumbnail_url: thumbnailUrl,
    what_you_will_learn: [
      'Como uma IA gera texto e por que ela alucina',
      'Como funcionam ataques famosos e engenharia social',
      'O que é auditar um sistema e como fazer as perguntas certas',
      'Separar fato de boato quando o assunto é tecnologia',
    ],
    requirements: ['Curiosidade', 'Nenhum conhecimento de programação'],
    target_audience: ['Quem usa tecnologia e quer entender o que acontece por trás'],
    price: 97,
    is_free: false,
    discount_price: 67,
    has_certificate: true,
    modules: [
      {
        title: 'Inteligência artificial',
        order: 1,
        lessons: [
          {
            title: 'Garoto vs a Alucinação: como a IA funciona',
            type: 'video',
            content_url: video('ia-alucinacao'),
            duration_minutes: 3,
            order: 1,
            is_preview: true,
          },
        ],
      },
      {
        title: 'Invasões',
        order: 2,
        lessons: [
          {
            title: 'O Meio Segundo: a porta dos fundos do xz',
            type: 'video',
            content_url: video('xz-meio-segundo'),
            duration_minutes: 3,
            order: 1,
            is_preview: false,
          },
          {
            title: 'Kevin Mitnick, a arte de enganar: o assobio',
            type: 'video',
            content_url: video('mitnick-assobio'),
            duration_minutes: 3,
            order: 2,
            is_preview: false,
          },
        ],
      },
      {
        title: 'Urna e eleições',
        order: 3,
        lessons: [
          {
            title: 'O Grande Assalto à Urna',
            type: 'video',
            content_url: video('assalto-urna'),
            duration_minutes: 3,
            order: 1,
            is_preview: false,
          },
          {
            title: 'Audita Aí: um sistema grátis para conferir a eleição',
            type: 'video',
            content_url: video('audita-ai'),
            duration_minutes: 3,
            order: 2,
            is_preview: false,
          },
          {
            title: 'Audita Aí explicado como se eu tivesse 5 anos',
            type: 'video',
            content_url: video('audita-5-anos'),
            duration_minutes: 3,
            order: 3,
            is_preview: false,
          },
          {
            title: 'A Urna do Garoto',
            type: 'video',
            content_url: video('urna-do-garoto'),
            duration_minutes: 3,
            order: 4,
            is_preview: false,
          },
          {
            title: 'Material de apoio: checklist para auditar um sistema',
            type: 'file',
            content_url: checklistUrl,
            duration_minutes: 5,
            order: 5,
            is_preview: false,
          },
        ],
      },
      {
        title: 'Sistemas grátis',
        order: 4,
        lessons: [
          {
            title: 'Chat do Garoto: zero servidor',
            type: 'video',
            content_url: video('chat-do-garoto'),
            duration_minutes: 3,
            order: 1,
            is_preview: false,
          },
        ],
      },
    ],
  })
}

/** Certificado: texto escuro (o PDF sai em fundo branco), com acentos. */
const CERTIFICATE_SCHEMA: CertificateBuilderSchema = {
  version: 1,
  meta: { orientation: 'landscape', pageSize: 'A4' },
  background: { imagePath: null, primarySignaturePath: null, secondarySignaturePath: null },
  elements: [
    {
      id: 'marca',
      type: 'text',
      label: 'Marca',
      text: 'garoto do programa; · Escola do Garoto',
      token: null,
      x: 10,
      y: 9,
      width: 80,
      fontSize: 14,
      fontWeight: 700,
      color: '#16A34A',
      align: 'center',
    },
    {
      id: 'titulo',
      type: 'text',
      label: 'Título',
      text: 'Certificado de Conclusão',
      token: null,
      x: 10,
      y: 17,
      width: 80,
      fontSize: 40,
      fontWeight: 800,
      color: '#0D1117',
      align: 'center',
    },
    {
      id: 'certifica',
      type: 'text',
      label: 'Abertura',
      text: 'Certificamos que',
      token: null,
      x: 10,
      y: 33,
      width: 80,
      fontSize: 16,
      fontWeight: 400,
      color: '#334155',
      align: 'center',
    },
    {
      id: 'aluno',
      type: 'token',
      label: 'Nome do aluno',
      text: null,
      token: 'student_name',
      x: 10,
      y: 40,
      width: 80,
      fontSize: 34,
      fontWeight: 700,
      color: '#0D1117',
      align: 'center',
    },
    {
      id: 'concluiu',
      type: 'text',
      label: 'Conclusão',
      text: 'concluiu o curso',
      token: null,
      x: 10,
      y: 53,
      width: 80,
      fontSize: 16,
      fontWeight: 400,
      color: '#334155',
      align: 'center',
    },
    {
      id: 'curso',
      type: 'token',
      label: 'Nome do curso',
      text: null,
      token: 'course_title',
      x: 10,
      y: 59,
      width: 80,
      fontSize: 24,
      fontWeight: 700,
      color: '#BE185D',
      align: 'center',
    },
    {
      id: 'carga',
      type: 'token',
      label: 'Carga horária',
      text: null,
      token: 'workload_hours',
      x: 10,
      y: 69,
      width: 80,
      fontSize: 14,
      fontWeight: 400,
      color: '#334155',
      align: 'center',
    },
    {
      id: 'data',
      type: 'token',
      label: 'Data de emissão',
      text: null,
      token: 'issue_date',
      x: 8,
      y: 84,
      width: 40,
      fontSize: 13,
      fontWeight: 400,
      color: '#334155',
      align: 'left',
    },
    {
      id: 'codigo',
      type: 'token',
      label: 'Código',
      text: null,
      token: 'certificate_code',
      x: 52,
      y: 84,
      width: 40,
      fontSize: 13,
      fontWeight: 600,
      color: '#334155',
      align: 'right',
    },
  ],
}

const STUDENT_NAMES = [
  'Ana Beatriz Souza',
  'Bruno Carvalho',
  'Camila Rocha',
  'Diego Martins',
  'Eduarda Lima',
  'Felipe Araújo',
  'Gabriela Nunes',
  'Henrique Alves',
  'Isabela Teixeira',
  'João Pedro Ramos',
  'Larissa Gomes',
  'Lucas Ferreira',
  'Mariana Costa',
  'Mateus Ribeiro',
  'Natália Barbosa',
  'Otávio Mendes',
  'Paula Freitas',
  'Rafael Moreira',
  'Renata Cardoso',
  'Samuel Pires',
  'Sofia Monteiro',
  'Thiago Correia',
  'Valentina Dias',
  'Vinícius Castro',
  'Yasmin Batista',
  'André Lopes',
  'Bianca Fernandes',
  'Caio Duarte',
  'Débora Vieira',
  'Enzo Rezende',
  'Fernanda Campos',
  'Gustavo Pinto',
  'Helena Farias',
  'Igor Machado',
  'Júlia Cavalcanti',
  'Kauã Nogueira',
  'Lívia Moura',
  'Murilo Peixoto',
  'Nicole Andrade',
  'Pedro Henrique Sales',
] as const

const REVIEWS: Record<number, readonly [string, string][]> = {
  5: [
    [
      'Finalmente entendi!',
      'Já tinha desistido de programar duas vezes. Com episódios curtos e piada no meio, foi.',
    ],
    ['Melhor curso grátis', 'Direto ao ponto. O quiz no final ajuda muito a fixar.'],
    ['Didática absurda', 'Explica coisa complicada como se fosse papo de bar. Recomendo demais.'],
    [
      'Assisti tudo de uma vez',
      'Aula curta engana: quando vi já tinha terminado o módulo inteiro.',
    ],
    ['Abriu minha cabeça', 'Nunca mais vou olhar para IA e urna eletrônica do mesmo jeito.'],
  ],
  4: [
    ['Muito bom', 'Conteúdo ótimo. Queria mais exercícios práticos, mas valeu muito.'],
    ['Curti bastante', 'O humor deixa leve. Algumas aulas podiam ser um pouco mais longas.'],
    ['Recomendo', 'Ótimo para quem está começando. O material de apoio em PDF é um bônus.'],
  ],
  3: [['Bom, mas curto', 'Gostei, mas esperava mais profundidade em alguns temas.']],
}

const QUESTIONS = [
  'No Python, preciso declarar o tipo da variável antes de usar? Fiquei com essa dúvida no episódio.',
  'Qual a diferença entre algoritmo e programa? Parecem a mesma coisa para mim.',
  'Existe algum exercício extra para praticar a parte de sequência?',
  'A IA alucina mesmo quando a pergunta é simples? Como evitar isso no dia a dia?',
  'Dá para usar o Audita Aí em eleições municipais também?',
] as const

const ANSWERS = [
  'Ótima pergunta! No Python não precisa: o tipo vem do valor que você guarda. Já em linguagens como Java, precisa sim.',
  'Algoritmo é a receita (a ideia); programa é a receita escrita numa linguagem que o computador entende.',
  'Tem sim: pegue uma receita de bolo e troque a ordem de dois passos. Escreva o que acontece. É exatamente isso.',
  'Alucina sim. A dica é pedir a fonte e conferir; se a IA não consegue mostrar de onde tirou, desconfie.',
  'Dá! O princípio é o mesmo: comparar o boletim de urna com o resultado divulgado.',
] as const

const BLOG_POSTS = [
  {
    title: 'Algoritmo é só uma receita de bolo (com bug)',
    slug: 'algoritmo-e-so-uma-receita-de-bolo',
    excerpt: 'Antes de decorar comando, entenda a ideia que está por trás de qualquer programa.',
    category: 'Programação',
    tags: ['lógica', 'iniciante'],
    image: 'blog-algoritmo.jpg',
    daysAgo: 48,
    content:
      '<p>Todo mundo já seguiu um algoritmo sem saber: a receita de bolo. Ingredientes são as entradas, ' +
      'o modo de preparo são os passos e o bolo é a saída.</p><p>O bug aparece quando a receita pula um ' +
      'passo ou troca a ordem. Programar é escrever receitas que nem o computador consegue entender errado.</p>',
  },
  {
    title: 'Por que a IA inventa coisa com tanta confiança',
    slug: 'por-que-a-ia-inventa-coisa',
    excerpt:
      'A tal da alucinação explicada sem matemática e com um exemplo que você vai reconhecer.',
    category: 'Inteligência Artificial',
    tags: ['ia', 'tecnologia'],
    image: 'blog-ia.jpg',
    daysAgo: 21,
    content:
      '<p>Um modelo de linguagem não consulta uma enciclopédia: ele prevê a próxima palavra mais provável. ' +
      'Quando não sabe, ele continua prevendo, e o resultado soa convincente.</p><p>Por isso a regra de ouro ' +
      'é a mesma de qualquer sistema: confiar, mas conferir.</p>',
  },
  {
    title: 'Dá para auditar a urna? O que o código mostra',
    slug: 'da-para-auditar-a-urna',
    excerpt: 'Boletim de urna, assinatura digital e o que qualquer pessoa pode conferir em casa.',
    category: 'Tecnologia e Sociedade',
    tags: ['eleições', 'auditoria'],
    image: 'blog-urna.jpg',
    daysAgo: 6,
    content:
      '<p>Cada urna imprime um boletim com os votos dela antes de enviar qualquer dado. Esse boletim é público ' +
      'e tem assinatura digital.</p><p>Comparar os boletins com o resultado divulgado é a auditoria mais ' +
      'simples que existe, e foi a ideia por trás do Audita Aí.</p>',
  },
] as const

// ---------------------------------------------------------------- execução

async function resetEverything(app: INestApplicationContext, db: Database) {
  await db.execute(sql`
    DO $$
    DECLARE tabelas text;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ') INTO tabelas
      FROM pg_tables WHERE schemaname = 'public';
      EXECUTE 'TRUNCATE TABLE ' || tabelas || ' RESTART IDENTITY CASCADE';
    END $$;
  `)
  const filesDir = resolve(process.env.FILES_DIR ?? './storage')
  if (filesDir === '/' || filesDir.split('/').filter(Boolean).length < 2) {
    throw new Error(`FILES_DIR suspeito (${filesDir}): não apago`)
  }
  if (existsSync(filesDir)) {
    for (const entry of readdirSync(filesDir)) rmSync(join(filesDir, entry), { recursive: true })
  }
  void app
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] })
  const db = app.get<Database>(DB)
  const usersService = app.get(UsersService)
  const files = app.get(FilesService)

  try {
    console.log('Zerando banco e arquivos...')
    await resetEverything(app, db)

    async function createUser(
      email: string,
      name: string,
      role: 'admin' | 'producer' | 'student',
      password: string,
    ) {
      const passwordHash = await hashPassword(password)
      const id = await db.transaction(async (tx) => {
        const created = await usersService.createUserWithRole(
          tx,
          { name, email, passwordHash },
          role,
        )
        await usersService.markEmailVerified(tx, created)
        return created
      })
      const session = await usersService.getSessionUser(id)
      if (!session) throw new Error(`Conta ${email} não ficou ativa`)
      return session
    }

    console.log('Contas e configurações...')
    const admin = await createUser(
      DEMO_ACCOUNTS.admin,
      'Admin da Escola',
      'admin',
      seedAccountPassword('SEED_ADMIN_PASSWORD'),
    )
    const producer = await createUser(
      DEMO_ACCOUNTS.producer,
      'Garoto do Programa',
      'producer',
      seedAccountPassword('SEED_PRODUCER_PASSWORD'),
    )
    const demoStudent = await createUser(
      DEMO_ACCOUNTS.student,
      'Aluno Demonstração',
      'student',
      seedAccountPassword('SEED_STUDENT_PASSWORD'),
    )

    const settings = app.get(SettingsService)
    await settings.saveGroup(
      'general',
      SETTINGS_INPUT_SCHEMAS.general.parse({
        ...DEFAULT_SETTINGS.general,
        platformName: 'Escola do Garoto;',
        platformDescription:
          'Plataforma de cursos online grátis e de código aberto (ambiente de demonstração).',
        supportEmail: 'contato@exemplo.com.br',
        supportPhone: '',
      }),
      admin.id,
    )
    await settings.saveGroup(
      'legal',
      SETTINGS_INPUT_SCHEMAS.legal.parse({
        ...DEFAULT_SETTINGS.legal,
        companyName: 'Escola do Garoto;',
        companyDocument: process.env.DEMO_COMPANY_DOCUMENT || 'em atualização',
        companyAddress: 'Brasil (atendimento on-line)',
      }),
      admin.id,
    )

    console.log('Perfil do produtor...')
    const profiles = app.get(ProfileService)
    const avatar = await files.upload(producer, 'avatar', asset('avatar-garoto.png', 'image/png'))
    await profiles.updateAvatar(producer.id, { avatar_url: avatar.url })
    await profiles.updateProfile(
      producer.id,
      updateProfileSchema.parse({
        full_name: 'Garoto do Programa',
        display_name: 'Garoto do Programa;',
        bio: GAROTO_BIO,
        slug: 'garoto-do-programa',
        expertise_areas: 'Lógica de programação, Python, Inteligência artificial, Segurança',
        instagram_url: 'https://www.instagram.com/garotodoprograma',
        public_profile_enabled: true,
      }),
    )

    console.log('Cursos...')
    const [programacao] = await db
      .insert(categories)
      .values({ name: 'Programação', slug: 'programacao', icon: 'code', color: '#39FF88' })
      .returning({ id: categories.id })
    const [tecnologia] = await db
      .insert(categories)
      .values({
        name: 'Tecnologia e Sociedade',
        slug: 'tecnologia-e-sociedade',
        icon: 'cpu',
        color: '#FF2E88',
      })
      .returning({ id: categories.id })

    const thumbLogica = await files.upload(
      producer,
      'thumbnail',
      asset('capa-logica.jpg', 'image/jpeg'),
    )
    const thumbTecnologia = await files.upload(
      producer,
      'thumbnail',
      asset('capa-tecnologia.jpg', 'image/jpeg'),
    )
    const checklist = await files.upload(
      producer,
      'document',
      asset('checklist-auditoria.pdf', 'application/pdf'),
    )

    const producerCourses = app.get(ProducerCoursesService)
    const adminCourses = app.get(AdminCoursesService)
    const { courseId: logicaId } = await producerCourses.createCourse(
      producer,
      courseLogica(programacao!.id, thumbLogica.url),
    )
    const { courseId: tecnologiaId } = await producerCourses.createCourse(
      producer,
      courseTecnologia(tecnologia!.id, thumbTecnologia.url, checklist.url),
    )
    for (const id of [logicaId, tecnologiaId]) {
      await adminCourses.approve(admin, {}, id, { feedback: 'Aprovado: conteúdo de demonstração.' })
    }
    await db
      .update(courses)
      .set({ isFeatured: true })
      .where(inArray(courses.id, [logicaId, tecnologiaId]))

    console.log('Certificado, cupom e blog...')
    const templates = app.get(CertificateTemplatesService)
    const { id: templateId } = await templates.createTemplate(
      admin.id,
      createTemplateSchema.parse({
        name: 'Certificado Garoto do Programa',
        description: 'Modelo padrão dos cursos do Garoto do Programa.',
      }),
    )
    await templates.saveVersion(admin.id, templateId, { schemaJson: CERTIFICATE_SCHEMA })
    await templates.publishTemplate(admin.id, templateId)
    for (const id of [logicaId, tecnologiaId]) {
      await templates.bindCourseTemplate(admin.id, id, { templateId })
    }

    await app.get(AdminCouponsService).create(
      admin.id,
      couponFormSchema.parse({
        code: 'GAROTO50',
        type: 'percentage',
        value: 50,
        description: 'Cupom de demonstração: 50% no Por Dentro da Tecnologia',
        usageLimit: null,
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        validFrom: new Date(Date.now() - 90 * DAY_MS).toISOString().slice(0, 10),
        applicableCourses: [tecnologiaId],
      }),
    )

    const blog = app.get(BlogService)
    for (const post of BLOG_POSTS) {
      const image = await files.upload(admin, 'blog_featured', asset(post.image, 'image/jpeg'))
      const created = await blog.create(
        blogPostBodySchema.parse({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          tags: post.tags,
          featuredImageUrl: image.url,
          isFeatured: post.daysAgo < 10,
        }),
        admin.id,
        {},
      )
      await blog.publish(created.id, admin.id, {})
      await db.execute(
        sql`update blog_posts set published_at = now() - make_interval(days => ${post.daysAgo}),
            created_at = now() - make_interval(days => ${post.daysAgo}) where id = ${created.id}`,
      )
    }

    console.log('Alunos estudando...')
    const lessonsOf = async (courseId: number) =>
      db
        .select({ id: courseLessons.id, type: courseLessons.type })
        .from(courseLessons)
        .innerJoin(courseModules, eq(courseModules.id, courseLessons.moduleId))
        .where(eq(courseModules.courseId, courseId))
        .orderBy(asc(courseModules.displayOrder), asc(courseLessons.displayOrder))
    const logicaLessons = await lessonsOf(logicaId)
    const tecnologiaLessons = await lessonsOf(tecnologiaId)

    const orders = app.get(OrdersService)
    const payments = app.get(PaymentsService)
    const progress = app.get(ProgressService)
    const quiz = app.get(QuizService)
    const reviews = app.get(ReviewsService)
    const questions = app.get(QuestionsService)
    const notes = app.get(NotesService)
    const producerReviews = app.get(ProducerReviewsService)
    const producerQuestions = app.get(ProducerQuestionsService)

    async function buy(user: SessionUser, courseId: number, couponCode?: string) {
      const created = await orders.createOrder(
        user,
        createOrderSchema.parse({ courseIds: [courseId], couponCode, paymentMethod: 'pix' }),
      )
      if (created.status === 'free_completed') return
      const [order] = await db
        .select({
          externalReference: checkoutOrders.externalReference,
          totalAmount: checkoutOrders.totalAmount,
        })
        .from(checkoutOrders)
        .where(eq(checkoutOrders.publicId, created.order_id))
      await payments.applyPayment(
        {
          id: `fake-${created.order_id}`,
          status: 'approved',
          statusDetail: 'simulated',
          amountCents: Math.round(order!.totalAmount * 100),
          currency: 'BRL',
          externalReference: order!.externalReference,
          paymentTypeId: 'pix',
          lastUpdated: new Date().toISOString(),
        },
        'simulator',
      )
    }

    async function passQuiz(userId: string, lessonId: number) {
      const rows = await db
        .select({ questionId: quizQuestions.id, optionId: quizOptions.id })
        .from(quizQuestions)
        .innerJoin(
          quizOptions,
          and(eq(quizOptions.questionId, quizQuestions.id), eq(quizOptions.isCorrect, true)),
        )
        .where(eq(quizQuestions.lessonId, lessonId))
      await quiz.submit(
        userId,
        lessonId,
        submitQuizSchema.parse({
          finalize: true,
          answers: rows.map((row) => ({
            questionId: row.questionId,
            selectedOptionIds: [row.optionId],
          })),
        }),
      )
    }

    // Relógio da gamificação: cada aluno estuda UMA aula por dia a partir do dia em que chegou,
    // então a sequência de dias, o ranking do mês e o histórico de pontos ficam como de verdade.
    const gamification = app.get(GamificationService)
    const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS)

    /**
     * Assiste às `count` primeiras aulas (o quiz é respondido certo), uma por dia a partir de
     * `fromDaysAgo` (sem passar de hoje). Devolve o dia em que a próxima aula cairia.
     */
    async function study(
      userId: string,
      lessons: { id: number; type: string }[],
      count: number,
      fromDaysAgo: number,
    ): Promise<number> {
      let day = fromDaysAgo
      for (const lesson of lessons.slice(0, count)) {
        const studyDay = day
        gamification.useClock(() => daysAgo(studyDay))
        if (lesson.type === 'quiz') await passQuiz(userId, lesson.id)
        else await progress.completeLesson(userId, lesson.id)
        day = Math.max(0, day - 1)
      }
      return day
    }

    async function review(userId: string, courseId: number) {
      const rating = random.chance(0.65) ? 5 : random.chance(0.8) ? 4 : 3
      const [title, text] = random.pick(REVIEWS[rating]!)
      await reviews.saveReview(
        userId,
        courseId,
        saveReviewSchema.parse({ rating, title, review: text }),
      )
    }

    const students: SessionUser[] = []
    const arrivals: number[] = []
    for (const [index, name] of STUDENT_NAMES.entries()) {
      // Mais gente nas últimas semanas: a curva sobe como num lançamento de verdade.
      const arrivedDaysAgo = Math.floor(60 * Math.pow(random.next(), 1.6))
      arrivals.push(arrivedDaysAgo)
      const slug = name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z]+/g, '.')
      const student = await createUser(
        `${slug}@demo.escola.local`,
        name,
        'student',
        randomBytes(18).toString('base64url'),
      )
      students.push(student)

      await buy(student, logicaId)
      const logicaDone = random.chance(0.45)
        ? logicaLessons.length
        : random.int(1, logicaLessons.length - 1)
      let day = await study(student.id, logicaLessons, logicaDone, arrivedDaysAgo)
      if (logicaDone === logicaLessons.length && random.chance(0.75))
        await review(student.id, logicaId)

      // Quem faz pergunta sobre o curso pago (alunos 3 e 4) precisa ter comprado.
      if (index === 3 || index === 4 || random.chance(0.55)) {
        await buy(student, tecnologiaId, random.chance(0.3) ? 'GAROTO50' : undefined)
        const tecDone = random.chance(0.35)
          ? tecnologiaLessons.length
          : random.int(1, tecnologiaLessons.length - 1)
        day = await study(student.id, tecnologiaLessons, tecDone, day)
        if (tecDone === tecnologiaLessons.length && random.chance(0.8))
          await review(student.id, tecnologiaId)
      }

      if (index < QUESTIONS.length) {
        const onLogica = index < 3
        const courseId = onLogica ? logicaId : tecnologiaId
        const lessonId = (onLogica ? logicaLessons : tecnologiaLessons)[onLogica ? index : 0]!.id
        const { id } = await questions.askQuestion(
          student.id,
          askQuestionSchema.parse({ courseId, lessonId, question: QUESTIONS[index] }),
        )
        if (index !== 2) await producerQuestions.answerQuestion(producer.id, id, ANSWERS[index]!)
      }
    }

    // A conta de demonstração do aluno: um curso concluído (com certificado) e outro pela metade,
    // estudando há 5 dias seguidos (a sequência aparece ativa no painel).
    await buy(demoStudent, logicaId)
    const demoDay = await study(demoStudent.id, logicaLessons, logicaLessons.length, 4)
    await reviews.saveReview(
      demoStudent.id,
      logicaId,
      saveReviewSchema.parse({
        rating: 5,
        title: 'Curso nota 10',
        review: 'Aulas curtas e muito bem explicadas.',
      }),
    )
    await buy(demoStudent, tecnologiaId, 'GAROTO50')
    await study(demoStudent.id, tecnologiaLessons, 3, demoDay)
    gamification.useClock(() => new Date())
    await notes.createNote(
      demoStudent.id,
      createNoteSchema.parse({
        lessonId: tecnologiaLessons[1]!.id,
        courseId: tecnologiaId,
        title: 'Engenharia social',
        content: 'O ataque começou pela paciência, não pelo código. Revisar o xz depois.',
      }),
    )

    // O produtor responde parte das avaliações.
    const someReviews = await db.execute<{ id: string }>(
      sql`select id from course_reviews where user_id <> ${demoStudent.id} order by created_at limit 4`,
    )
    for (const row of someReviews.rows) {
      await producerReviews.replyToReview(
        producer.id,
        row.id,
        'Valeu demais pelo carinho! Bora para o próximo episódio.',
      )
    }

    console.log('Espalhando a atividade pelos últimos 60 dias...')
    await db.execute(sql`
      update courses set created_at = now() - interval '75 days', published_at = now() - interval '70 days'
      where id in (${logicaId}, ${tecnologiaId})`)
    for (const [index, student] of students.entries()) {
      // Pontos, medalhas e sequência já nasceram nas datas certas (relógio da gamificação).
      const days = arrivals[index]!
      const shift = sql`make_interval(days => ${days}, hours => ${index % 12})`
      const id = student.id
      await db.execute(sql`
        with own_enrollments as (select id from ${enrollments} where student_id = ${id}),
             own_orders as (select id from checkout_orders where user_id = ${id}),
             u1 as (update users set created_at = created_at - ${shift}, email_verified_at = email_verified_at - ${shift} where id = ${id}),
             u2 as (update profiles set created_at = created_at - ${shift} where id = ${id}),
             u3 as (update enrollments set created_at = created_at - ${shift}, completed_at = completed_at - ${shift}, last_accessed_at = last_accessed_at - ${shift} where student_id = ${id}),
             u4 as (update lesson_progress set created_at = created_at - ${shift}, completed_at = completed_at - ${shift} where user_id = ${id}),
             u5 as (update quiz_attempts set created_at = created_at - ${shift}, finalized_at = finalized_at - ${shift} where student_id = ${id}),
             u6 as (update certificates set created_at = created_at - ${shift}, issued_at = issued_at - ${shift} where student_id = ${id}),
             u7 as (update certificate_events set created_at = created_at - ${shift}, event_at = event_at - ${shift} where enrollment_id in (select id from own_enrollments)),
             u8 as (update checkout_orders set created_at = created_at - ${shift}, paid_at = paid_at - ${shift}, finalized_at = finalized_at - ${shift} where user_id = ${id}),
             u9 as (update checkout_order_items set created_at = created_at - ${shift} where order_id in (select id from own_orders)),
             u10 as (update payment_events set created_at = created_at - ${shift}, processed_at = processed_at - ${shift} where order_id in (select id from own_orders)),
             u11 as (update transactions set created_at = created_at - ${shift} where enrollment_id in (select id from own_enrollments)),
             u12 as (update course_reviews set created_at = created_at - ${shift} where user_id = ${id}),
             u13 as (update course_questions set created_at = created_at - ${shift}, answered_at = answered_at - ${shift} where user_id = ${id}),
             u14 as (update coupon_usage set used_at = used_at - ${shift} where user_id = ${id})
        select 1`)
    }

    const [{ total }] = (
      await db.execute<{ total: number }>(sql`select count(*)::int as total from certificates`)
    ).rows as [{ total: number }]
    console.log(
      `Demonstração pronta: ${students.length + 1} alunos, ${total} certificados emitidos.`,
    )
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
