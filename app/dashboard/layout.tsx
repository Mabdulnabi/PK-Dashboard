'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import { useAdminTheme } from '@/lib/admin-theme'

const ADMIN_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/members': 'Members',
  '/dashboard/products': 'Products',
  '/dashboard/orders': 'Orders',
  '/dashboard/tools': 'Tools',
  '/dashboard/categories': 'Categories',
  '/dashboard/finance': 'Finance',
  '/dashboard/tickets': 'Tickets',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/settings': 'Settings',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [userName, setUserName] = useState('Admin')
  const [expiring, setExpiring] = useState(0)
  const [loading,  setLoading]  = useState(true)
  useAdminTheme()

  useEffect(() => {
    const seg = Object.keys(ADMIN_TITLES).find(k => pathname === k || pathname.startsWith(k + '/'))
    document.title = seg ? `${ADMIN_TITLES[seg]} | Pro Keys Admin` : 'Pro Keys Admin'
  }, [pathname])

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

    // Inject admin favicon from ui_settings
    fetch('/api/ui-settings').then(r=>r.json()).then(d=>{
      const url = d.settings?.admin_favicon_url
      if (!url) return
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-admin]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        link.setAttribute('data-admin','1')
        document.head.appendChild(link)
      }
      link.href = url
    }).catch(()=>{})
  }, [router])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0D1117]">
      <Sidebar userName={userName}/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
