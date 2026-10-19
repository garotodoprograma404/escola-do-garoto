// =====================================================
// STUDENT COURSE CARD - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { Clock, BookOpen, Award, Play } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import type { StudentCourse } from '../types'

interface CourseCardProps {
  course: StudentCourse
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0min'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

export function CourseCard({ course }: CourseCardProps) {
  const levelColors = {
    beginner: 'bg-green-500/10 text-green-700 dark:text-green-400',
    intermediate: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    advanced: 'bg-red-500/10 text-red-700 dark:text-red-400',
  }

  const levelLabels = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
  }
  const watchedMinutes = Math.round(course.watchedDurationMinutes)

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="h-16 w-16 text-muted-foreground" />
          </div>
        )}

        {/* Progress Badge */}
        {course.isCompleted ? (
          <div className="absolute right-3 top-3 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <Award className="mr-1 inline h-3 w-3" />
            Concluído
          </div>
        ) : (
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {course.progressPercentage}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {/* Category & Level */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[11px] sm:text-xs">
            {course.categoryName}
          </Badge>
          <Badge className={`text-[11px] sm:text-xs ${levelColors[course.level]}`}>
            {levelLabels[course.level]}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-tight sm:text-lg">
          {course.title}
        </h3>

        {/* Producer */}
        <div className="mb-4 flex items-center gap-2">
          <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
            <AvatarImage src={course.producerAvatar || undefined} />
            <AvatarFallback className="text-[10px] sm:text-xs">
              {course.producerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground sm:text-sm">{course.producerName}</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{course.progressPercentage}%</span>
          </div>
          <Progress value={course.progressPercentage} className="h-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            {course.completedLessons} de {course.totalLessons} aulas concluídas
          </p>
        </div>

        {/* Meta Info */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{course.totalLessons} aulas</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {formatDuration(watchedMinutes)} de {formatDuration(course.totalDurationMinutes)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button asChild className="w-full">
            <Link href={`/student/courses/${course.slug}/player`}>
              <Play className="mr-2 h-4 w-4" />
              {course.isCompleted
                ? 'Revisar'
                : course.progressPercentage > 0
                  ? 'Continuar'
                  : 'Começar'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
