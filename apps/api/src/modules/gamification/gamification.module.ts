import { Inject, Module, type OnModuleInit } from '@nestjs/common'
import { CourseCompletionService } from '../learning/course-completion.service.js'
import { LearningActivityService } from '../learning/learning-activity.service.js'
import { LearningModule } from '../learning/learning.module.js'
import {
  ProducerGamificationController,
  StudentGamificationController,
} from './gamification.controller.js'
import { GamificationService } from './gamification.service.js'

/**
 * Gamificação: escuta os avisos do `learning` (aula concluída, quiz aprovado, avaliação,
 * pergunta e curso concluído) e transforma em pontos, nível, sequência e medalhas. Veja
 * `gamification.rules.ts` e `docs/areas/aluno.md`.
 */
@Module({
  imports: [LearningModule],
  controllers: [StudentGamificationController, ProducerGamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule implements OnModuleInit {
  constructor(
    @Inject(LearningActivityService) private readonly activity: LearningActivityService,
    @Inject(CourseCompletionService) private readonly completion: CourseCompletionService,
    @Inject(GamificationService) private readonly gamification: GamificationService,
  ) {}

  onModuleInit() {
    this.activity.onActivity((activity) => this.gamification.handleActivity(activity))
    this.completion.onCourseCompleted((event) => this.gamification.handleCourseCompleted(event))
  }
}
