// Course management types

export type CourseStatus =
  | 'draft'
  | 'pending'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'archived'

export interface AdminCourseListItem {
  id: string
  title: string
  producerId: string
  producerName: string
  producerAvatar?: string
  category: string
  price: number
  status: CourseStatus
  submittedAt: string
  updatedAt: string
  salesCount: number
  revenue: number
  rating: number
  thumbnail?: string
}

export interface AdminCourseFilters {
  searchTerm: string
  status: CourseStatus | 'ALL'
  category: string | 'ALL'
  producerId?: string
}

export interface AdminCourseEditorSettings {
  ownerMode: 'self' | 'producer'
  producerId: string | null
  isFeatured: boolean
  couponsEnabled: boolean
  priceLockedByAdmin: boolean
  adminNotes: string
}

export interface AdminCourseEditorData {
  title: string
  producerId: string
  settings: Omit<AdminCourseEditorSettings, 'ownerMode' | 'producerId'>
  courseData: import('@/features/producer/course-create/types').CompleteCourseFormData
}
