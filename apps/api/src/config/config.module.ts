import { Global, Module } from '@nestjs/common'
import { loadEnv } from './env.js'

/** Token de injeção da configuração validada: `@Inject(ENV) private readonly env: Env`. */
export const ENV = Symbol('ENV')

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}
