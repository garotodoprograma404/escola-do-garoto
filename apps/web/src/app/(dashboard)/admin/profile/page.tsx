import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { AvatarUpload, PasswordForm, ProfileForm, getAdminProfile } from '@/features/admin/profile'

export const metadata = {
  title: 'Perfil do Admin',
  description: 'Gerencie seus dados pessoais e segurança da conta administrativa',
}

async function ProfileContent() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('admin')) {
    redirect('/')
  }

  const profile = await getAdminProfile(authContext.userId)

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Erro ao carregar perfil administrativo</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Perfil do Admin</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Atualize seus dados pessoais e mantenha sua conta segura
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-5 sm:space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto w-max min-w-full gap-1 p-1">
            <TabsTrigger value="profile" className="px-3 py-2 text-xs sm:text-sm">
              Perfil
            </TabsTrigger>
            <TabsTrigger value="security" className="px-3 py-2 text-xs sm:text-sm">
              Segurança
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>Atualize sua foto de administrador</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <AvatarUpload avatarUrl={profile.avatar_url} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Edite seus dados de perfil administrativo</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <ProfileForm profile={profile} email={authContext.email} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Mantenha sua conta administrativa protegida</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <PasswordForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-2 h-5 w-full max-w-lg" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  )
}
