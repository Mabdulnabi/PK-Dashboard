'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, MessageSquare, ShoppingBag, Tag,
  PackageCheck, Archive, Globe, Server, BarChart3, Receipt,
  Bell, Upload, Settings, SlidersHorizontal, Key, LogOut, UserCircle,
  Gauge, Layers, ChevronLeft,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useUISettings } from '@/lib/use-ui-settings'
import { useAdminTheme } from '@/lib/admin-theme'

const nav = [
  { section: 'Overview', items: [
    { label: 'Dashboard',  href: '/dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Members', items: [
    { label: 'Members',    href: '/members',   icon: UserCircle },
    { label: 'Plans',      href: '/plans',     icon: CreditCard },
    { label: 'Support',    href: '/support',   icon: MessageSquare },
  ]},
  { section: 'Shop', items: [
    { label: 'Shop Tools', href: '/shop-admin', icon: ShoppingBag },
    { label: 'Bundles',    href: '/bundles',    icon: Layers },
    { label: 'Coupons',    href: '/coupons',    icon: Tag },
    { label: 'Orders',     href: '/orders',     icon: PackageCheck },
    { label: 'Stock',      href: '/stock',      icon: Archive },
  ]},
  { section: 'Shared Tools', items: [
    { label: 'Servers',    href: '/groupbuy',  icon: Server },
  ]},
  { section: 'Finance', items: [
    { label: 'Analytics',   href: '/analytics',        icon: BarChart3 },
    { label: 'Transactions', href: '/transactions',    icon: Receipt },
    { label: 'Payments',    href: '/payment-gateways', icon: Gauge },
  ]},
  { section: 'System', items: [
    { label: 'Alerts',       href: '/alerts',        icon: Bell },
    { label: 'Site Settings',href: '/site-settings', icon: Globe },
    { label: 'Import',       href: '/import',        icon: Upload },
    { label: 'Settings',     href: '/settings',      icon: Settings },
    { label: 'UI Settings',  href: '/ui-settings',   icon: SlidersHorizontal },
    { label: 'My Profile',   href: '/admin-profile', icon: UserCircle },
  ]},
]

export default function Sidebar({ userName = 'Admin' }: { userName?: string }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const ui          = useUISettings()
  const { dark }    = useAdminTheme()
  const [collapsed, setCollapsed] = useState(false)
  const signOut  = async () => { await supabase.auth.signOut(); router.push('/auth/login') }

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
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
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
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 py-2 border-t border-gray-200 dark:border-[#1a2233]">
        <div className={`flex items-center ${collapsed ? 'justify-center px-1' : 'gap-2.5 px-3'} py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a2233] transition-colors group`}
          title={collapsed ? userName : undefined}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 truncate">{userName}</div>
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
