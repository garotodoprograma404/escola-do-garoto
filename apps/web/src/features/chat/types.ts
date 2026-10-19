/** Mensagem do chat do ticket, como a API devolve (snake_case, o formato que o front consome). */
export interface ChatMessage {
  id: number
  ticket_id: number
  sender_id: string
  message: string
  is_staff: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface TypingIndicator {
  ticket_id: number
  user_id: string
  is_typing: boolean
  updated_at: string
}
