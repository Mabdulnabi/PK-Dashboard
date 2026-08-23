import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingInner } from './landing/_content'

export default function Root() {
  const token = cookies().get('pk_member_token')?.value
  if (token) redirect('/u/dashboard')
  return <LandingInner/>
}
