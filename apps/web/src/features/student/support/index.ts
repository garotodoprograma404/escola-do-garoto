// Student Support Public API
export { SupportStats } from './components/SupportStats'
export { TicketCard } from './components/TicketCard'
export { CreateTicketForm } from './components/CreateTicketForm.client'
export { TicketMessages } from './components/TicketMessages'
export { SendMessageForm } from './components/SendMessageForm.client'
export { CloseTicketButton } from './components/CloseTicketButton.client'

export {
  getMyTickets,
  getTicket,
  getTicketMessages,
  getSupportStats,
  getMyCoursesForSupport,
} from './services/supportService'
