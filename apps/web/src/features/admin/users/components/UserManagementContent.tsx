'use client'

import { useState, useEffect, useRef } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { UserFilters } from './UserFilters'
import { UserListTable } from './UserListTable'
import { UserDetailsModal } from './UserDetailsModal.client'
import { UserEditModal } from './UserEditModal.client'
import { UserCreateModal } from './UserCreateModal.client'
import { DeleteUserDialog } from './DeleteUserDialog.client'
import { UserPagination } from './UserPagination.client'
import { createUserAction } from '../actions/create-user'
import { updateUserAction } from '../actions/update-user'
import { deleteUserAction } from '../actions/delete-user'
import { getUsersAction } from '../actions/get-users'
import { getUserDetailsAction } from '../actions/get-user-details'
import type { AdminUserListItem, UserFilters as UserFiltersType } from '../types'
import type { UserEditFormData, UserCreateFormData } from '../lib/validations'
import { useToast } from '@/shared/hooks/use-toast'

const PAGE_SIZE = 10 // Users per page

export function UserManagementContent() {
  const [filters, setFilters] = useState<UserFiltersType>({
    searchTerm: '',
    role: 'ALL',
    status: 'ALL',
  })
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AdminUserListItem | null>(null)
  const detailsRequestRef = useRef(0)
  const { toast } = useToast()

  // Fetch users when filters or page change
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      try {
        const data = await getUsersAction(filters, currentPage, PAGE_SIZE)
        setUsers(data.users)
        setTotalUsers(data.total)
      } catch (error) {
        console.error('Error fetching users:', error)
        toast({
          title: 'Erro ao carregar usuários',
          description: 'Não foi possível carregar a lista de usuários.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [filters, currentPage, toast])

  const handleFilterChange = (key: keyof UserFiltersType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleView = (user: AdminUserListItem) => {
    setSelectedUser(user)
    setDetailsModalOpen(true)
    setDetailsLoading(true)
    const requestId = detailsRequestRef.current + 1
    detailsRequestRef.current = requestId

    void (async () => {
      const result = await getUserDetailsAction(user.id)

      if (detailsRequestRef.current !== requestId) {
        return
      }

      if (!result.success || !result.data) {
        toast({
          title: 'Erro ao carregar detalhes',
          description: result.error || 'Não foi possível carregar as matrículas do usuário.',
          variant: 'destructive',
        })
        setDetailsLoading(false)
        return
      }

      setSelectedUser(result.data)
      setDetailsLoading(false)
    })()
  }

  const handleEdit = (user: AdminUserListItem) => {
    setSelectedUser(user)
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (data: UserEditFormData) => {
    if (!selectedUser) return

    const result = await updateUserAction(selectedUser.id, data)

    if (result.error) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: result.error,
        variant: 'destructive',
      })
      throw new Error(result.error)
    }

    // Refresh users list
    const updatedData = await getUsersAction(filters, currentPage, PAGE_SIZE)
    setUsers(updatedData.users)
    setTotalUsers(updatedData.total)

    toast({
      title: 'Usuário atualizado',
      description: 'As alterações foram salvas com sucesso.',
    })
  }

  const handleCreate = async (data: UserCreateFormData) => {
    const result = await createUserAction(data)

    if (result.error) {
      toast({
        title: 'Erro ao criar usuário',
        description: result.error,
        variant: 'destructive',
      })
      throw new Error(result.error)
    }

    // Refresh users list and go to first page
    setCurrentPage(1)
    const updatedData = await getUsersAction(filters, 1, PAGE_SIZE)
    setUsers(updatedData.users)
    setTotalUsers(updatedData.total)

    toast({
      title: 'Usuário criado',
      description: 'O novo usuário foi criado com sucesso.',
    })
  }

  const handleDelete = (id: string) => {
    const user = users.find((u) => u.id === id)
    if (user) {
      setUserToDelete(user)
      setDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return

    const result = await deleteUserAction(userToDelete.id)

    if (result.error) {
      toast({
        title: 'Erro ao desativar usuário',
        description: result.error,
        variant: 'destructive',
      })
      return
    }

    // Refresh users list
    const updatedData = await getUsersAction(filters, currentPage, PAGE_SIZE)
    setUsers(updatedData.users)
    setTotalUsers(updatedData.total)

    toast({
      title: 'Usuário desativado',
      description: 'O usuário foi desativado com sucesso.',
      variant: 'destructive',
    })

    setUserToDelete(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Action Button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            className="w-full gap-2 sm:w-auto"
            onClick={() => setCreateModalOpen(true)}
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline">Novo Usuário</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Filters */}
        <UserFilters filters={filters} onChange={handleFilterChange} />

        {/* Users Table */}
        <UserListTable
          users={users}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Pagination - Only shows if more than PAGE_SIZE users */}
        <UserPagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalUsers / PAGE_SIZE)}
          totalUsers={totalUsers}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        loading={detailsLoading}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false)
          setDetailsLoading(false)
        }}
      />

      {/* Edit Modal */}
      <UserEditModal
        user={selectedUser}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEdit}
      />

      {/* Create Modal */}
      <UserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreate}
      />

      {/* Delete Dialog */}
      <DeleteUserDialog
        user={userToDelete}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
