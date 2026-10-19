interface InstructorSocialLinks {
  website?: string
  instagram?: string
  youtube?: string
  linkedin?: string
  facebook?: string
}

interface InstructorPublicCourse {
  id: number
  title: string
  slug: string
  short_description: string | null
  thumbnail_url: string | null
  price: number
  discount_price: number | null
  current_price: number
  average_rating: number | null
  total_students: number
  category_name: string
  updated_at: string
}

export interface InstructorPublicProfile {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  expertise_areas: string[]
  social_links: InstructorSocialLinks
  average_rating: number | null
  total_students: number
  total_courses: number
  courses: InstructorPublicCourse[]
}
