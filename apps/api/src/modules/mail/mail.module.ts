import { Global, Module } from '@nestjs/common'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'
import { ConsoleMailService } from './console-mail.service.js'
import { MailService } from './mail.service.js'
import { SmtpMailService } from './smtp-mail.service.js'

@Global()
@Module({
  providers: [
    {
      provide: MailService,
      inject: [ENV],
      useFactory: (env: Env): MailService => {
        if (env.MAIL_DRIVER === 'smtp') {
          // O schema do env garante host/porta/remetente quando o driver é `smtp`.
          return new SmtpMailService({
            host: env.SMTP_HOST!,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            requireTls: env.SMTP_REQUIRE_TLS,
            user: env.SMTP_USER,
            password: env.SMTP_PASSWORD,
            from: env.MAIL_FROM!,
          })
        }
        return new ConsoleMailService()
      },
    },
  ],
  exports: [MailService],
})
export class MailModule {}
