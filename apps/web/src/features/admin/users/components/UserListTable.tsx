'use client'

import { Eye, Edit, Trash2, MoreVertical, Shield } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { UserStatusBadge } from './UserStatusBadge'
import type { AdminUserListItem } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface UserListTableProps {
  users: AdminUserListItem[]
  onView: (user: AdminUserListItem) => void
  onEdit: (user: AdminUserListItem) => void
  onDelete: (id: string) => void
}

const ROLE_LABELS: Record<string, string> = {
  student: 'Aluno',
  producer: 'Produtor',
  affiliate: 'Afiliado',
  admin: 'Admin',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function UserListTable({ users, onView, onEdit, onDelete }: UserListTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Nenhum usuário encontrado com os filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-950">
                <TableHead className="w-[280px]">Usuário</TableHead>
                <TableHead className="w-[120px]">Papel</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[120px]">Cadastro</TableHead>
                <TableHead className="w-[140px]">Último Acesso</TableHead>
                <TableHead className="w-[140px] text-right">Métricas</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  {/* User Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-brand-500 text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate font-medium text-slate-900 dark:text-white">
                          {user.name}
                          {user.kycVerified && (
                            <span title="KYC Verificado">
                              <Shield size={14} className="flex-shrink-0 text-green-500" />
                            </span>
                          )}
                        </p>
                        <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <UserStatusBadge status={user.status} />
                  </TableCell>

                  {/* Join Date */}
                  <TableCell className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(user.joinedAt)}
                  </TableCell>

                  {/* Last Login */}
                  <TableCell className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Nunca'}
                  </TableCell>

                  {/* Metrics */}
                  <TableCell className="text-right">
                    <div className="text-sm">
                      {user.role === 'producer' && user.totalRevenue !== undefined && (
                        <p className="whitespace-nowrap font-medium text-slate-900 dark:text-white">
                          {formatCurrency(user.totalRevenue)}
                        </p>
                      )}
                      {user.coursesCount !== undefined && (
                        <p className="whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {user.coursesCount} curso{user.coursesCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Ações de ${user.name}`}>
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(user)}>
                          <Eye size={16} className="mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Edit size={16} className="mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(user.id)}
                          className="text-red-600"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Desativar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
