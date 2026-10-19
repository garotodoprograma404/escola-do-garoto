/** Perfil do admin como a API devolve (snake_case, o formato que o front consome). */
export interface AdminProfile {
  id: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  phone: string | null
  created_at: string
  updated_at: string
}
