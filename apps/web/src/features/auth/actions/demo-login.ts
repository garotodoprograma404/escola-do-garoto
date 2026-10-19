'use server'

import { redirect } from 'next/navigation'
import { getRoleDashboardPath } from '@/shared/lib/navigation'
import { authService } from '../services/authService'
import { isDemoRole } from '../lib/demo-roles'

/** Botões da tela de login no ambiente de demonstração: entra e vai para o painel do papel. */
export async function demoLoginAction(role: string) {
  if (process.env.DEMO_MODE !== 'true' || !isDemoRole(role)) {
    return { error: 'Entrada de demonstração indisponível.' }
  }
  try {
    await authService.demoLogin(role)
  } catch (error) {
    return { error: (error as Error).message }
  }
  redirect(getRoleDashboardPath(role))
}
