import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Put,
  Req,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionUser } from '@vox/contracts'
import type { Request } from 'express'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { requestInfo } from '../../common/request-info.js'
import { CurrentUser, Roles } from '../auth/decorators.js'
import { PaymentCredentialsService } from './payment-credentials.service.js'
import { paymentGatewayInputSchema, type PaymentGatewayInput } from './payment-gateway.schemas.js'

/**
 * Credenciais do Mercado Pago no painel do admin. Os segredos entram aqui e nunca saem: as
 * respostas trazem só a dica do token, a conta e o modo (teste ou produção).
 */
@Roles(['admin'])
@Controller('admin/payment-gateway')
export class AdminPaymentGatewayController {
  constructor(
    @Inject(PaymentCredentialsService) private readonly credentials: PaymentCredentialsService,
  ) {}

  @Get()
  view() {
    return this.credentials.getAdminView()
  }

  /** Cada gravação consulta o Mercado Pago: limite curto para não virar tentativa de token. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Put()
  save(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(paymentGatewayInputSchema)) body: PaymentGatewayInput,
    @Req() req: Request,
  ) {
    return this.credentials.save(user.id, body, requestInfo(req))
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('check')
  @HttpCode(HttpStatus.OK)
  check() {
    return this.credentials.check()
  }

  @Delete()
  remove(@CurrentUser() user: SessionUser, @Req() req: Request) {
    return this.credentials.remove(user.id, requestInfo(req))
  }
}
