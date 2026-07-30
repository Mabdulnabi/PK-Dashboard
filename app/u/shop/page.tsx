'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
export default function ShopRedirect() {
  const router = useRouter()
  useEffect(()=>{ router.replace('/u/shop/shared') },[router])
  return null
}
