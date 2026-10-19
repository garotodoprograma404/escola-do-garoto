'use server'

import { redirect } from 'next/navigation'
import { authService } from '../services/authService'

export async function logoutAction() {
  await authService.logout()
  redirect('/login')
}
