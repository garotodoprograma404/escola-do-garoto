import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  calculateStudentCoursesStats,
  getStudentCourses,
  StatsCards,
} from '@/features/student/courses'
import { GamificationCard, getGamificationSummary } from '@/features/student/gamification'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { BookOpen, Compass, LifeBuoy, Megaphone, PlayCircle } from 'lucide-react'
import { measureOperation } from '@/shared/lib/observability'

export const metadata = {
  title: 'Início',
  description: 'Acompanhe seu progresso e continue aprendendo',
}

export default async function StudentDashboardPage() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  const firstName = authContext.profile?.full_name?.split(' ')[0] || 'Aluno'
  const affiliateHref = authContext.roles.includes('affiliate')
    ? '/affiliate'
    : '/minha-conta/afiliado'
  const affiliateTitle = authContext.roles.includes('affiliate')
    ? 'Área de afiliado'
    : 'Programa de Afiliados'
  const affiliateDescription = authContext.roles.includes('affiliate')
    ? 'Acesse seu painel para acompanhar links, campanhas e comissões.'
    : 'Candidate-se pelo seu painel e acompanhe a evolução do seu acesso.'

  const [courses, gamification] = await Promise.all([
    measureOperation(
      'route.student.dashboard.courses',
      () => getStudentCourses(authContext.userId),
      { route: '/student' },
    ),
    getGamificationSummary(),
  ])
  const stats = calculateStudentCoursesStats(courses)

  const prioritizedCourses = [...courses]
    .sort((a, b) => {
      const dateA = new Date(a.lastAccessedAt || a.enrolledAt).getTime()
      const dateB = new Date(b.lastAccessedAt || b.enrolledAt).getTime()
      return dateB - dateA
    })
    .filter((course) => !course.isCompleted)

  const nextCourse = prioritizedCourses[0] || courses[0] || null
  const progressSnapshot = [...courses]
    .sort((a, b) => b.progressPercentage - a.progressPercentage)
    .slice(0, 3)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}, {firstName}!
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
          Continue sua jornada de aprendizado
        </p>
      </div>

      <StatsCards stats={stats} />

      {gamification ? <GamificationCard summary={gamification} /> : null}

      <Card>
        <CardContent className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              {courses.length > 0
                ? 'Tudo pronto para continuar seus estudos'
                : 'Bem-vindo(a)! Vamos começar sua jornada'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {courses.length > 0
                ? 'Acesse rapidamente seus cursos ou continue de onde parou.'
                : 'Você ainda não está matriculado. Escolha um curso no catálogo para começar.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {nextCourse ? (
              <Button asChild>
                <Link href={`/student/courses/${nextCourse.slug}/player`}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Continuar agora
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/catalogo">
                  <Compass className="mr-2 h-4 w-4" />
                  Explorar catálogo
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/student/courses">Meus cursos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-muted-foreground">Catálogo</p>
            <p className="text-sm text-muted-foreground">
              Encontre cursos para comprar ou gratuitos.
            </p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/catalogo">Ver cursos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-muted-foreground">Meus Cursos</p>
            <p className="text-sm text-muted-foreground">
              Acesse sua biblioteca com filtros e progresso.
            </p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/student/courses">Abrir biblioteca</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-muted-foreground">Suporte</p>
            <p className="text-sm text-muted-foreground">Precisa de ajuda? Fale com nosso time.</p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/student/support">
                <LifeBuoy className="mr-2 h-4 w-4" />
                Abrir suporte
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-muted-foreground">{affiliateTitle}</p>
            <p className="text-sm text-muted-foreground">{affiliateDescription}</p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={affiliateHref}>
                <Megaphone className="mr-2 h-4 w-4" />
                {authContext.roles.includes('affiliate')
                  ? 'Abrir dashboard'
                  : 'Quero indicar cursos'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {progressSnapshot.length > 0 ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-semibold">Resumo rápido do progresso</h2>
              <p className="text-sm text-muted-foreground">Seus cursos com maior avanço</p>
            </div>

            <div className="space-y-3">
              {progressSnapshot.map((course) => (
                <div key={course.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.completedLessons} de {course.totalLessons} aulas concluídas
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{course.progressPercentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Nenhum curso em andamento</h3>
              <p className="text-sm text-muted-foreground">
                Matricule-se em um curso para acompanhar seu progresso aqui.
              </p>
            </div>
            <Button asChild>
              <Link href="/catalogo">Ir para catálogo</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
