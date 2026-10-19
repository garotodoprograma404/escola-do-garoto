import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { UsersModule } from '../users/users.module.js'
import { AdminProfileController } from './admin-profile.controller.js'
import { AdminProfileService } from './admin-profile.service.js'
import { AdminUsersController } from './admin-users.controller.js'
import { AdminUsersService } from './admin-users.service.js'

/** Gestão de usuários e perfil do admin. Auditoria e hash de senha vêm dos módulos globais/auth. */
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AdminUsersController, AdminProfileController],
  providers: [AdminUsersService, AdminProfileService],
})
export class AdminUsersModule {}
