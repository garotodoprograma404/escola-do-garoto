import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { z } from 'zod'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../../auth/decorators.js'
import { REVIEW_FILTERS, ReviewsService } from './reviews.service.js'

const reviewsQuerySchema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  filter: z.enum(REVIEW_FILTERS).default('all'),
})
const reviewParamsSchema = z.object({ id: z.uuid({ error: 'Avaliação inválida' }) })
const replyBodySchema = z.object({
  response: z
    .string({ error: 'Escreva a resposta' })
    .trim()
    .min(10, 'A resposta deve ter pelo menos 10 caracteres')
    .max(2000, 'A resposta deve ter no máximo 2000 caracteres'),
})

@Controller('producer/reviews')
@Roles(['producer'])
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(reviewsQuerySchema)) query: z.infer<typeof reviewsQuerySchema>,
  ) {
    return this.reviews.getReviews(user.id, query)
  }

  @Post(':id/reply')
  reply(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(reviewParamsSchema)) params: z.infer<typeof reviewParamsSchema>,
    @Body(new ZodValidationPipe(replyBodySchema)) body: z.infer<typeof replyBodySchema>,
  ) {
    return this.reviews.replyToReview(user.id, params.id, body.response)
  }
}
