// Producer Profile Types

interface ProducerSocialLinks {
  website?: string
  instagram?: string
  youtube?: string
  linkedin?: string
  facebook?: string
}

export interface ProducerProfile {
  id: string
  full_name: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  slug: string | null
  expertise_areas: string[] | null
  social_links: ProducerSocialLinks | null
  cover_url: string | null
  public_profile_enabled: boolean
  created_at: string
  updated_at: string
}
