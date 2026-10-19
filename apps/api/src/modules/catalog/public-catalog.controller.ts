import { Controller, Get, Inject, Param, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { Public } from '../auth/decorators.js'
import {
  CatalogService,
  type CartCourse,
  type CatalogResult,
  type CategoryOption,
} from './catalog.service.js'
import {
  cartItemsQuerySchema,
  catalogQuerySchema,
  homeCategoriesQuerySchema,
  homeFeaturedQuerySchema,
  idParamSchema,
  relatedQuerySchema,
  reviewsQuerySchema,
  searchQuerySchema,
  slugParamSchema,
  statsQuerySchema,
  type CatalogQuery,
  type SearchQuery,
} from './catalog.schemas.js'
import {
  CourseDetailService,
  type CourseDetailPublic,
  type CourseReviewPublic,
  type RelatedCoursePublic,
  type ReviewStatsPublic,
} from './course-detail.service.js'
import {
  HomeService,
  type CategoryWithCount,
  type FeaturedCourse,
  type HeroStats,
} from './home.service.js'
import { InstructorsService, type InstructorPublicProfile } from './instructors.service.js'
import { SearchService, type SearchResult, type SearchStats } from './search.service.js'

const slugPipe = new ZodValidationPipe(slugParamSchema)
const idPipe = new ZodValidationPipe(idParamSchema)

/** Busca é a consulta mais cara da vitrine: limite por IP mais apertado que o padrão. */
const SEARCH_THROTTLE = { default: { limit: 30, ttl: 60_000 } } as const

/**
 * Vitrine pública (catálogo, detalhe do curso, instrutor, home, carrinho e busca).
 * Só leitura e sem login. Toda resposta usa campos escolhidos a dedo (`select` explícito nos
 * services): nada de conteúdo de aula paga, gabarito de quiz, e-mail ou dado pessoal.
 */
@Public()
@Controller('public')
export class PublicCatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(CourseDetailService) private readonly details: CourseDetailService,
    @Inject(InstructorsService) private readonly instructors: InstructorsService,
    @Inject(HomeService) private readonly home: HomeService,
    @Inject(SearchService) private readonly search: SearchService,
  ) {}

  // ----- Catálogo -----

  @Get('catalog/courses')
  listCourses(
    @Query(new ZodValidationPipe(catalogQuerySchema)) query: CatalogQuery,
  ): Promise<CatalogResult> {
    return this.catalog.listCourses(query)
  }

  @Get('catalog/categories')
  listCategories(): Promise<CategoryOption[]> {
    return this.catalog.listCategoryOptions()
  }

  // ----- Detalhe do curso -----

  @Get('catalog/courses/:slug')
  getCourse(@Param('slug', slugPipe) slug: string): Promise<CourseDetailPublic> {
    return this.details.getCourseBySlug(slug)
  }

  @Get('catalog/courses/:id/reviews')
  getReviews(
    @Param('id', idPipe) id: number,
    @Query(new ZodValidationPipe(reviewsQuerySchema)) query: { limit: number },
  ): Promise<CourseReviewPublic[]> {
    return this.details.getReviews(id, query.limit)
  }

  @Get('catalog/courses/:id/reviews/stats')
  getReviewStats(@Param('id', idPipe) id: number): Promise<ReviewStatsPublic> {
    return this.details.getReviewStats(id)
  }

  @Get('catalog/courses/:id/related')
  getRelated(
    @Param('id', idPipe) id: number,
    @Query(new ZodValidationPipe(relatedQuerySchema)) query: { limit: number },
  ): Promise<RelatedCoursePublic[]> {
    return this.details.getRelatedCourses(id, query.limit)
  }

  // ----- Instrutor -----

  @Get('instructors/:slug')
  getInstructor(@Param('slug', slugPipe) slug: string): Promise<InstructorPublicProfile> {
    return this.instructors.getPublicProfileBySlug(slug)
  }

  // ----- Home -----

  @Get('home/hero-stats')
  getHeroStats(): Promise<HeroStats> {
    return this.home.getHeroStats()
  }

  @Get('home/featured-courses')
  getFeatured(
    @Query(new ZodValidationPipe(homeFeaturedQuerySchema)) query: { limit: number },
  ): Promise<FeaturedCourse[]> {
    return this.home.getFeaturedCourses(query.limit)
  }

  @Get('home/popular-categories')
  getPopularCategories(
    @Query(new ZodValidationPipe(homeCategoriesQuerySchema)) query: { limit: number },
  ): Promise<CategoryWithCount[]> {
    return this.home.getPopularCategories(query.limit)
  }

  // ----- Carrinho -----

  /** Preço e dados ATUAIS dos cursos do carrinho (o cookie do carrinho não é fonte de verdade). */
  @Get('cart/items')
  getCartItems(
    @Query(new ZodValidationPipe(cartItemsQuerySchema)) query: { ids: number[] },
  ): Promise<CartCourse[]> {
    return this.catalog.getCartCourses(query.ids)
  }

  // ----- Busca -----

  @Get('search')
  @Throttle(SEARCH_THROTTLE)
  searchAll(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
  ): Promise<SearchResult[]> {
    return this.search.search(query)
  }

  @Get('search/stats')
  @Throttle(SEARCH_THROTTLE)
  searchStats(
    @Query(new ZodValidationPipe(statsQuerySchema)) query: { q: string },
  ): Promise<SearchStats> {
    return this.search.getStats(query.q)
  }

  @Get('search/suggestions')
  @Throttle(SEARCH_THROTTLE)
  searchSuggestions(
    @Query(new ZodValidationPipe(statsQuerySchema)) query: { q: string },
  ): Promise<string[]> {
    return this.search.getSuggestions(query.q)
  }
}
