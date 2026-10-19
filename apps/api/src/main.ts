import { existsSync } from 'node:fs'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module.js'
import { APP_CREATE_OPTIONS, configureApp } from './app.setup.js'
import { loadEnv } from './config/env.js'

if (existsSync('.env')) process.loadEnvFile('.env')
const env = loadEnv()

async function bootstrap() {
  const app = configureApp(
    await NestFactory.create<NestExpressApplication>(AppModule, APP_CREATE_OPTIONS),
    env.TRUSTED_PROXIES,
  )
  await app.listen(env.API_PORT, env.API_HOST)
}
await bootstrap()
