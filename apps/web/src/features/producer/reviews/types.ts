// =====================================================
// PRODUCER REVIEWS - TYPES
// =====================================================

export interface Review {
  id: string
  courseId: string
  courseTitle: string
  studentId: string
  studentName: string
  studentAvatar?: string
  enrollmentId: string
  rating: number
  title?: string
  review?: string
  response?: string
  respondedBy?: string
  respondedAt?: string
  isVerifiedPurchase: boolean
  isFeatured: boolean
  helpfulCount: number
  createdAt: string
  updatedAt: string
}

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  distribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

export interface ProducerReviews {
  stats: ReviewStats
  reviews: Review[]
}

export type ReviewFilter = 'all' | '5' | '4' | '3' | '2' | '1' | 'no-response'
