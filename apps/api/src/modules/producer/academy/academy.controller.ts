import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { z } from 'zod'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../../auth/decorators.js'
import { ACADEMY_CATEGORIES, ACADEMY_DIFFICULTIES, AcademyService } from './academy.service.js'

const academyQuerySchema = z.object({
  category: z.enum(ACADEMY_CATEGORIES).optional(),
  difficulty: z.enum(ACADEMY_DIFFICULTIES).optional(),
})
const contentParamsSchema = z.object({ id: z.uuid({ error: 'Conteúdo inválido' }) })

/** Academia do produtor: leitura do conteúdo publicado + o progresso de quem está logado. */
@Controller('producer/academy')
@Roles(['producer'])
export class AcademyController {
  constructor(@Inject(AcademyService) private readonly academy: AcademyService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(academyQuerySchema)) query: z.infer<typeof academyQuerySchema>,
  ) {
    return this.academy.getContents(user.id, query)
  }

  @Get(':id')
  get(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(contentParamsSchema)) params: z.infer<typeof contentParamsSchema>,
  ) {
    return this.academy.getContent(user.id, params.id)
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: SessionUser,
    @Param(new ZodValidationPipe(contentParamsSchema)) params: z.infer<typeof contentParamsSchema>,
  ) {
    return this.academy.markComplete(user.id, params.id)
  }
}
