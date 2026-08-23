'use client'
import { LandingInner } from '@/app/landing/_content'
import { useMember } from '@/lib/member-context'

export default function DashboardTab() {
  const { member } = useMember()
  return <LandingInner embedded={true} memberActive={!!member}/>
}
