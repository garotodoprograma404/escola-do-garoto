// Student Support Types

export interface SupportTicket {
  id: string
  title: string
  description: string
  category: 'technical' | 'billing' | 'course_content' | 'account' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  course_id: string | null
  course_title: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface TicketMessage {
  id: string
  ticket_id: string
  user_id: string
  user_name: string
  user_avatar: string | null
  is_staff: boolean
  message: string
  created_at: string
}

export interface SupportStats {
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  average_response_time: number
}
