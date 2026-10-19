import { Module } from '@nestjs/common'
import { CourseCompletionService } from './course-completion.service.js'
import { LearningAccessService } from './learning-access.service.js'
import { LearningActivityService } from './learning-activity.service.js'
import { NotesController } from './notes.controller.js'
import { NotesService } from './notes.service.js'
import { PlayerController } from './player.controller.js'
import { PlayerService } from './player.service.js'
import { ProgressService } from './progress.service.js'
import { QuestionsController } from './questions.controller.js'
import { QuestionsService } from './questions.service.js'
import { QuizService } from './quiz.service.js'
import { ReviewsController } from './reviews.controller.js'
import { ReviewsService } from './reviews.service.js'

/**
 * Módulo `learning`: o aluno estudando (player, progresso, quiz, notas, perguntas, avaliação).
 *
 * Pontos de extensão: `CourseCompletionService` (certificado) e `LearningActivityService`
 * (gamificação).
 * O módulo de certificados importa `LearningModule` e registra um ouvinte; o `learning` não
 * conhece certificados.
 */
@Module({
  controllers: [PlayerController, NotesController, QuestionsController, ReviewsController],
  providers: [
    CourseCompletionService,
    LearningActivityService,
    LearningAccessService,
    ProgressService,
    PlayerService,
    QuizService,
    NotesService,
    QuestionsService,
    ReviewsService,
  ],
  exports: [
    CourseCompletionService,
    LearningActivityService,
    LearningAccessService,
    ProgressService,
  ],
})
export class LearningModule {}
