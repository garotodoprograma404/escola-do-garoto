// =====================================================
// COURSE OVERVIEW - SERVER COMPONENT
// =====================================================

import { Card, CardContent } from '@/shared/components/ui/card'

interface CourseOverviewProps {
  fullDescription: string
}

export function CourseOverview({ fullDescription }: CourseOverviewProps) {
  const normalizedFullDescription = fullDescription.trim()

  if (!normalizedFullDescription) {
    return null
  }

  return (
    <section>
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="space-y-4 p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sobre este curso</h2>
          <p className="whitespace-pre-line break-words text-base leading-relaxed text-slate-700 dark:text-slate-300">
            {normalizedFullDescription}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
