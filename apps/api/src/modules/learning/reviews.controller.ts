import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Put,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser } from '../auth/decorators.js'
import { idSchema, saveReviewSchema, type SaveReviewInput } from './learning.schemas.js'
import { ReviewsService } from './reviews.service.js'

/** Avaliação do curso pelo próprio aluno (a leitura pública das avaliações é do catálogo). */
@Controller('learning/courses/:courseId/review')
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviews: ReviewsService) {}

  @Get()
  async getMine(
    @CurrentUser() user: SessionUser,
    @Param('courseId', new ZodValidationPipe(idSchema)) courseId: number,
  ) {
    return { review: await this.reviews.getMyReview(user.id, courseId) }
  }

  /** Cria ou atualiza a avaliação (uma por matrícula). Só depois de concluir o curso. */
  @Put()
  save(
    @CurrentUser() user: SessionUser,
    @Param('courseId', new ZodValidationPipe(idSchema)) courseId: number,
    @Body(new ZodValidationPipe(saveReviewSchema)) body: SaveReviewInput,
  ) {
    return this.reviews.saveReview(user.id, courseId, body)
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: SessionUser,
    @Param('courseId', new ZodValidationPipe(idSchema)) courseId: number,
  ) {
    return this.reviews.deleteMyReview(user.id, courseId)
  }
}
