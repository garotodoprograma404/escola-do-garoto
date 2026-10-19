// Student Profile Public API
export { ProfileForm } from './components/ProfileForm.client'
export { AvatarUpload } from './components/AvatarUpload.client'
export { PasswordForm } from './components/PasswordForm.client'
export { NotificationPreferencesForm } from './components/NotificationPreferences.client'
export { ActivityLog } from './components/ActivityLog'

export {
  getStudentProfile,
  getNotificationPreferences,
  getActivityLog,
} from './services/profileService'
