// =====================================================
// WHAT YOU WILL LEARN - SERVER COMPONENT
// =====================================================

import { CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'

interface WhatYouWillLearnProps {
  items: string[]
}

export function WhatYouWillLearn({ items }: WhatYouWillLearnProps) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <section>
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-8">
          <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
            O que você vai aprender
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
