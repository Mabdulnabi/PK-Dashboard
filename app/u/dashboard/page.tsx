'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardTab() {
  const router = useRouter()
  useEffect(() => { router.replace('/u/store') }, [])
  return null
}
