'use client'
import React, { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'
import { LangProvider, useLang } from '@/lib/lang-context'
const ChatWidget    = dynamic(() => import('@/components/live-chat/ChatWidget'), { ssr: false })

/* ── Lazy tab panels — loaded once, kept alive ─────────── */
const TabSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
  </div>
)
const DashboardTab  = dynamic(() => import('./dashboard/page'),   { ssr:false, loading:()=><TabSpinner/> })
const StoreTab      = dynamic(() => import('./store/page'),        { ssr:false, loading:()=><TabSpinner/> })
const OrdersTab     = dynamic(() => import('./orders/page'),       { ssr:false, loading:()=><TabSpinner/> })
const FocusModeTab  = dynamic(() => import('./focus-mode/page'),   { ssr:false, loading:()=><TabSpinner/> })
const WalletTab     = dynamic(() => import('./wallet/page'),       { ssr:false, loading:()=><TabSpinner/> })
const TicketsTab    = dynamic(() => import('./tickets/page'),      { ssr:false, loading:()=><TabSpinner/> })
const TutorialsTab  = dynamic(() => import('./tutorials/page'),    { ssr:false, loading:()=><TabSpinner/> })
const BlogsTab      = dynamic(() => import('./blogs/page'),        { ssr:false, loading:()=><TabSpinner/> })
const QuickLinksTab = dynamic(() => import('./quick-links/page'),  { ssr:false, loading:()=><TabSpinner/> })
const ProfileTab    = dynamic(() => import('./profile/page'),      { ssr:false, loading:()=><TabSpinner/> })

const TAB_MAP: Record<string, React.ComponentType> = {
  '/u/dashboard':  DashboardTab,
  '/u/store':      StoreTab,
  '/u/orders':     OrdersTab,
  '/u/focus-mode': FocusModeTab,
  '/u/wallet':     WalletTab,
  '/u/tickets':    TicketsTab,
  '/u/tutorials':  TutorialsTab,
  '/u/blogs':      BlogsTab,
  '/u/quick-links': QuickLinksTab,
  '/u/profile':    ProfileTab,
}
const TAB_HREFS = Object.keys(TAB_MAP)
import { useUISettings } from '@/lib/use-ui-settings'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Bell, Sun, Moon, SunMoon, ChevronDown, ChevronLeft, Globe, DollarSign, X, Menu, AlarmClock, GripVertical, SlidersHorizontal, ChevronUp, ShoppingCart } from 'lucide-react'
import { CartProvider, useCart } from '@/lib/cart-context'
import {
  HouseSimple, ShoppingBag, Wallet, Headset, PlayCircle,
  UserCircle, Key, GraduationCap, ClipboardText, Article, LinkSimple,
} from '@phosphor-icons/react'

interface Member { id?:string; full_name:string; email:string; plan_slug:string; expires_at:string; member_code?:string; avatar_url?:string }

const NAV_BASE = [
  { en:'Dashboard',            ar:'الرئيسية',          href:'/u/dashboard',     icon:HouseSimple,  color:'#6366f1' },
  { en:'Pro Keys Store',       ar:'متجر Pro Keys',      href:'/u/store',         icon:ShoppingBag,  color:'#d99401' },
  { en:'My Orders',            ar:'طلباتي',            href:'/u/orders',        icon:ClipboardText,color:'#0ea5e9' },
  { en:'Focus Mode',           ar:'وضع التركيز',       href:'/u/focus-mode',    icon:GraduationCap,color:'#06b6d4' },
  { en:'My Wallet',            ar:'محفظتي',            href:'/u/wallet',        icon:Wallet,       color:'#22c55e' },
  { en:'Tickets',              ar:'تذاكر الدعم',       href:'/u/tickets',       icon:Headset,      color:'#f97316' },
  { en:'Educational Videos',   ar:'فيديوهات تعليمية', href:'/u/tutorials',     icon:PlayCircle,   color:'#ec4899' },
  { en:'Blogs',                ar:'مقالات',            href:'/u/blogs',         icon:Article,      color:'#8b5cf6' },
  { en:'Quick Links',          ar:'روابط سريعة',       href:'/u/quick-links',   icon:LinkSimple,   color:'#14b8a6' },
  { en:'My Account',           ar:'حسابي',             href:'/u/profile',       icon:UserCircle,   color:'#64748b' },
]


