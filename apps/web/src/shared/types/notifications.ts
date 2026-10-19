// Notification Types

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
  read_at: string | null
}

type NotificationType =
  | 'course_update'
  | 'new_content'
  | 'enrollment'
  | 'completion'
  | 'certificate'
  | 'message'
  | 'review'
  | 'payment'
  | 'refund'
  | 'support'
  | 'system'

export interface NotificationStats {
  total: number
  unread: number
}
