'use client'
import { useEffect, useState } from 'react'
import { LangProvider, useLang } from '@/lib/lang-context'
import { useUISettings } from '@/lib/use-ui-settings'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, ShoppingBag, Clock, HelpCircle, PlayCircle,
  Key, LogOut, Bell, Sun, Moon, ChevronDown, Globe, DollarSign, X, Check
} from 'lucide-react'

interface Member { full_name:string; email:string; plan_slug:string; expires_at:string }

const nav = [
  { en:'Dashboard',       ar:'الرئيسية',    href:'/u/dashboard', icon:LayoutDashboard },
  { en:'Buy Tools',       ar:'المتجر',       href:'/u/shop',      icon:ShoppingBag, sub:[
    { en:'Shared Tools',  ar:'أدوات مشتركة', href:'/u/shop/shared'  },
    { en:'Private Tools', ar:'أدوات خاصة',   href:'/u/shop/private' },
    { en:'Bundle Tools',  ar:'حزم الأدوات',  href:'/u/shop/bundle'  },
  ]},
  { en:'Payment History', ar:'المدفوعات',   href:'/u/payments',  icon:Clock },
  { en:'HelpDesk',        ar:'الدعم',        href:'/u/helpdesk',  icon:HelpCircle },
  { en:'Tutorial Videos', ar:'الدروس',       href:'/u/tutorials', icon:PlayCircle },
]

const PLAN_COLOR:any = { basic:'#3B82F6', vip:'#F59E0B', private:'#8B5CF6' }

