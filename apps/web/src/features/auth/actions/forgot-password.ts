'use server'

import { authService } from '../services/authService'
import { forgotPasswordSchema } from '../lib/validations'

export async function forgotPasswordAction(formData: FormData) {
  const data = {
    email: formData.get('email') as string,
  }

  const validation = forgotPasswordSchema.safeParse(data)

  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  try {
    await authService.forgotPassword(validation.data.email)
    return { success: true }
  } catch (error) {
    return { error: (error as Error).message }
  }
}
