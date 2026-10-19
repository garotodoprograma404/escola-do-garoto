import { useEffect, useState } from 'react'
import { useToast } from '@/shared/hooks/use-toast'
import { getRoleUsersAction, type CourseRoleUserOption } from '../actions/get-role-users'

/** Produtores ativos para o seletor de responsável; avisa por toast se não conseguir carregar. */
export function useActiveProducers() {
  const { toast } = useToast()
  const [producers, setProducers] = useState<CourseRoleUserOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const result = await getRoleUsersAction('producer')
        if (result.success && result.data) {
          setProducers(result.data)
          return
        }

        toast({
          title: 'Erro ao carregar produtores',
          description: result.error || 'Não foi possível carregar os produtores ativos.',
          variant: 'destructive',
        })
      } catch {
        toast({
          title: 'Erro ao carregar produtores',
          description: 'Não foi possível carregar os produtores ativos.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [toast])

  return { producers, isLoading }
}
