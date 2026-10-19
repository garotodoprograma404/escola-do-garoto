// User management types

type UserRole = 'student' | 'producer' | 'affiliate' | 'admin'

export type UserStatus = 'active' | 'pending_kyc' | 'suspended' | 'banned' | 'blocked_finance'

interface Address {
  zipCode: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
}

interface BankAccount {
  bankCode: string
  bankName: string
  agency: string
  account: string
  accountType: 'checking' | 'savings'
  pixKey?: string
}

interface CompanyInfo {
  companyName: string // Razão Social
  tradingName: string // Nome Fantasia
  cnpj: string
  stateRegistration?: string // Inscrição Estadual
  responsibleName: string
}

interface UserDocuments {
  idFront?: string
  idBack?: string
  socialContract?: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
}

type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | 'refunded'

export interface UserEnrollmentSummary {
  id: number
  courseId: number
  courseTitle: string
  courseSlug?: string | null
  courseThumbnailUrl?: string | null
  status: EnrollmentStatus
  progressPercentage: number
  enrolledAt: string
  completedAt?: string | null
  lastAccessedAt?: string | null
}

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  role: UserRole
  /** Todos os papéis ativos (a tela mostra `role`, o principal). */
  roles?: UserRole[]
  status: UserStatus
  avatar?: string
  joinedAt: string
  lastLogin?: string
  lastLoginIp?: string
  phone?: string
  cpf?: string
  birthDate?: string
  bio?: string
  platformCommissionRate?: number

  // Endereço
  address?: Address

  // Específico: Produtor / Afiliado
  company?: CompanyInfo
  bankAccount?: BankAccount

  // Documentos
  documents?: UserDocuments

  // Métricas
  totalRevenue?: number // Para Produtor
  totalCommission?: number // Para Afiliado
  balanceAvailable?: number
  balanceBlocked?: number
  coursesCount?: number // Produtor (criados) ou Aluno (matriculados)
  enrollments?: UserEnrollmentSummary[]

  // Flags de Segurança
  kycVerified?: boolean
  twoFactorEnabled?: boolean
  withdrawalsBlocked?: boolean
}

export interface UserFilters {
  searchTerm: string
  role: UserRole | 'ALL'
  status: UserStatus | 'ALL'
}
