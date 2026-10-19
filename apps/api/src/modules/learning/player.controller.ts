import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { z } from 'zod'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Public } from '../auth/decorators.js'
import {
  idSchema,
  quizLoadQuerySchema,
  saveProgressSchema,
  submitQuizSchema,
  type SaveProgressInput,
  type SubmitQuizInput,
} from './learning.schemas.js'
import { PlayerService } from './player.service.js'
import { ProgressService } from './progress.service.js'
import { QuizService } from './quiz.service.js'

const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/, 'Curso inválido')

/** Player do aluno: conteúdo do curso, progresso e quiz. Toda rota exige login (menos a prévia gratuita). */
@Controller('learning')
export class PlayerController {
  constructor(
    @Inject(PlayerService) private readonly player: PlayerService,
    @Inject(ProgressService) private readonly progress: ProgressService,
    @Inject(QuizService) private readonly quiz: QuizService,
  ) {}

  /** Curso + módulos/aulas publicados + progresso. Só para matrícula ativa ou concluída. */
  @Get('courses/:slug/player')
  getPlayerData(
    @CurrentUser() user: SessionUser,
    @Param('slug', new ZodValidationPipe(slugSchema)) slug: string,
  ) {
    return this.player.getCoursePlayerData(user.id, slug)
  }

  /** Aula gratuita (prévia): aberta, sem login nem matrícula. Só devolve aula marcada como prévia. */
  @Public()
  @Get('preview/lessons/:lessonId')
  getFreePreviewLesson(@Param('lessonId', new ZodValidationPipe(idSchema)) lessonId: number) {
    return this.player.getFreePreviewLesson(lessonId)
  }

  /** Tempo assistido (e, opcionalmente, conclusão da aula). O percentual do curso é calculado aqui. */
  @Put('lessons/:lessonId/progress')
  saveProgress(
    @CurrentUser() user: SessionUser,
    @Param('lessonId', new ZodValidationPipe(idSchema)) lessonId: number,
    @Body(new ZodValidationPipe(saveProgressSchema)) body: SaveProgressInput,
  ) {
    return this.progress.saveProgress(user.id, lessonId, body)
  }

  @Post('lessons/:lessonId/complete')
  @HttpCode(HttpStatus.OK)
  completeLesson(
    @CurrentUser() user: SessionUser,
    @Param('lessonId', new ZodValidationPipe(idSchema)) lessonId: number,
  ) {
    return this.progress.completeLesson(user.id, lessonId)
  }

  /** Quiz da aula, SEM gabarito (nenhuma alternativa diz se é a correta). */
  @Get('lessons/:lessonId/quiz')
  loadQuiz(
    @CurrentUser() user: SessionUser,
    @Param('lessonId', new ZodValidationPipe(idSchema)) lessonId: number,
    @Query(new ZodValidationPipe(quizLoadQuerySchema)) query: { courseId: number },
  ) {
    return this.quiz.loadQuiz(user.id, query.courseId, lessonId)
  }

  /** Corrige o quiz (uma pergunta, `finalize: false`, ou o quiz inteiro, `finalize: true`). */
  @Post('lessons/:lessonId/quiz/attempts')
  @HttpCode(HttpStatus.OK)
  submitQuiz(
    @CurrentUser() user: SessionUser,
    @Param('lessonId', new ZodValidationPipe(idSchema)) lessonId: number,
    @Body(new ZodValidationPipe(submitQuizSchema)) body: SubmitQuizInput,
  ) {
    return this.quiz.submit(user.id, lessonId, body)
  }
}
