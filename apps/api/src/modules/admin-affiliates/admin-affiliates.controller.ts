import { Body, Controller, Get, Inject, Param, Post, Put, Req } from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import { clientIp } from '../auth/throttling.js'
import {
  idParamSchema,
  reviewApplicationSchema,
  reviewPartnershipSchema,
  upsertPartnershipSchema,
  type ReviewApplicationInput,
  type ReviewPartnershipInput,
  type UpsertPartnershipInput,
} from './admin-affiliates.schemas.js'
import { AdminAffiliatesService, type AdminClient } from './admin-affiliates.service.js'

function clientOf(req: Request): AdminClient {
  return { ipAddress: clientIp(req), userAgent: req.get('user-agent') }
}

/** Administração de afiliados: candidaturas, parcerias e auditoria de vendas. Só admin. */
@Controller('admin/affiliates')
@Roles(['admin'])
export class AdminAffiliatesController {
  constructor(
    @Inject(AdminAffiliatesService) private readonly affiliates: AdminAffiliatesService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.affiliates.getDashboard()
  }

  @Post('applications/:id/review')
  reviewApplication(
    @CurrentUser() admin: SessionUser,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: number,
    @Body(new ZodValidationPipe(reviewApplicationSchema)) body: ReviewApplicationInput,
    @Req() req: Request,
  ) {
    return this.affiliates.reviewApplication(admin, id, body, clientOf(req))
  }

  @Put('partnerships')
  upsertPartnership(
    @CurrentUser() admin: SessionUser,
    @Body(new ZodValidationPipe(upsertPartnershipSchema)) body: UpsertPartnershipInput,
    @Req() req: Request,
  ) {
    return this.affiliates.upsertPartnership(admin, body, clientOf(req))
  }

  @Post('partnerships/:id/review')
  reviewPartnership(
    @CurrentUser() admin: SessionUser,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: number,
    @Body(new ZodValidationPipe(reviewPartnershipSchema)) body: ReviewPartnershipInput,
    @Req() req: Request,
  ) {
    return this.affiliates.reviewPartnership(admin, id, body, clientOf(req))
  }
}
