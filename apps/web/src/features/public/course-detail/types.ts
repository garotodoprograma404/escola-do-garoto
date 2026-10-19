// =====================================================
// COURSE DETAIL - TYPES
// =====================================================

export interface CourseDetail {
  id: number
  title: string
  slug: string
  description: string
  short_description: string | null
  thumbnail_url: string | null
  cover_image_url: string | null
  trailer_url: string | null
  price: number
  discount_price: number | null
  average_rating: number | null
  level: string
  total_duration_minutes: number
  total_lessons: number
  total_students: number
  total_reviews: number
  has_lifetime_access: boolean
  has_certificate: boolean
  status: string
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  category: {
    id: number
    name: string
    slug: string
  }
  producer: {
    id: string
    name: string
    slug: string | null
    public_profile_enabled: boolean
    avatar: string | null
    bio: string | null
    expertise_areas: string[]
    average_rating: number | null
    total_students: number
    total_courses: number
  }
  modules: CourseModule[]
  stats: {
    total_students: number
    total_lessons: number
    total_reviews: number
    completion_rate: number
  }
  what_you_will_learn: string[]
  requirements: string[]
  target_audience: string[]
}

export interface CourseModule {
  id: number
  title: string
  description: string | null
  display_order: number
  is_published: boolean
  lessons: CourseLesson[]
}

interface CourseLesson {
  id: number
  title: string
  description: string | null
  type: 'video' | 'text' | 'quiz' | 'file'
  content_url: string | null
  content_text: string | null
  duration_minutes: number | null
  is_free_preview: boolean
  is_published: boolean
  display_order: number
}

export interface CourseReview {
  id: string
  rating: number
  title: string | null
  review: string | null
  created_at: string
  user: {
    name: string
    avatar: string | null
  }
  response: string | null
  responded_at: string | null
  responded_by: string | null
  is_verified_purchase: boolean
  is_featured: boolean
  helpful_count: number
}

export interface ReviewStats {
  average_rating: number
  total_reviews: number
  rating_distribution: {
    rating: number
    count: number
    percentage: number
  }[]
}
