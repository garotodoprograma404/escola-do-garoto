// =====================================================
// TARGET AUDIENCE - SERVER COMPONENT
// =====================================================

import { Card, CardContent } from '@/shared/components/ui/card'

interface TargetAudienceProps {
  items: string[]
}

export function TargetAudience({ items }: TargetAudienceProps) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <section>
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-8">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
            Para quem é este curso
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-300">
            {items.map((item, index) => (
              <li key={index} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}
