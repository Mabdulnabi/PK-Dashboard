'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [userName, setUserName] = useState('Admin')
  const [expiring, setExpiring] = useState(0)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/auth/login'); return }
      const name = data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'Admin'
      setUserName(name)
      setLoading(false)
    })
    ;(supabase.from('members') as any).select('id',{count:'exact'})
      .eq('computed_status','expiring')
      .then(({count}:any)=>setExpiring(count||0))
  }, [router])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar expiringCount={expiring} userName={userName}/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
