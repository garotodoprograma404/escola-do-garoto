'use client'

import {
  Mail,
  Phone,
  Calendar,
  MapPin,
  Shield,
  CreditCard,
  TrendingUp,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Progress } from '@/shared/components/ui/progress'
import { UserStatusBadge } from './UserStatusBadge'
import type { AdminUserListItem, UserEnrollmentSummary } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface UserDetailsModalProps {
  user: AdminUserListItem | null
  open: boolean
  loading?: boolean
  onClose: () => void
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Aluno',
  producer: 'Produtor',
  affiliate: 'Afiliado',
  admin: 'Admin',
}

const ENROLLMENT_STATUS_LABELS: Record<UserEnrollmentSummary['status'], string> = {
  active: 'Ativa',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
}

const ENROLLMENT_STATUS_CLASSNAMES: Record<UserEnrollmentSummary['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  refunded: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function UserDetailsModal({ user, open, loading = false, onClose }: UserDetailsModalProps) {
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Usuário</span>
          </DialogTitle>
        </DialogHeader>

        {/* User Header */}
        <div className="flex items-start gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-brand-500 text-2xl text-white">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h3>
              {user.kycVerified && (
                <span title="KYC Verificado">
                  <Shield size={20} className="text-green-500" />
                </span>
              )}
            </div>
            <div className="mb-3 flex items-center gap-3">
              <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
              <UserStatusBadge status={user.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Mail size={14} />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-1">
                  <Phone size={14} />
                  {user.phone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
          </TabsList>

          {/* Personal Data Tab */}
          <TabsContent value="personal" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="CPF" value={user.cpf || 'Não informado'} />
              <InfoItem label="Telefone" value={user.phone || 'Não informado'} />
              <InfoItem
                label="Data de Nascimento"
                value={user.birthDate ? formatDate(user.birthDate) : 'Não informado'}
              />
              <InfoItem
                label="Cadastro"
                value={formatDate(user.joinedAt)}
                icon={<Calendar size={14} />}
              />
              {user.role === 'producer' && (
                <InfoItem
                  label="Comissão da Plataforma"
                  value={`${(user.platformCommissionRate ?? 10).toFixed(2)}%`}
                />
              )}
            </div>

            {user.bio && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Bio</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">{user.bio}</p>
              </div>
            )}

            {user.address && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <MapPin size={14} />
                  Endereço
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {user.address.street}, {user.address.number}
                  {user.address.complement && ` - ${user.address.complement}`}
                  <br />
                  {user.address.neighborhood} - {user.address.city}/{user.address.state}
                  <br />
                  CEP: {user.address.zipCode}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                label="Último Login"
                value={user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
              />
              <InfoItem label="IP do Último Login" value={user.lastLoginIp || 'N/A'} />
              <InfoItem label="2FA Ativado" value={user.twoFactorEnabled ? 'Sim' : 'Não'} />
              <InfoItem label="KYC Verificado" value={user.kycVerified ? 'Sim' : 'Não'} />
            </div>

            {user.documents && (
              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                  Documentos
                </h4>
                <div className="space-y-2">
                  <InfoItem label="Status" value={user.documents.status} />
                  {user.documents.rejectionReason && (
                    <InfoItem label="Motivo da Rejeição" value={user.documents.rejectionReason} />
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {user.coursesCount !== undefined && (
                <MetricCard
                  label="Cursos"
                  value={user.coursesCount.toString()}
                  icon={<TrendingUp size={16} />}
                />
              )}

              {user.totalRevenue !== undefined && (
                <MetricCard
                  label="Receita Total"
                  value={formatCurrency(user.totalRevenue)}
                  icon={<CreditCard size={16} />}
                />
              )}

              {user.totalCommission !== undefined && (
                <MetricCard
                  label="Comissão Total"
                  value={formatCurrency(user.totalCommission)}
                  icon={<CreditCard size={16} />}
                />
              )}

              {user.balanceAvailable !== undefined && (
                <MetricCard
                  label="Saldo Disponível"
                  value={formatCurrency(user.balanceAvailable)}
                  icon={<CreditCard size={16} />}
                />
              )}

              {user.balanceBlocked !== undefined && (
                <MetricCard
                  label="Saldo Bloqueado"
                  value={formatCurrency(user.balanceBlocked)}
                  icon={<CreditCard size={16} />}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="enrollments" className="mt-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-8 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <Loader2 size={16} className="animate-spin" />
                Carregando matrículas...
              </div>
            ) : !user.enrollments || user.enrollments.length === 0 ? (
              <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                Nenhuma matrícula encontrada para este usuário.
              </div>
            ) : (
              <div className="space-y-3">
                {user.enrollments.map((enrollment) => (
                  <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function EnrollmentCard({ enrollment }: { enrollment: UserEnrollmentSummary }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-white">{enrollment.courseTitle}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <BookOpen size={12} />
            Curso ID: {enrollment.courseId}
          </p>
        </div>
        <Badge className={ENROLLMENT_STATUS_CLASSNAMES[enrollment.status]}>
          {ENROLLMENT_STATUS_LABELS[enrollment.status]}
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <span>Progresso</span>
          <span>{enrollment.progressPercentage}%</span>
        </div>
        <Progress value={enrollment.progressPercentage} className="h-2" />
      </div>

      <div className="mt-4 grid gap-3 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-3">
        <div>
          <p className="text-slate-600 dark:text-slate-400">Matrícula</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-white">
            {formatDate(enrollment.enrolledAt)}
          </p>
        </div>
        <div>
          <p className="text-slate-600 dark:text-slate-400">Último acesso</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-white">
            {enrollment.lastAccessedAt ? formatDate(enrollment.lastAccessedAt) : 'Não acessou'}
          </p>
        </div>
        <div>
          <p className="text-slate-600 dark:text-slate-400">Conclusão</p>
          <p className="mt-1 font-medium text-slate-900 dark:text-white">
            {enrollment.completedAt ? formatDate(enrollment.completedAt) : 'Em andamento'}
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
        {icon}
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
      <div className="mb-2 flex items-center gap-2 text-slate-600 dark:text-slate-400">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
