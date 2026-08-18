'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, ShoppingBag, Tag,
  PackageCheck, Archive, Globe, Server, BarChart3, Receipt,
  Bell, SlidersHorizontal, Key, LogOut, UserCircle,
  Gauge, ChevronLeft, MessagesSquare, Star, FileText, Mail, Image,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useUISettings } from '@/lib/use-ui-settings'
import { useAdminTheme } from '@/lib/admin-theme'

const nav = [
  { section: 'Overview', items: [
    { label: 'Dashboard',   href: '/dashboard',         icon: LayoutDashboard },
  ]},
  { section: 'Members', items: [
    { label: 'Members',     href: '/members',             icon: UserCircle },
    { label: 'Live Chat',   href: '/dashboard/live-chat', icon: MessagesSquare },
    { label: 'Tickets',     href: '/tickets',             icon: MessageSquare },
    { label: 'Alerts',      href: '/alerts',              icon: Bell },
    { label: 'Reviews',     href: '/reviews',             icon: Star },
    { label: 'Blogs',       href: '/shop-admin/blogs',    icon: FileText },
    { label: 'Letter Box',  href: '/letter-box',          icon: Mail },
  ]},
  { section: 'Store', items: [
    { label: 'Store',       href: '/shop-admin',          icon: ShoppingBag },
    { label: 'Servers',     href: '/servers',             icon: Server },
    { label: 'Orders',      href: '/orders',              icon: PackageCheck },
    { label: 'Stock',       href: '/stock',               icon: Archive },
    { label: 'Coupons',     href: '/coupons',             icon: Tag },
  ]},
  { section: 'UI Settings', items: [
    { label: 'UI Settings', href: '/ui-settings',         icon: SlidersHorizontal },
  ]},
  { section: 'Finance', items: [
    { label: 'Analytics',    href: '/analytics',          icon: BarChart3 },
    { label: 'Transactions', href: '/transactions',       icon: Receipt },
    { label: 'Payments',     href: '/payment-gateways',   icon: Gauge },
  ]},
  { section: 'System', items: [
    { label: 'Site Settings', href: '/site-settings',    icon: Globe },
    { label: 'My Profile',    href: '/admin-profile',    icon: UserCircle },
  ]},
]

export default function Sidebar({ userName = 'Admin' }: { userName?: string }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const ui          = useUISettings()
  const { dark }    = useAdminTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [adminName,   setAdminName]   = useState(userName)
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)
  const [openTickets, setOpenTickets] = useState(0)
  const signOut  = async () => { await supabase.auth.signOut(); router.push('/auth/login') }

  useEffect(() => {
    const fetchOpenTickets = () =>
      fetch('/api/admin/tickets').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.tickets) setOpenTickets(d.tickets.filter((t: any) => t.status === 'open').length)
      }).catch(() => {})
    fetchOpenTickets()
    const ch = supabase.channel('sidebar-tickets-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchOpenTickets)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    fetch('/api/admin/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        if (d.display_name) setAdminName(d.display_name)
        if (d.avatar_url)   setAvatarUrl(d.avatar_url)
      })
      .catch(() => {})
  }, [])

  const navRef = useRef<HTMLElement>(null)
  const SCROLL_KEY = 'sidebar_scroll'

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) el.scrollTop = parseInt(saved, 10)
  }, [])

  const handleScroll = useCallback(() => {
    if (navRef.current) sessionStorage.setItem(SCROLL_KEY, String(navRef.current.scrollTop))
  }, [])

  const adminLogo = dark
    ? (ui.admin_logo_dark_url  || ui.admin_logo_light_url || '')
    : (ui.admin_logo_light_url || ui.admin_logo_dark_url  || '')

  return (
    <aside className={`${collapsed ? 'w-[60px]' : 'w-[210px]'} flex-shrink-0 flex flex-col h-screen sticky top-0 bg-white dark:bg-[#0D1117] border-r border-gray-200 dark:border-[#1a2233] transition-all duration-200 relative`}>

      {/* Logo */}
      <div className={`${collapsed ? 'px-0 justify-center' : 'px-4'} py-4 flex items-center gap-3 border-b border-gray-200 dark:border-[#1a2233]`}>
        {adminLogo ? (
          <img
            src={adminLogo} alt="Logo"
            style={{ width: `${ui.admin_logo_width}px`, height: `${ui.admin_logo_height}px`, objectFit: 'contain' }}
            className="flex-shrink-0 mx-auto"
          />
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-red-500/30">
              <Key size={16} className="text-white" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                  Pro<span className="text-red-500">Keys</span>
                </div>
                <div className="text-[9px] text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-0.5">Admin</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav ref={navRef} onScroll={handleScroll} className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
        {nav.map(group => (
          <div key={group.section}>
            {!collapsed && (
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600 px-3 pt-4 pb-1.5">
                {group.section}
              </p>
            )}
            {collapsed && <div className="pt-3"/>}
            {group.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon   = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'} rounded-lg text-[12.5px] font-medium transition-all duration-150 relative group
                    ${active
                      ? 'bg-red-50 dark:bg-[#1a2233] text-red-600 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-[#1a2233] hover:text-gray-800 dark:hover:text-gray-300'
                    }`}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-red-500 rounded-r-full" />
                  )}
                  <Icon
                    size={15}
                    className={active ? 'text-red-500' : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400'}
                  />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {item.href === '/tickets' && openTickets > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-red-500 ${collapsed ? 'absolute top-1 right-1' : ''}`}>
                      {openTickets}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 py-2 border-t border-gray-200 dark:border-[#1a2233]">
        <div className={`flex items-center ${collapsed ? 'justify-center px-1' : 'gap-2.5 px-3'} py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a2233] transition-colors group`}
          title={collapsed ? adminName : undefined}>
          <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {avatarUrl
              ? <img src={avatarUrl} alt={adminName} className="w-full h-full object-cover"/>
              : adminName.slice(0, 2).toUpperCase()
            }
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 truncate">{adminName}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-600">Administrator</div>
              </div>
              <button onClick={signOut} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <LogOut size={13} className="text-gray-400 hover:text-red-500 transition-colors" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 bottom-16 w-6 h-6 rounded-full bg-white dark:bg-[#0D1117] border border-gray-200 dark:border-[#1a2233] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
      >
        <ChevronLeft size={13} className={`text-gray-500 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}/>
      </button>
    </aside>
  )
}