function CartIcon() {
  const { cartCount } = useCart()
  return (
    <Link href="/u/cart"
      className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
      <ShoppingCart size={14}/>
      {cartCount > 0 && (
        <span className="absolute -top-1 -end-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none" style={{background:'#d99401'}}>
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </Link>
  )
}

function FirstVisitPopup() {
  const { lang, currency, setLang, setCurrency } = useLang()
  const [visible, setVisible] = useState(false)
  const [selLang, setSelLang] = useState<'en'|'ar'>('en')
  const [selCurrency, setSelCurrency] = useState<'egp'|'usd'>('egp')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem('pk_lang_selected')) {
      setSelLang((localStorage.getItem('pk_lang') || 'en') as 'en'|'ar')
      setSelCurrency((localStorage.getItem('pk_currency') || 'egp') as 'egp'|'usd')
      setVisible(true)
    }
  }, [])

  const confirm = () => {
    setLang(selLang)
    setCurrency(selCurrency)
    localStorage.setItem('pk_lang_selected', '1')
    setVisible(false)
  }

  if (!visible) return null

  const isAr = selLang === 'ar'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)'}}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden" dir={isAr?'rtl':'ltr'}>
        {/* Header */}
        <div className="px-7 pt-8 pb-4 text-center">
          <div className="text-4xl mb-3">🌍</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isAr ? 'اختر لغتك والعملة' : 'Choose your language & currency'}
          </h2>
          <p className="text-sm text-gray-400 mt-1.5">
            {isAr ? 'يمكنك تغييرهما في أي وقت من صفحة حسابي' : 'You can change these anytime from My Account'}
          </p>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Language */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2.5">
              {isAr ? 'اللغة' : 'Language'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key:'en', flag:'🇬🇧', label:'English',  sub:'English' },
                { key:'ar', flag:'🇪🇬', label:'العربية', sub:'Arabic'  },
              ] as const).map(o => (
                <button key={o.key} onClick={()=>setSelLang(o.key)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                    selLang===o.key
                      ? 'border-[#d99401] bg-[#d9940110]'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <span className="text-3xl">{o.flag}</span>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${selLang===o.key?'text-[#b37a00]':'text-gray-800 dark:text-gray-100'}`}>{o.label}</p>
                    <p className="text-[10px] text-gray-400">{o.sub}</p>
                  </div>
                  {selLang===o.key && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{background:'#d99401'}}>
                      <ChevronDown size={10} className="text-white -rotate-90"/>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2.5">
              {isAr ? 'العملة' : 'Currency'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key:'egp', label:'🇪🇬 EGP', sub: isAr?'جنيه مصري':'Egyptian Pound' },
                { key:'usd', label:'🇺🇸 USD', sub: isAr?'دولار أمريكي':'US Dollar'       },
              ] as const).map(o => (
                <button key={o.key} onClick={()=>setSelCurrency(o.key)}
                  className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all ${
                    selCurrency===o.key
                      ? 'border-[#d99401] bg-[#d9940110]'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <p className={`text-sm font-bold ${selCurrency===o.key?'text-[#b37a00]':'text-gray-800 dark:text-gray-100'}`}>{o.label}</p>
                  <p className="text-[10px] text-gray-400">{o.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Confirm */}
          <button onClick={confirm}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{background:'linear-gradient(135deg,#d99401,#f59e0b)'}}>
            {isAr ? 'تأكيد والمتابعة ✓' : 'Confirm & Continue ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UserLayoutInner({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [member,        setMember]   = useState<Member|null>(null)
  const [loading,       setLoading]  = useState(true)
  const [themeMode, setThemeMode] = useState<'auto'|'dark'|'light'>('auto')
  const [dark,      setDark]      = useState(false)
  const { lang, currency, setLang, setCurrency } = useLang()
  const ui = useUISettings()
const [sidebarOpen,   setSidebar]    = useState(false)
  const [collapsed,     setCollapsed]  = useState(false)
  const [profileOpen,   setProfile]    = useState(false)
  const [notifOpen,     setNotif]      = useState(false)
  const [notifications, setNotifs]     = useState<any[]>([])
  const [taskAlert,     setTaskAlert]  = useState<{id:string; title:string} | null>(null)
  const dismissedReminders = useRef(new Set<string>())
  const [navOrder, setNavOrder] = useState<number[]>(()=>{
    if (typeof window === 'undefined') return NAV_BASE.map((_,i)=>i)
    try {
      const s = localStorage.getItem('pk_nav_order')
      if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length === NAV_BASE.length) return p }
    } catch {}
    return NAV_BASE.map((_,i)=>i)
  })
  const nav = navOrder.map(i => NAV_BASE[i])
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [dragIdx,     setDragIdx]     = useState<number|null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number|null>(null)
  const reorderNav = (from: number, to: number) => {
    if (from === to) return
    const o = [...navOrder]; const [item] = o.splice(from, 1); o.splice(to, 0, item)
    setNavOrder(o); localStorage.setItem('pk_nav_order', JSON.stringify(o))
  }
  const resetNav = () => { const o = NAV_BASE.map((_,i)=>i); setNavOrder(o); localStorage.removeItem('pk_nav_order') }
  // Tab keep-alive: track which tabs have been mounted so they stay in DOM
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => {
    const tab = TAB_HREFS.find(h => pathname === h)
    return tab ? new Set([tab]) : new Set<string>()
  })
  const [activeTab, setActiveTab] = useState<string|null>(() =>
    TAB_HREFS.find(h => pathname === h) ?? null
  )

  const [newEmail,      setNewEmail]   = useState('')
  const [newPassword,   setNewPassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg,    setProfileMsg]  = useState('')

  useEffect(()=>{
    if (pathname==='/u/login') { setLoading(false); return }
    fetch('/api/member/verify').then(r=>{
      if (!r.ok) { router.push('/landing'); return null }
      return r.json()
    }).then(d=>{ if(d){ setMember({ ...d, id: d.member_id }); setNewEmail(d.email||''); setLoading(false) } })
  },[router,pathname])

  useEffect(()=>{
    if (!member?.id) return
    const fetchNotifs = () =>
      fetch('/api/member/notifications').then(r=>r.json()).then(d=>setNotifs(d.notifications||[]))
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30_000)

    // Realtime: instant bell ring when new notification arrives
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const channel = supabase
      .channel(`member-notifs-${member.id}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'member_notifications',
        filter: `member_id=eq.${member.id}`,
      }, (payload) => {
        setNotifs(prev => [payload.new as any, ...prev])
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  },[member?.id])

  useEffect(()=>{
    if (!member) return
    const ping = () => fetch('/api/member/ping', { method: 'POST' }).catch(()=>{})
    ping()
    const interval = setInterval(ping, 60_000)
    return () => clearInterval(interval)
  },[member])

  useEffect(()=>{
    if (!member) return
    const check = async () => {
      try {
        const r = await fetch('/api/member/focus-reminders')
        const d = await r.json()
        const due = (d.reminders||[]).find((x:any) => !dismissedReminders.current.has(x.id))
        if (due) setTaskAlert(due)
      } catch {}
    }
    check()
    const t = setInterval(check, 60_000)
    return () => clearInterval(t)
  },[member])

  // close sidebar on route change
  useEffect(()=>{ setSidebar(false) },[pathname])

  // sync active tab on pathname change (back/forward or direct URL)
  useEffect(()=>{
    const tab = TAB_HREFS.find(h => pathname === h)
    if (tab) {
      setMountedTabs(prev => { const s = new Set(prev); s.add(tab); return s })
      setActiveTab(tab)
    } else {
      setActiveTab(null)
    }
  },[pathname])

  // Apply theme on mount + auto-check interval
  useEffect(()=>{
    const applyMode = (m: 'auto'|'dark'|'light') => {
      const h = new Date().getHours()
      const isDark = m === 'dark' || (m === 'auto' && (h >= 20 || h < 7))
      setDark(isDark)
      setThemeMode(m)
      document.documentElement.classList.toggle('dark', isDark)
    }
    const saved = (localStorage.getItem('pk_theme') || 'auto') as 'auto'|'dark'|'light'
    applyMode(saved)
    const interval = setInterval(()=>{
      const current = (localStorage.getItem('pk_theme') || 'auto') as 'auto'|'dark'|'light'
      if (current === 'auto') applyMode('auto')
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  },[])

  const cycleTheme = ()=>{
    // auto → light → dark → auto
    const next = themeMode === 'auto' ? 'light' : themeMode === 'light' ? 'dark' : 'auto'
    setThemeMode(next)
    localStorage.setItem('pk_theme', next)
    const h = new Date().getHours()
    const isDark = next === 'dark' || (next === 'auto' && (h >= 20 || h < 7))
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }

  const logout = async()=>{
    await fetch('/api/member/verify',{method:'DELETE'})
    router.push('/landing')
  }

  const navigateTo = (href: string) => {
    if (TAB_HREFS.includes(href)) {
      setMountedTabs(prev => { const s = new Set(prev); s.add(href); return s })
      setActiveTab(href)
      router.push(href, { scroll: false })
    } else {
      router.push(href)
    }
  }

  const saveProfile = async()=>{
    setProfileMsg(''); setProfileSaving(true)
    const res  = await fetch('/api/member/profile',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email:newEmail, password:newPassword||undefined }) })
    const data = await res.json()
    setProfileSaving(false)
    if (!res.ok) { setProfileMsg(data.error||'Error'); return }
    setProfileMsg(lang==='ar'?'تم الحفظ ✓':'Saved ✓')
    setNewPassword('')
    if (newEmail && member) setMember({...member, email:newEmail})
    setTimeout(()=>setProfileMsg(''),3000)
  }

