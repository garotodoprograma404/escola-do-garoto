import { Card } from '@/shared/components/ui/card'

export default function PlayerLoading() {
  return (
    <div className="flex h-[calc(100dvh-var(--demo-bar,0px))] min-h-[calc(100vh-var(--demo-bar,0px))] flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 lg:p-6 xl:px-8">
          <Card className="aspect-video w-full animate-pulse bg-muted" />
          <Card className="mt-6 h-56 animate-pulse bg-muted" />
        </div>

        <aside className="hidden w-[24rem] shrink-0 border-l bg-card lg:block xl:w-[28rem]">
          <div className="space-y-3 p-4">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded bg-muted" />
          </div>
        </aside>
      </div>
    </div>
  )
}
