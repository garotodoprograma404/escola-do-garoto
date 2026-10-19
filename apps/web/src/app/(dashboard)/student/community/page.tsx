import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Comunidade descontinuada',
}

export default function StudentCommunityRedirectPage() {
  redirect('/student')
}
