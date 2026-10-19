import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { z } from 'zod'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../../auth/decorators.js'
import { QUESTION_FILTERS, QuestionsService } from './questions.service.js'

const questionsQuerySchema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  filter: z.enum(QUESTION_FILTERS).default('all'),
})
const questionParamsSchema = z.object({ id: z.uuid({ error: 'Pergunta inválida' }) })
const answerBodySchema = z.object({
  answer: z
    .string({ error: 'Escreva a resposta' })
    .trim()
    .min(10, 'A resposta deve ter pelo menos 10 caracteres')
    .max(5000, 'A resposta deve ter no máximo 5000 caracteres'),
})

@Controller('producer/questions')
@Roles(['producer'])
export class QuestionsController {
  constructor(@Inject(QuestionsService) private readonly questions: QuestionsService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(questionsQuerySchema)) query: z.infer<typeof questionsQuerySchema>,
  ) {
    return this.questions.getQuestions(user.id, query)
  }

  @Post(':id/answer')
  answer(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(questionParamsSchema))
    params: z.infer<typeof questionParamsSchema>,
    @Body(new ZodValidationPipe(answerBodySchema)) body: z.infer<typeof answerBodySchema>,
  ) {
    return this.questions.answerQuestion(user.id, params.id, body.answer)
  }
}
