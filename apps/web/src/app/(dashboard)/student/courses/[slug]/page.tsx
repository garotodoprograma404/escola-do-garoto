import { redirect } from 'next/navigation'

interface CourseRedirectPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    lesson?: string
  }>
}

export async function generateMetadata({ params }: CourseRedirectPageProps) {
  const { slug } = await params
  return {
    title: `${slug} | Curso`,
  }
}

export default async function StudentCourseRedirectPage({
  params,
  searchParams,
}: CourseRedirectPageProps) {
  const { slug } = await params
  const { lesson } = await searchParams

  const target = lesson
    ? `/student/courses/${slug}/player?lesson=${lesson}`
    : `/student/courses/${slug}/player`

  redirect(target)
}
