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
import { CurrentUser, Roles } from '../auth/decorators.js'
import {
  couponCodeQuerySchema,
  couponFormSchema,
  couponIdSchema,
  couponListQuerySchema,
  type CouponFormInput,
  type CouponListQuery,
} from './admin-coupons.schemas.js'
import { AdminCouponsService, type AdminCoupon } from './admin-coupons.service.js'

const idPipe = new ZodValidationPipe(couponIdSchema)

/** Gestão de cupons: só admin (a autorização é feita aqui no servidor, pelo papel da sessão). */
@Roles(['admin'])
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(@Inject(AdminCouponsService) private readonly coupons: AdminCouponsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(couponListQuerySchema)) query: CouponListQuery,
  ): Promise<AdminCoupon[]> {
    return this.coupons.list(query)
  }

  @Get('stats')
  stats() {
    return this.coupons.stats()
  }

  @Get('course-options')
  courseOptions() {
    return this.coupons.courseOptions()
  }

  @Get('code-available')
  async codeAvailable(
    @Query(new ZodValidationPipe(couponCodeQuerySchema))
    query: {
      code: string
      exceptId?: number
    },
  ): Promise<{ available: boolean }> {
    return { available: await this.coupons.isCodeAvailable(query.code, query.exceptId) }
  }

  @Get(':id')
  get(@Param('id', idPipe) id: number): Promise<AdminCoupon> {
    return this.coupons.get(id)
  }

  @Get(':id/usage')
  usage(@Param('id', idPipe) id: number) {
    return this.coupons.usage(id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() admin: SessionUser,
    @Body(new ZodValidationPipe(couponFormSchema)) body: CouponFormInput,
  ): Promise<AdminCoupon> {
    return this.coupons.create(admin.id, body)
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: SessionUser,
    @Param('id', idPipe) id: number,
    @Body(new ZodValidationPipe(couponFormSchema)) body: CouponFormInput,
  ): Promise<AdminCoupon> {
    return this.coupons.update(admin.id, id, body)
  }

  @Post(':id/toggle')
  @HttpCode(HttpStatus.OK)
  toggle(@CurrentUser() admin: SessionUser, @Param('id', idPipe) id: number): Promise<AdminCoupon> {
    return this.coupons.toggle(admin.id, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() admin: SessionUser, @Param('id', idPipe) id: number): Promise<void> {
    await this.coupons.remove(admin.id, id)
  }
}
