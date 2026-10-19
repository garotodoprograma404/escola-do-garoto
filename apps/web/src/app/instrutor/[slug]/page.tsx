import { notFound } from 'next/navigation'
import { PublicLayout } from '@/shared/components/PublicLayout'
import {
  getPublicInstructorProfileBySlug,
  InstructorPublicProfilePage,
} from '@/features/public/instructor-profile'

interface InstructorPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: InstructorPageProps) {
  const { slug } = await params
  const profile = await getPublicInstructorProfileBySlug(slug)

  if (!profile) {
    return {
      title: 'Instrutor não encontrado',
    }
  }

  return {
    title: `${profile.name} | Instrutor`,
    description: profile.bio || `Conheça os cursos publicados por ${profile.name}.`,
  }
}

export default async function InstructorProfilePage({ params }: InstructorPageProps) {
  const { slug } = await params
  const profile = await getPublicInstructorProfileBySlug(slug)

  if (!profile) {
    notFound()
  }

  return (
    <PublicLayout>
      <InstructorPublicProfilePage profile={profile} />
    </PublicLayout>
  )
}
