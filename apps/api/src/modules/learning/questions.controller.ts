import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser } from '../auth/decorators.js'
import {
  askQuestionSchema,
  idSchema,
  lessonQuestionsQuerySchema,
  listQuestionsQuerySchema,
  updateQuestionSchema,
  uuidSchema,
  type AskQuestionInput,
  type LessonQuestionsQuery,
  type ListQuestionsQuery,
  type UpdateQuestionInput,
} from './learning.schemas.js'
import { QuestionsService } from './questions.service.js'

/** Perguntas do aluno ao produtor (dúvidas por aula). */
@Controller('learning')
export class QuestionsController {
  constructor(@Inject(QuestionsService) private readonly questions: QuestionsService) {}

  /** "Minhas perguntas": só as do aluno logado. */
  @Get('questions')
  listMine(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(listQuestionsQuerySchema)) query: ListQuestionsQuery,
  ) {
    return this.questions.listMyQuestions(user.id, query)
  }

  @Get('questions/courses')
  listMyCourses(@CurrentUser() user: SessionUser) {
    return this.questions.listMyQuestionCourses(user.id)
  }

  @Post('questions')
  ask(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(askQuestionSchema)) body: AskQuestionInput,
  ) {
    return this.questions.askQuestion(user.id, body)
  }

  @Patch('questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @CurrentUser() user: SessionUser,
    @Param('questionId', new ZodValidationPipe(uuidSchema)) questionId: string,
    @Body(new ZodValidationPipe(updateQuestionSchema)) body: UpdateQuestionInput,
  ) {
    return this.questions.updateQuestion(user.id, questionId, body)
  }

  @Delete('questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: SessionUser,
    @Param('questionId', new ZodValidationPipe(uuidSchema)) questionId: string,
  ) {
    return this.questions.deleteQuestion(user.id, questionId)
  }

  /** Perguntas da aula (próprias + públicas), para quem está matriculado no curso. */
  @Get('courses/:courseId/lessons/:lessonId/questions')
  listForLesson(
    @CurrentUser() user: SessionUser,
    @Param('courseId', new ZodValidationPipe(idSchema)) courseId: number,
    @Param('lessonId', new ZodValidationPipe(idSchema)) lessonId: number,
    @Query(new ZodValidationPipe(lessonQuestionsQuerySchema)) query: LessonQuestionsQuery,
  ) {
    return this.questions.listLessonQuestions(user.id, courseId, lessonId, query)
  }
}
