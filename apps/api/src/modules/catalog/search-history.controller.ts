import { Body, Controller, Get, HttpCode, Inject, Post, Query } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser } from '../auth/decorators.js'
import { historyQuerySchema, saveHistorySchema, type SaveHistoryInput } from './catalog.schemas.js'
import { SearchService } from './search.service.js'

/**
 * Histórico de busca: só para quem está logado, e sempre o da PRÓPRIA pessoa. O id do dono vem da
 * sessão (não há parâmetro de usuário), então ninguém lê nem grava o histórico de outra conta.
 */
@Controller('search/history')
export class SearchHistoryController {
  constructor(@Inject(SearchService) private readonly search: SearchService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(historyQuerySchema)) query: { limit: number },
  ): Promise<string[]> {
    return this.search.getHistory(user.id, query.limit)
  }

  @Post()
  @HttpCode(200)
  async save(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(saveHistorySchema)) body: SaveHistoryInput,
  ): Promise<{ success: true }> {
    await this.search.saveHistory(user.id, body.query)
    return { success: true }
  }
}
