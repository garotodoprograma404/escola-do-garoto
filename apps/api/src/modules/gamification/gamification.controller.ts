import { Body, Controller, Get, Inject, Param, Put, Query } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import { GamificationService } from './gamification.service.js'
import {
  courseIdParamSchema,
  engagementQuerySchema,
  rankingVisibilitySchema,
  type RankingVisibilityInput,
} from './gamification.schemas.js'

/** Conquistas do próprio aluno: sempre pelo usuário da sessão, nunca por id vindo de fora. */
@Controller('student/gamification')
export class StudentGamificationController {
  constructor(@Inject(GamificationService) private readonly gamification: GamificationService) {}

  @Get()
  summary(@CurrentUser() user: SessionUser) {
    return this.gamification.getSummary(user.id)
  }

  /** Ranking do mês de um curso em que a pessoa está matriculada (403 se não estiver). */
  @Get('ranking/:courseId')
  ranking(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(courseIdParamSchema)) params: { courseId: number },
  ) {
    return this.gamification.getCourseRanking(user.id, params.courseId)
  }

  @Put('ranking-visibility')
  setRankingVisibility(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(rankingVisibilitySchema)) body: RankingVisibilityInput,
  ) {
    return this.gamification.setRankingVisibility(user.id, body.visible)
  }
}

/** Engajamento dos alunos nos cursos do PRÓPRIO produtor. */
@Controller('producer/gamification')
@Roles(['producer'])
export class ProducerGamificationController {
  constructor(@Inject(GamificationService) private readonly gamification: GamificationService) {}

  @Get('engagement')
  engagement(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(engagementQuerySchema)) query: { courseId?: number },
  ) {
    return this.gamification.getProducerEngagement(user.id, query.courseId)
  }
}
