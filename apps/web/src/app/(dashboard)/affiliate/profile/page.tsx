import { redirect } from 'next/navigation'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

export const metadata = {
  title: 'Perfil do Afiliado',
  description: 'Dados básicos da conta de afiliado',
}

export default async function AffiliateProfilePage() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('affiliate')) {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Perfil do Afiliado</h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
          Esta página base garante navegação e acesso seguros enquanto as próximas fases do módulo
          são implementadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conta autenticada</CardTitle>
          <CardDescription>Resumo inicial do acesso do afiliado nesta fase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Nome:</span>{' '}
            {authContext.profile?.full_name || 'Não informado'}
          </p>
          <p>
            <span className="font-medium">Email:</span> {authContext.email}
          </p>
          <p>
            <span className="font-medium">Role ativa:</span> affiliate
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
