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
  NotificationPreferencesForm,
  ActivityLog,
  getStudentProfile,
  getNotificationPreferences,
  getActivityLog,
} from '@/features/student/profile'

export const metadata = {
  title: 'Meu Perfil',
  description: 'Gerencie suas informações pessoais e preferências',
}

async function ProfileContent() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  const [profile, preferences, activities] = await Promise.all([
    getStudentProfile(authContext.userId),
    getNotificationPreferences(authContext.userId),
    getActivityLog(authContext.userId),
  ])

  if (!profile) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Erro ao carregar perfil</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Gerencie suas informações pessoais e preferências
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
            <TabsTrigger value="notifications" className="px-3 py-2 text-xs sm:text-sm">
              Notificações
            </TabsTrigger>
            <TabsTrigger value="activity" className="px-3 py-2 text-xs sm:text-sm">
              Atividades
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Foto de Perfil</CardTitle>
              <CardDescription>Atualize sua foto de perfil</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <AvatarUpload avatarUrl={profile.avatar_url} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <ProfileForm profile={profile} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Mantenha sua conta segura com uma senha forte</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <PasswordForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>Escolha como deseja receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <NotificationPreferencesForm preferences={preferences} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLog activities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}

export default function StudentProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  )
}
