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
import {
  ProfileForm,
  AvatarUpload,
  PasswordForm,
  getProducerProfile,
} from '@/features/producer/profile'

export const metadata = {
  title: 'Perfil do Produtor',
  description: 'Gerencie seu perfil de produtor e segurança da conta',
}

async function ProfileContent() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('producer')) {
    redirect('/become-producer')
  }

  const profile = await getProducerProfile(authContext.userId)

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Erro ao carregar perfil do produtor</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Perfil do Produtor</h1>
        <p className="text-muted-foreground">Gerencie seus dados públicos e segurança da conta</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>Atualize sua foto de produtor</CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarUpload avatarUrl={profile.avatar_url} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações de Perfil</CardTitle>
              <CardDescription>Defina os dados visíveis no seu perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={profile} email={authContext.email} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Mantenha sua conta de produtor protegida</CardDescription>
            </CardHeader>
            <CardContent>
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
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-full max-w-lg" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}

export default function ProducerProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  )
}
