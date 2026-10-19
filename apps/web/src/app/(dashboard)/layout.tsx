import { redirect } from 'next/navigation'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { getNavItemsByRole } from '@/shared/lib/navigation'
import { DashboardLayoutClient } from '@/shared/components/DashboardLayoutClient.client'
import { logoutAction } from '@/features/auth/actions/logout'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getNotifications, getNotificationStats } from '@/shared/services/notificationService'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  const role = authContext.primaryRole
  if (!role) {
    redirect('/login')
  }

  const userData = {
    id: authContext.userId,
    name: authContext.profile?.full_name || authContext.email.split('@')[0] || 'Usuário',
    email: authContext.email,
    avatar_url: authContext.profile?.avatar_url ?? null,
  }

  // Get navigation items for this role
  const navItems = getNavItemsByRole(role)
  const [generalSettings, notifications, notificationStats] = await Promise.all([
    getPublicGeneralSettings(),
    getNotifications(10),
    getNotificationStats(),
  ])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardLayoutClient
        user={userData}
        userRole={role}
        availableRoles={authContext.roles}
        navItems={navItems}
        platformName={generalSettings.platformName}
        notifications={notifications}
        unreadNotifications={notificationStats.unread}
        onLogout={logoutAction}
      >
        {children}
      </DashboardLayoutClient>
    </div>
  )
}
