import { Module } from '@nestjs/common'
import { AffiliateModule } from '../affiliate/affiliate.module.js'
import { AdminAffiliatesController } from './admin-affiliates.controller.js'
import { AdminAffiliatesService } from './admin-affiliates.service.js'

/** Administração do programa de afiliados (candidaturas, parcerias, auditoria de vendas). */
@Module({
  imports: [AffiliateModule],
  controllers: [AdminAffiliatesController],
  providers: [AdminAffiliatesService],
})
export class AdminAffiliatesModule {}
