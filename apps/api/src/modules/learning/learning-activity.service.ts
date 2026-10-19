import { Injectable, Logger } from '@nestjs/common'

/**
 * Avisos do que o aluno fez estudando (aula concluída, quiz aprovado, avaliação, pergunta). É o
 * ponto de extensão da GAMIFICAÇÃO, no mesmo modelo de `CourseCompletionService`: o módulo
 * `gamification` escuta isto e o `learning` não o conhece. Sempre emitido DEPOIS do commit, e
 * falha de quem escuta nunca desfaz nem quebra o que o aluno fez.
 */
export type LearningActivity =
  | { type: 'lesson_completed'; userId: string; courseId: number; lessonId: number }
  | { type: 'quiz_passed'; userId: string; courseId: number; lessonId: number; perfect: boolean }
  | { type: 'review_saved'; userId: string; courseId: number }
  | { type: 'question_asked'; userId: string; courseId: number; questionId: string }

export type LearningActivityListener = (activity: LearningActivity) => Promise<void> | void

@Injectable()
export class LearningActivityService {
  private readonly logger = new Logger(LearningActivityService.name)
  private readonly listeners: LearningActivityListener[] = []

  onActivity(listener: LearningActivityListener): void {
    this.listeners.push(listener)
  }

  async emit(...activities: LearningActivity[]): Promise<void> {
    for (const activity of activities) {
      for (const listener of this.listeners) {
        try {
          await listener(activity)
        } catch (error) {
          this.logger.error(
            `Falha ao processar ${activity.type} (usuário ${activity.userId}): ${error instanceof Error ? error.message : 'erro desconhecido'}`,
          )
        }
      }
    }
  }
}
