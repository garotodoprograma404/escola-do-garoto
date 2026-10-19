// Student Profile Service (API NestJS: /api/student/profile)
import { apiServer } from '@/lib/server-api'
import type { StudentProfile, NotificationPreferences, ActivityLogType } from '../types'

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_course_updates: true,
  email_new_content: true,
  email_promotions: false,
  email_weekly_summary: true,
  push_course_updates: true,
  push_new_content: true,
}

// Em todas as funções o `userId` é opcional e IGNORADO: a API sempre usa o usuário da sessão.

export async function getStudentProfile(_userId?: string): Promise<StudentProfile | null> {
  const result = await apiServer<StudentProfile>('/student/profile')
  if (!result.ok) {
    console.error('Error fetching profile:', result.error.message)
    return null
  }
  return result.data
}

export async function getNotificationPreferences(
  _userId?: string,
): Promise<NotificationPreferences> {
  const result = await apiServer<NotificationPreferences>(
    '/student/profile/notification-preferences',
  )
  return result.ok ? result.data : DEFAULT_PREFERENCES
}

export async function getActivityLog(_userId?: string): Promise<ActivityLogType[]> {
  const result = await apiServer<ActivityLogType[]>('/student/profile/activity')
  return result.ok ? result.data : []
}
