import { redirect } from 'next/navigation'
import { Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { getStudentCourses } from '@/features/student/courses'
import {
  BadgeGrid,
  CourseRanking,
  GamificationCard,
  XpHistory,
  getCourseRanking,
  getGamificationSummary,
} from '@/features/student/gamification'

export const metadata = {
  title: 'Minhas conquistas',
  description: 'Seu nível, medalhas, sequência de estudos e ranking dos cursos',
}

export default async function StudentAchievementsPage() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) redirect('/login')

  const [summary, courses] = await Promise.all([
    getGamificationSummary(),
    getStudentCourses(authContext.userId),
  ])
  const rankingCourses = courses.map((course) => ({ id: course.id, title: course.title }))
  const initialRanking = rankingCourses[0] ? await getCourseRanking(rankingCourses[0].id) : null
  const earnedCount = summary?.badges.filter((badge) => badge.earnedAt).length ?? 0

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Minhas conquistas</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 sm:mt-2 sm:text-base">
          Cada aula concluída vale pontos. Estude todo dia para manter a sequência{' '}
          <Flame aria-hidden="true" className="inline h-4 w-4 text-orange-500" />
        </p>
      </div>

      {summary ? (
        <>
          <GamificationCard summary={summary} />

          <Card>
            <CardHeader>
              <CardTitle>
                Medalhas ({earnedCount} de {summary.badges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeGrid badges={summary.badges} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ranking do mês</CardTitle>
              </CardHeader>
              <CardContent>
                <CourseRanking
                  courses={rankingCourses}
                  initialRanking={initialRanking}
                  rankingVisible={summary.rankingVisible}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Últimos pontos</CardTitle>
              </CardHeader>
              <CardContent>
                <XpHistory events={summary.recentEvents} />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          Não foi possível carregar suas conquistas agora. Tente de novo em instantes.
        </p>
      )}
    </div>
  )
}
