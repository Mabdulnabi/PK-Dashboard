'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, MessageSquare, ShoppingBag, Tag,
  PackageCheck, Archive, Globe, Server, BarChart3, Receipt,
  Bell, Upload, Settings, SlidersHorizontal, Key, LogOut, UserCircle,
  Gauge, Layers,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useUISettings } from '@/lib/use-ui-settings'

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
    { label: 'Alerts',       href: '/alerts',       icon: Bell },
    { label: 'Site Settings',href: '/site-settings',icon: Globe },
    { label: 'Import',       href: '/import',       icon: Upload },
    { label: 'Settings',     href: '/settings',     icon: Settings },
    { label: 'UI Settings',  href: '/ui-settings',  icon: SlidersHorizontal },
  ]},
]

export default function Sidebar({ userName = 'Admin' }: { userName?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const ui       = useUISettings()
  const signOut  = async () => { await supabase.auth.signOut(); router.push('/auth/login') }

  const adminLogo = ui.admin_logo_dark_url || ''

  return (
    <aside
      className="w-[210px] flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: '#0D1117', borderRight: '1px solid #1a2233' }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #1a2233' }}>
        {adminLogo ? (
          <img
            src={adminLogo} alt="Logo"
            style={{ width: `${ui.admin_logo_width}px`, height: `${ui.admin_logo_height}px`, objectFit: 'contain' }}
            className="flex-shrink-0"
          />
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-red-500/30">
              <Key size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight tracking-tight">
                Pro<span className="text-red-400">Keys</span>
              </div>
              <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">Admin</div>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-800">
        {nav.map(group => (
          <div key={group.section}>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-gray-600 px-3 pt-4 pb-1.5">
              {group.section}
            </p>
            {group.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon   = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150 relative group"
                  style={{
                    background: active ? '#1a2233' : 'transparent',
                    color:      active ? '#f9fafb'  : '#4b5563',
                  }}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-red-500 rounded-r-full" />
                  )}
                  <Icon
                    size={15}
                    className={active ? 'text-red-400' : 'text-gray-600 group-hover:text-gray-400'}
                  />
                  <span className="group-hover:text-gray-300 transition-colors">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 py-2" style={{ borderTop: '1px solid #1a2233' }}>
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[#1a2233] transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-gray-300 truncate">{userName}</div>
            <div className="text-[10px] text-gray-600">Administrator</div>
          </div>
          <button onClick={signOut} className="opacity-0 group-hover:opacity-100 transition-opacity">
            <LogOut size={13} className="text-gray-600 hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>
    </aside>
  )
}
