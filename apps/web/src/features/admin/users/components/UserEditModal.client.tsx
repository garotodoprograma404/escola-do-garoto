'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { userEditSchema, type UserEditFormData } from '../lib/validations'
import type { AdminUserListItem } from '../types'
import { DEFAULT_PLATFORM_COMMISSION_RATE } from '@/shared/lib/commission'

interface UserEditModalProps {
  user: AdminUserListItem | null
  open: boolean
  onClose: () => void
  onSave: (data: UserEditFormData) => Promise<void>
}

export function UserEditModal({ user, open, onClose, onSave }: UserEditModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
  })

  const roleValue = watch('role')
  const statusValue = watch('status')
  const platformCommissionRate = watch('platformCommissionRate')
  const handleRoleChange = (value: string) => {
    setValue('role', value as UserEditFormData['role'])
    if (
      value === 'producer' &&
      (platformCommissionRate === undefined || Number.isNaN(platformCommissionRate))
    ) {
      setValue('platformCommissionRate', DEFAULT_PLATFORM_COMMISSION_RATE)
    }
  }
  const handleStatusChange = (value: string) => {
    setValue('status', value as UserEditFormData['status'])
  }

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        cpf: user.cpf || '',
        birthDate: user.birthDate || '',
        role: user.role,
        status: user.status,
        platformCommissionRate:
          user.role === 'producer'
            ? (user.platformCommissionRate ?? DEFAULT_PLATFORM_COMMISSION_RATE)
            : undefined,
      })
    }
  }, [user, reset])

  const onSubmit = async (data: UserEditFormData) => {
    try {
      await onSave(data)
      onClose()
    } catch (error) {
      console.error('Error saving user:', error)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome Completo <span className="text-red-500">*</span>
            </Label>
            <Input id="name" {...register('name')} placeholder="João Silva" />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Email (readonly) */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              {...register('email')}
              placeholder="joao@example.com"
              readOnly
              className="bg-slate-100 dark:bg-slate-800"
            />
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Email não pode ser alterado
            </p>
          </div>

          {/* Phone and CPF */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...register('phone')} placeholder="(11) 98765-4321" />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" {...register('cpf')} placeholder="123.456.789-00" />
              {errors.cpf && <p className="text-sm text-red-500">{errors.cpf.message}</p>}
            </div>
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input id="birthDate" type="date" {...register('birthDate')} />
            {errors.birthDate && <p className="text-sm text-red-500">{errors.birthDate.message}</p>}
          </div>

          {/* Role and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">
                Papel <span className="text-red-500">*</span>
              </Label>
              <Select value={roleValue} onValueChange={handleRoleChange}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Aluno</SelectItem>
                  <SelectItem value="producer">Produtor</SelectItem>
                  <SelectItem value="affiliate">Afiliado</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select value={statusValue} onValueChange={handleStatusChange}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending_kyc">Pendente KYC</SelectItem>
                  <SelectItem value="suspended">Desativado</SelectItem>
                  <SelectItem value="banned">Banido</SelectItem>
                  <SelectItem value="blocked_finance">Bloqueio Financeiro</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
            </div>
          </div>

          {roleValue === 'producer' && (
            <div className="space-y-2">
              <Label htmlFor="platformCommissionRate">
                Comissão da Plataforma (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="platformCommissionRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register('platformCommissionRate', { valueAsNumber: true })}
                placeholder="10"
              />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Percentual que a plataforma recebe nas vendas desse produtor.
              </p>
              {errors.platformCommissionRate && (
                <p className="text-sm text-red-500">{errors.platformCommissionRate.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
