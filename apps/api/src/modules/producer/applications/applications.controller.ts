import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js'
import { CurrentUser, Public, Roles } from '../../auth/decorators.js'
import { clientIp } from '../../auth/throttling.js'
import {
  applicationParamsSchema,
  createApplicationSchema,
  createLeadSchema,
  leadParamsSchema,
  listApplicationsQuerySchema,
  reviewApplicationSchema,
  updateLeadSchema,
  type CreateApplicationInput,
  type CreateLeadInput,
  type ListApplicationsQuery,
  type ReviewApplicationInput,
  type UpdateLeadInput,
} from './applications.schemas.js'
import { ApplicationsService } from './applications.service.js'
import { LeadsService } from './leads.service.js'

function clientOf(req: Request) {
  return {
    ipAddress: clientIp(req) ?? null,
    userAgent: req.get('user-agent')?.slice(0, 512) ?? null,
  }
}

/** Contato do "seja produtor" (visitante, sem login). Cada pessoa tem limite de envios. */
@Controller('producer-leads')
export class PublicLeadsController {
  constructor(@Inject(LeadsService) private readonly leads: LeadsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@Body(new ZodValidationPipe(createLeadSchema)) body: CreateLeadInput) {
    return this.leads.createLead(body)
  }
}

/** Candidatura formal a produtor: qualquer conta logada (ainda não produtora). */
@Controller('producer-applications')
export class ApplicationsController {
  constructor(@Inject(ApplicationsService) private readonly applications: ApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createApplicationSchema)) body: CreateApplicationInput,
  ) {
    return this.applications.submitApplication(user, body)
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.applications.getOwnApplication(user.id)
  }
}

@Controller('admin/producer-leads')
@Roles(['admin'])
export class AdminProducerLeadsController {
  constructor(@Inject(LeadsService) private readonly leads: LeadsService) {}

  @Get()
  list() {
    return this.leads.listLeads()
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(new ZodValidationPipe(leadParamsSchema)) params: { id: number },
    @Body(new ZodValidationPipe(updateLeadSchema)) body: UpdateLeadInput,
  ) {
    return this.leads.updateLead(admin.id, params.id, body, clientOf(req))
  }
}

@Controller('admin/producer-applications')
@Roles(['admin'])
export class AdminProducerApplicationsController {
  constructor(@Inject(ApplicationsService) private readonly applications: ApplicationsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listApplicationsQuerySchema)) query: ListApplicationsQuery) {
    return this.applications.listApplications(query)
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  review(
    @CurrentUser() admin: SessionUser,
    @Req() req: Request,
    @Param(new ZodValidationPipe(applicationParamsSchema)) params: { id: number },
    @Body(new ZodValidationPipe(reviewApplicationSchema)) body: ReviewApplicationInput,
  ) {
    return this.applications.reviewApplication(admin.id, params.id, body, clientOf(req))
  }
}
