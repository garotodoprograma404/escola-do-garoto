import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module.js'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { SessionsService } from './sessions.service.js'

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SessionsService],
  // AuthService também sai daqui: o checkout cria a conta de quem pagou sem ter conta (cadastro com
  // confirmação de e-mail) pelo MESMO caminho do cadastro normal.
  exports: [SessionsService, AuthService],
})
export class AuthModule {}