function UserLayoutInner({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [member,        setMember]   = useState<Member|null>(null)
  const [loading,       setLoading]  = useState(true)
  const [dark,          setDark]     = useState(false)
  const { lang, currency, setLang, setCurrency } = useLang()
  const ui = useUISettings()
  const [shopOpen,      setShopOpen] = useState(false)
  const [profileOpen,   setProfile]  = useState(false)
  const [notifOpen,     setNotif]    = useState(false)
  const [notifications, setNotifs]   = useState<any[]>([])

  // Profile form state
  const [newEmail,    setNewEmail]    = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(()=>{
    if (pathname==='/u/login') { setLoading(false); return }
    fetch('/api/member/verify').then(r=>{
      if (!r.ok) { router.push('/u/login'); return null }
      return r.json()
    }).then(d=>{ if(d){ setMember(d); setNewEmail(d.email||''); setLoading(false) } })
  },[router,pathname])

  useEffect(()=>{
    if (!member) return
    fetch('/api/member/notifications').then(r=>r.json()).then(d=>setNotifs(d.notifications||[]))
  },[member])

  const toggleDark = ()=>{
    const next = !dark; setDark(next)
    document.documentElement.classList.toggle('dark',next)
  }

  const logout = async()=>{
    await fetch('/api/member/verify',{method:'DELETE'})
    router.push('/u/login')
  }

  if (pathname==='/u/login') return <>{children}</>
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const unread = notifications.filter(n=>!n.is_read).length

  return (
    <div className={`flex h-screen overflow-hidden ${dark?'dark':''}`} dir={lang==='ar'?'rtl':'ltr'}>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="w-[200px] flex-shrink-0 flex flex-col h-screen bg-white dark:bg-[#111827] border-r border-gray-200 dark:border-gray-800">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          {(ui.logo_light_url || ui.logo_dark_url || ui.logo_url) ? (() => {
            const w = Number(ui.logo_width) || 40
            const h = Number(ui.logo_height) || 40
            return (
              <div style={{ width:w, height:h, position:'relative', flexShrink:0 }}>
                <img src={ui.logo_light_url || ui.logo_url} alt="Logo"
                  style={{ position:'absolute', top:0, left:0, width:w, height:h, objectFit:'contain', opacity: dark ? 0 : 1, transition:'opacity 0.15s' }}/>
                <img src={ui.logo_dark_url || ui.logo_url} alt="Logo"
                  style={{ position:'absolute', top:0, left:0, width:w, height:h, objectFit:'contain', opacity: dark ? 1 : 0, transition:'opacity 0.15s' }}/>
              </div>
            )
          })() : (
            <>
              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center shadow-md shadow-red-500/30 flex-shrink-0">
                <Key size={16} className="text-white"/>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
                  Pro<span className="text-red-500">Keys</span>
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">{lang==='ar'?'منطقة الأعضاء':'Member Portal'}</div>
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {nav.map(item=>{
            const Icon   = item.icon
            const active = pathname===item.href||pathname.startsWith(item.href+'/')
            if (item.sub) return (
              <div key={item.href}>
                <button onClick={()=>setShopOpen(o=>!o)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active?'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <Icon size={16}/>
                  <span className="flex-1 text-start">{lang==='ar'?item.ar:item.en}</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${shopOpen?'rotate-180':''}`}/>
                </button>
                {shopOpen && (
                  <div className="ms-3 mt-0.5 border-s-2 border-gray-100 dark:border-gray-700 ps-3 space-y-0.5">
                    {item.sub.map(s=>(
                      <Link key={s.href} href={s.href}
                        className={`block py-2 px-2 rounded-lg text-[13px] transition-colors ${pathname===s.href?'text-red-500 font-semibold bg-red-50 dark:bg-red-500/10':'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        {lang==='ar'?s.ar:s.en}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active?'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                <Icon size={16}/>{lang==='ar'?item.ar:item.en}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3">
          <button onClick={()=>setProfile(o=>!o)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {member?.full_name?.slice(0,1).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{member?.full_name}</div>
              <div className="text-[11px] font-semibold capitalize" style={{color:PLAN_COLOR[member?.plan_slug||'basic']}}>
{member?.plan_slug} {lang==='ar'?'باقة':'plan'}
              </div>
            </div>
            <ChevronDown size={13} className="text-gray-400 flex-shrink-0"/>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 min-w-0">

        {/* Header */}
        <header className="h-13 flex items-center justify-between px-5 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 flex-shrink-0" style={{height:'52px'}}>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {lang==='ar'?'أهلاً':'Welcome'} <span className="text-red-500">{member?.full_name}!</span>
            </span>
            <span className="text-xs text-gray-400">{lang==='ar'?'الوصول لجميع الأدوات النشطة':'Access all active tools and services'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Currency */}
            <button onClick={()=>{
                setCurrency(currency==='egp'?'usd':'egp')
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <DollarSign size={12}/>{currency.toUpperCase()}
            </button>
            {/* Language */}
            <button onClick={()=>{
                setLang(lang==='en'?'ar':'en')
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Globe size={12}/>{lang==='en'?'EN':'عربي'}
            </button>
            {/* Dark */}
            <button onClick={toggleDark}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {dark?<Sun size={14}/>:<Moon size={14}/>}
            </button>
            {/* Notifications */}
            <div className="relative">
              <button onClick={()=>setNotif(o=>!o)}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
                <Bell size={14}/>
                {unread>0&&<span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"/>}
              </button>
              {notifOpen&&(
                <div className="absolute right-0 top-10 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{lang==='ar'?'الإشعارات':'Notifications'}</span>
                    <button onClick={()=>setNotif(false)}><X size={14} className="text-gray-400"/></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                    {notifications.length===0
                      ? <p className="text-center py-8 text-sm text-gray-400">{lang==='ar'?'لا توجد إشعارات':'No notifications'}</p>
                      : notifications.map((n,i)=>(
                        <div key={i} className={`px-4 py-3 ${!n.is_read?'bg-blue-50/50 dark:bg-blue-900/10':''}`}>
                          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{n.title}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            {/* Redeem */}
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/25">
              🎁 {lang==='ar'?'استرداد كود':'Redeem Code'}
            </button>
            {/* Logout */}
            <button onClick={logout}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <LogOut size={14}/>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* ── Profile popup ──────────────────────────── */}
      {profileOpen&&(
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end justify-start p-4" onClick={()=>setProfile(false)}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-72 overflow-hidden" onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {member?.full_name?.slice(0,1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{member?.full_name}</div>
                <div className="text-[11px] text-gray-400 truncate">{member?.email}</div>
                <div className="text-[11px] font-semibold capitalize mt-0.5" style={{color:PLAN_COLOR[member?.plan_slug||'basic']}}>
                  {member?.plan_slug} · exp {member?.expires_at?new Date(member.expires_at).toLocaleDateString('en-GB'):'—'}
                </div>
              </div>
            </div>
            {/* Form */}
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">{lang==='ar'?'البريد الإلكتروني':'Email'}</label>
                <input value={newEmail} onChange={e=>setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"/>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">{lang==='ar'?'كلمة مرور جديدة':'New Password'}</label>
                <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                  placeholder={lang==='ar'?'اتركه فارغاً للإبقاء على الحالية':'Leave blank to keep current'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"/>
              </div>
              <button className="w-full py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors mt-1">
  {lang==='ar'?'حفظ التغييرات':'Save Changes'}
              </button>
              <button onClick={logout}
                className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center gap-1.5 transition-colors">
                <LogOut size={14}/>{lang==='ar'?'تسجيل الخروج':'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <UserLayoutInner>{children}</UserLayoutInner>
    </LangProvider>
  )
}
