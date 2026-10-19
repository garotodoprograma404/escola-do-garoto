// Support ticket management types

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketCategory =
  'technical' | 'billing' | 'course' | 'course_content' | 'account' | 'other'

export interface Ticket {
  id: string
  userId: string
  userName: string
  userEmail: string
  userAvatar?: string
  subject: string
  description?: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assignedTo: string | null
  assignedToName: string | null
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  messageCount: number
  tags: string[]
  courseId?: string
  courseName?: string
}

export interface TicketMessage {
  id: string
  ticketId: string
  userId: string
  userName: string
  userAvatar?: string
  isAdmin: boolean
  message: string
  attachments?: string[]
  createdAt: string
  readAt: string | null
}

export interface TicketContext {
  user: {
    id: string
    name: string
    email: string
    role: string
    registeredAt: string
    totalCourses: number
    totalSpent: number
  }
  recentActivity: {
    type: string
    description: string
    date: string
  }[]
  relatedTickets: {
    id: string
    subject: string
    status: TicketStatus
    createdAt: string
  }[]
}

export interface SupportStats {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedToday: number
  averageResponseTime: number // em minutos
  satisfactionRate: number // 0-100
}

export interface TicketFilters {
  searchTerm: string
  status: TicketStatus | 'ALL'
  priority: TicketPriority | 'ALL'
  category: TicketCategory | 'ALL'
  assignedTo: string | 'ALL' | 'UNASSIGNED'
}