if (pathname==='/u/login') return <>{children}</>
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
    </div>
  )

  const unread = notifications.filter(n=>!n.is_read).length
  const isRtl  = lang==='ar'

  const SidebarContent = ({ forMobile = false }: { forMobile?: boolean }) => {
    const col = !forMobile && collapsed
    return (
    <>
      {/* Logo — hidden when collapsed */}
      {!col && (
        <Link href="/u/dashboard" className="flex items-center justify-center gap-2.5 px-4 py-4 border-b border-transparent hover:opacity-80 transition-opacity">
          {(ui.logo_light_url || ui.logo_dark_url || ui.logo_url) ? (() => {
            const w = Number(ui.logo_width) || 40
            const h = Number(ui.logo_height) || 40
            return (
              <div style={{ width:w, height:h, position:'relative', flexShrink:0, overflow:'hidden' }}>
                <img src={ui.logo_light_url || ui.logo_url} alt="Logo"
                  style={{ position:'absolute', top:0, left:0, width:w, height:h, objectFit:'contain', opacity: dark ? 0 : 1, transition:'opacity 0.15s' }}/>
                <img src={ui.logo_dark_url || ui.logo_url} alt="Logo"
                  style={{ position:'absolute', top:0, left:0, width:w, height:h, objectFit:'contain', opacity: dark ? 1 : 0, transition:'opacity 0.15s' }}/>
              </div>
            )
          })() : (
            <>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'#d99401',boxShadow:'0 4px 10px #d9940140'}}>
                <Key size={16} className="text-white"/>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Pro<span style={{color:'#d99401'}}>Keys</span></div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">{isRtl?'منطقة الأعضاء':'Member Portal'}</div>
              </div>
            </>
          )}
        </Link>
      )}
      {col && <div className="h-[57px]"/>}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {nav.map((item, idx)=>{
          const Icon   = item.icon
          const active = pathname===item.href||pathname.startsWith(item.href+'/')
          return (
            <motion.div key={item.href} whileHover="hover">
            <div role="button" onClick={()=>navigateTo(item.href)}
              title={col ? (isRtl ? item.ar : item.en) : undefined}
              className={`cursor-pointer relative flex items-center ${col ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5'} rounded-lg text-sm font-medium ${active?'':'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {active && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-lg" style={{background: item.color+'15'}} transition={{type:'spring',stiffness:350,damping:30}}/>}
              <motion.div
                variants={{hover:{scale:1.18, rotate: isRtl ? -8 : 8}}}
                transition={{type:'spring', stiffness:400, damping:15}}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: item.color + (active?'25':'18')}}>
                <Icon size={15} weight="duotone" style={{color: item.color}}/>
              </motion.div>
              {!col && <span style={active ? {color: item.color, fontWeight:600} : {}}>{isRtl?item.ar:item.en}</span>}
            </div>
            </motion.div>
          )
        })}
      </nav>

      {/* Customize sidebar button */}
      {!col && (
        <button onClick={()=>setCustomizeOpen(true)}
          className="mx-3 mb-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-[calc(100%-24px)]">
          <SlidersHorizontal size={12}/><span>Customize sidebar</span>
        </button>
      )}

      {/* User */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-3">
        <button onClick={()=>setProfile(o=>!o)}
          title={col ? member?.full_name : undefined}
          className={`w-full flex items-center ${col ? 'justify-center px-0' : 'gap-2.5 px-2'} py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden" style={{background:'#d99401'}}>
            {member?.avatar_url
              ? <img src={member.avatar_url} className="w-full h-full object-cover" alt=""/>
              : member?.full_name?.slice(0,1).toUpperCase()}
          </div>
          {!col && (
            <>
              <div className="flex-1 text-start min-w-0">
                <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{member?.full_name}</div>
                {member?.member_code && (
                  <div className="mt-0.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>{member.member_code}</span>
                  </div>
                )}
              </div>
              <ChevronDown size={13} className="text-gray-400 flex-shrink-0"/>
            </>
          )}
        </button>
      </div>
    </>
  )
  }

  return (
    <div className={`flex h-screen overflow-hidden ${dark?'dark':''}`} dir={isRtl?'rtl':'ltr'}>

      {/* ── Desktop Sidebar ─────────────────────────── */}
      <aside className={`hidden md:flex ${collapsed ? 'w-[66px]' : 'w-[220px]'} flex-shrink-0 flex-col h-screen bg-white dark:bg-[#111827] border-r border-gray-200 dark:border-gray-800 transition-all duration-200 relative`}>
        {SidebarContent({})}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`absolute -${isRtl ? 'left' : 'right'}-3 bottom-16 w-6 h-6 rounded-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10`}
        >
          <ChevronLeft size={13} className={`text-gray-500 transition-transform duration-200 ${isRtl ? (collapsed ? '' : 'rotate-180') : (collapsed ? 'rotate-180' : '')}`}/>
        </button>
      </aside>

      {/* ── Mobile Sidebar overlay ───────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" dir={isRtl?'rtl':'ltr'}>
          <div className="fixed inset-0 bg-black/40" onClick={()=>setSidebar(false)}/>
          <div className={`relative w-64 flex flex-col h-full bg-white dark:bg-[#111827] shadow-2xl ${isRtl?'border-l':'ml-0 border-r'} border-gray-200 dark:border-gray-800`}>
            <button onClick={()=>setSidebar(false)} className="absolute top-3 end-3 w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 z-10">
              <X size={14}/>
            </button>
            {SidebarContent({forMobile:true})}
          </div>
        </div>
      )}

      {/* ── Main ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-3 md:px-5 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-gray-800 flex-shrink-0" style={{height:'58px'}}>

          {/* Left: hamburger (mobile) + welcome */}
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={()=>setSidebar(true)} className="md:hidden w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Menu size={16}/>
            </button>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {isRtl?'أهلاً':'Welcome'}{' '}
                <span style={{color:'#d99401'}}>
                  <span className="sm:hidden">{member?.full_name?.split(' ')[0]}!</span>
                  <span className="hidden sm:inline">{member?.full_name}!</span>
                </span>
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">{isRtl?'الوصول لجميع الأدوات النشطة':'Access all active tools'}</span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Theme cycle: auto → light → dark */}
            <button onClick={cycleTheme} title={themeMode === 'auto' ? 'Auto' : themeMode === 'light' ? 'Light' : 'Dark'}
              className={`w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                themeMode !== 'auto' ? 'text-gray-600 dark:text-white' : ''
              }`}
              style={themeMode === 'auto' ? {color:'#d99401'} : {}}>
              {themeMode === 'light' ? <Sun size={14}/> : themeMode === 'dark' ? <Moon size={14}/> : <SunMoon size={14}/>}
            </button>
            {/* Cart */}
            <CartIcon/>
            {/* Notifications */}
            <div className="relative">
              <button onClick={()=>{
                  setNotif(o=>{
                    if(!o && unread>0) {
                      fetch('/api/member/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({})})
                        .then(()=>setNotifs(ns=>ns.map(n=>({...n,is_read:true}))))
                    }
                    return !o
                  })
                }}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
                <Bell size={14}/>
                {unread>0&&<span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>}
              </button>
              {notifOpen&&(
                <div className="absolute end-0 top-10 w-72 sm:w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{isRtl?'الإشعارات':'Notifications'}</span>
                      {unread>0&&<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{background:'#d99401'}}>{unread}</span>}
                    </div>
                    <button onClick={()=>setNotif(false)}><X size={14} className="text-gray-400"/></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                    {notifications.length===0
                      ? <p className="text-center py-8 text-sm text-gray-400">{isRtl?'لا توجد إشعارات':'No notifications'}</p>
                      : notifications.map((n,i)=>{
                          const displayTitle   = (!isRtl && n.title_en)   ? n.title_en   : n.title
                          const displayMessage = (!isRtl && n.message_en) ? n.message_en : n.message
                          const inner = (
                            <>
                              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{displayTitle}</div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{displayMessage}</div>
                              <div className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{new Date(n.created_at).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}</div>
                            </>
                          )
                          const cls = `block px-4 py-3 w-full text-start ${!n.is_read?'bg-blue-50/60 dark:bg-blue-900/10':''} ${n.link?'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer':''}`
                          return n.link
                            ? <Link key={i} href={n.link} className={cls} onClick={()=>setNotif(false)}>{inner}</Link>
                            : <div key={i} className={cls}>{inner}</div>
                        })
                    }
                  </div>
                </div>
              )}
            </div>
            {/* Logout */}
            <button onClick={logout}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-[#d99401] hover:bg-[#d9940112] transition-colors">
              <LogOut size={14}/>
            </button>
          </div>
        </header>

        {/* Task reminder banner */}
        {taskAlert && (
          <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0 z-40" style={{background:'linear-gradient(90deg,#d99401,#f59e0b)'}}>
            <AlarmClock size={15} className="flex-shrink-0 animate-pulse"/>
            <span className="flex-1">{isRtl ? 'تذكير: ' : 'Reminder: '}{taskAlert.title}</span>
            <button onClick={()=>{ dismissedReminders.current.add(taskAlert.id); setTaskAlert(null) }}
              className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0">
              <X size={12}/>
            </button>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto relative">
          {/* Keep-alive tab panels — mounted once, hidden when inactive */}
          {Array.from(mountedTabs).map(href => {
            const TabComp = TAB_MAP[href]
            const isActive = href === activeTab
            return (
              <div key={href} style={{display: isActive ? 'block' : 'none', position:'absolute', inset:0, overflowY:'auto'}}>
                <TabComp/>
              </div>
            )
          })}
          {/* Sub-route children (e.g. /u/blogs/123, /u/tickets/456) */}
          {!activeTab && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={pathname}
                initial={{opacity:0, y:16}}
                animate={{opacity:1, y:0}}
                exit={{opacity:0, y:-10}}
                transition={{duration:0.22, ease:[0.25,0.46,0.45,0.94]}}
                style={{position:'absolute', inset:0, overflowY:'auto'}}>
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* First-visit language & currency picker */}
      <FirstVisitPopup/>

      {/* ── Profile popup ──────────────────────────── */}
      {profileOpen&&(
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end justify-start p-4" onClick={()=>setProfile(false)}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-72 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden" style={{background:'#d99401'}}>
                {member?.avatar_url
                  ? <img src={member.avatar_url} className="w-full h-full object-cover" alt=""/>
                  : member?.full_name?.slice(0,1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{member?.full_name}</div>
                  {member?.member_code && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>{member.member_code}</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 truncate">{member?.email}</div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">{isRtl?'البريد الإلكتروني':'Email'}</label>
                <input value={newEmail} onChange={e=>setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-[#d99401] transition-all"/>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">{isRtl?'كلمة مرور جديدة':'New Password'}</label>
                <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                  placeholder={isRtl?'اتركه فارغاً للإبقاء على الحالية':'Leave blank to keep current'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#d99401] transition-all"/>
              </div>
              {profileMsg && (
                <p className={`text-xs font-medium ${profileMsg.includes('✓')||profileMsg.includes('تم')?'text-emerald-500':'text-red-500'}`}>{profileMsg}</p>
              )}
              <button onClick={saveProfile} disabled={profileSaving}
                className="w-full py-2 rounded-lg disabled:opacity-60 text-white text-sm font-bold transition-colors" style={{background:'#d99401'}}>
                {profileSaving?(isRtl?'جاري الحفظ...':'Saving...'):(isRtl?'حفظ التغييرات':'Save Changes')}
              </button>
              <button onClick={logout}
                className="w-full py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-[#d99401] hover:border-[#d9940150] flex items-center justify-center gap-1.5 transition-colors">
                <LogOut size={14}/>{isRtl?'تسجيل الخروج':'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customize sidebar modal ─────────────────── */}
      {customizeOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setCustomizeOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-80 overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{isRtl ? 'تخصيص الشريط الجانبي' : 'Customize Sidebar'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isRtl ? 'اسحب لإعادة الترتيب' : 'Drag items to reorder'}</p>
              </div>
              <button onClick={()=>setCustomizeOpen(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={14}/></button>
            </div>

            {/* Draggable list */}
            <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
              {nav.map((item, idx) => {
                const Icon = item.icon
                const isDragging = dragIdx === idx
                const isOver     = dragOverIdx === idx && dragIdx !== idx
                return (
                  <div key={item.href}
                    draggable
                    onDragStart={()=>setDragIdx(idx)}
                    onDragOver={e=>{ e.preventDefault(); setDragOverIdx(idx) }}
                    onDrop={()=>{ reorderNav(dragIdx!, idx); setDragIdx(null); setDragOverIdx(null) }}
                    onDragEnd={()=>{ setDragIdx(null); setDragOverIdx(null) }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing select-none transition-all border-2 ${isDragging ? 'opacity-40 scale-[0.97]' : ''} ${isOver ? 'scale-[1.01]' : ''}`}
                    style={{
                      background: isDragging ? 'transparent' : isOver ? item.color+'08' : undefined,
                      borderColor: isOver ? item.color+'66' : 'transparent',
                      borderStyle: isOver ? 'dashed' : 'solid',
                    }}>
                    <GripVertical size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0"/>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background: item.color+'20'}}>
                      <Icon size={14} weight="duotone" style={{color: item.color}}/>
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{isRtl ? item.ar : item.en}</span>
                    {/* Up / Down arrows */}
                    <div className="flex flex-col gap-0.5">
                      <button onClick={()=>reorderNav(idx, idx-1)} disabled={idx===0}
                        className="w-5 h-4 rounded flex items-center justify-center text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronUp size={11}/>
                      </button>
                      <button onClick={()=>reorderNav(idx, idx+1)} disabled={idx===nav.length-1}
                        className="w-5 h-4 rounded flex items-center justify-center text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronDown size={11}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <button onClick={resetNav} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                {isRtl ? 'إعادة الترتيب الافتراضي' : 'Reset to default'}
              </button>
              <button onClick={()=>setCustomizeOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                style={{background:'#d99401'}}>
                {isRtl ? 'تم' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function FloatingCart() {
  const { cartCount } = useCart()
  const { lang } = useLang()
  const isRtl = lang === 'ar'
  if (cartCount === 0) return null
  return (
    <Link href="/u/cart"
      className={`fixed z-50 ${isRtl ? 'left-5' : 'right-5'} flex items-center gap-2 px-3.5 py-2.5 rounded-2xl shadow-xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95`}
      style={{ bottom: '5.5rem', background: '#d99401', boxShadow: '0 4px 20px #d9940150' }}>
      <ShoppingCart size={16}/>
      <span>{cartCount}</span>
    </Link>
  )
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <CartProvider>
        <UserLayoutInner>{children}</UserLayoutInner>
        <FloatingCart/>
        <ChatWidget/>
      </CartProvider>
    </LangProvider>
  )
}
