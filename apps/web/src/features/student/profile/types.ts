// Student Profile Types

export interface StudentProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  email_course_updates: boolean
  email_new_content: boolean
  email_promotions: boolean
  email_weekly_summary: boolean
  push_course_updates: boolean
  push_new_content: boolean
}

export interface ActivityLogType {
  id: string
  type: 'enrollment' | 'completion' | 'certificate' | 'note' | 'review'
  description: string
  metadata: Record<string, unknown>
  created_at: string
}
