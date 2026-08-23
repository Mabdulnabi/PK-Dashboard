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
import { MemberContext } from '@/lib/member-context'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Bell, Sun, Moon, SunMoon, ChevronDown, ChevronLeft, Globe, DollarSign, X, Menu, AlarmClock, GripVertical, SlidersHorizontal, ChevronUp, ShoppingCart } from 'lucide-react'
import { CartProvider, useCart } from '@/lib/cart-context'
import AuthModal from '@/components/auth/AuthModal'
import {
  HouseSimple, ShoppingBag, Wallet, Headset, PlayCircle,
  UserCircle, Key, GraduationCap, ClipboardText, Article, LinkSimple,
} from '@phosphor-icons/react'

interface Member { id?:string; full_name:string; email:string; plan_slug:string; expires_at:string; member_code?:string; avatar_url?:string; total_spent_egp?:number }

const RANK_TIERS = [
  { key:'regular',  ar:'عادي',    en:'Regular',  min:0,      color:'#5a8098' },
  { key:'bronze',   ar:'برونزي',  en:'Bronze',   min:1,      color:'#b06030' },
  { key:'silver',   ar:'فضي',     en:'Silver',   min:2000,   color:'#8888a0' },
  { key:'gold',     ar:'ذهبي',    en:'Gold',     min:8000,   color:'#d99401' },
  { key:'platinum', ar:'بلاتيني', en:'Platinum', min:20000,  color:'#7898b8' },
  { key:'emerald',  ar:'زمردي',   en:'Emerald',  min:40000,  color:'#18a050' },
  { key:'diamond',  ar:'ماسي',    en:'Diamond',  min:60000,  color:'#3870b8' },
] as const
type RankKey = typeof RANK_TIERS[number]['key']
function getMemberRank(spent = 0) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) if (spent >= RANK_TIERS[i].min) return RANK_TIERS[i]
  return RANK_TIERS[0]
}

const BADGE_CFG: Record<RankKey,{g0:string;g1:string;g2:string;ft:string;fur:string;fb:string;fll:string;ib:string}> = {
  regular:  {g0:'#c8dce8',g1:'#6888a0',g2:'#1e3448',ft:'#d8eaf8',fur:'#a0c0d8',fb:'#182838',fll:'#243c50',ib:'#eef4f8'},
  bronze:   {g0:'#ffe090',g1:'#c07820',g2:'#3c1400',ft:'#ffe8a0',fur:'#d89838',fb:'#301000',fll:'#5a2808',ib:'#fef4e4'},
  silver:   {g0:'#ffffff',g1:'#9898a8',g2:'#202028',ft:'#ffffff',fur:'#dcdcec',fb:'#181820',fll:'#323240',ib:'#f0f0f6'},
  gold:     {g0:'#f5d060',g1:'#d99401',g2:'#3a1800',ft:'#f5d878',fur:'#d99401',fb:'#2a1000',fll:'#5c2800',ib:'#fff4e0'},
  platinum: {g0:'#f4f8ff',g1:'#7898c0',g2:'#182840',ft:'#f8fcff',fur:'#ccdcf4',fb:'#101e34',fll:'#203050',ib:'#c8d8ee'},
  emerald:  {g0:'#a8ffcc',g1:'#14b850',g2:'#022c10',ft:'#b8ffd4',fur:'#44ec84',fb:'#011c0a',fll:'#054018',ib:'#edfff4'},
  diamond:  {g0:'#e0f0ff',g1:'#4090d8',g2:'#081428',ft:'#eaf6ff',fur:'#b0d4f8',fb:'#060e20',fll:'#102040',ib:'#eef6ff'},
}
function HexBadge({rk,size=36}:{rk:typeof RANK_TIERS[number];size?:number}) {
  const c = BADGE_CFG[rk.key]; const gid=`hg-${rk.key}-pop`
  const icons: Record<RankKey,React.ReactNode> = {
    regular: <><circle cy={-5} r={5.5} fill="#5a8098"/><path d="M-8,11 Q-8,2 0,2 Q8,2 8,11" fill="#5a8098"/></>,
    bronze:  <><polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" fill="none" stroke="#c07820" strokeWidth="2.2" strokeLinejoin="round"/><circle r={3.5} fill="#c07820"/></>,
    silver:  <><polygon points="0,-10 8.5,-5 0,0 -8.5,-5" fill="#e8e8f4"/><polygon points="-8.5,-5 0,0 0,10 -8.5,5" fill="#808090"/><polygon points="8.5,-5 8.5,5 0,10 0,0" fill="#545462"/></>,
    gold:    <><polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#a06800"/><polygon points="0,0 0,-12 10.4,-6" fill="#f5d060"/><polygon points="0,0 10.4,-6 10.4,6" fill="#c88000"/><polygon points="0,0 10.4,6 0,12" fill="#b87000"/><polygon points="0,0 0,12 -10.4,6" fill="#7a4000"/><polygon points="0,0 -10.4,6 -10.4,-6" fill="#8c5000"/><polygon points="0,0 -10.4,-6 0,-12" fill="#d99401"/></>,
    platinum:<path fill="#4a78c8" d="M0,-15 3.6,-4.7 14.3,-4.7 6.1,1.7 9.0,12.4 0,6.4 -9.0,12.4 -6.1,1.7 -14.3,-4.7 -3.6,-4.7Z"/>,
    emerald: <><polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#14a848"/><polygon points="0,-12 10.4,-6 0,-4" fill="#a0ffc8"/><polygon points="0,-12 -10.4,-6 0,-4" fill="#70f0a0"/><polygon points="10.4,-6 10.4,6 0,0 0,-4" fill="#0a8030"/><polygon points="-10.4,-6 -10.4,6 0,0 0,-4" fill="#14a040"/><polygon points="10.4,6 0,12 -10.4,6 0,0" fill="#086028"/></>,
    diamond: <><polygon points="-9,-13 9,-13 15,-2 -15,-2" fill="#90c4f4"/><polygon points="-9,-13 0,-8 -15,-2" fill="#e0f4ff"/><polygon points="9,-13 15,-2 0,-8" fill="#cce8ff"/><polygon points="-9,-13 9,-13 0,-8" fill="#f4faff"/><polygon points="-15,-2 15,-2 0,14" fill="#4898e0"/><polygon points="-15,-2 0,-2 0,14" fill="#2870c0"/><polygon points="15,-2 0,14 0,-2" fill="#7ab8f0"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="-42 -48 84 96">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={c.g0}/><stop offset="50%" stopColor={c.g1}/><stop offset="100%" stopColor={c.g2}/></linearGradient></defs>
      <polygon points="20,-29 38,3 20,35 -20,35 -38,3 -20,-29" fill="#000" opacity="0.22" transform="translate(2,5)"/>
      <polygon points="18,-32 36,0 18,32 -18,32 -36,0 -18,-32" fill={`url(#${gid})`}/>
      <polygon points="-18,-32 18,-32 11,-20 -11,-20" fill={c.ft} opacity="0.92"/>
      <polygon points="18,-32 36,0 23,0 11,-20" fill={c.fur} opacity="0.85"/>
      <polygon points="18,32 -18,32 -11,20 11,20" fill={c.fb} opacity="0.88"/>
      <polygon points="-18,32 -36,0 -23,0 -11,20" fill={c.fll} opacity="0.75"/>
      <circle r="23" fill="#fff"/>
      <circle r="17" fill={c.ib}/>
      {icons[rk.key]}
    </svg>
  )
}

const NAV_BASE = [
  { en:'Dashboard',            ar:'الرئيسية',          href:'/u/dashboard',     icon:HouseSimple,  color:'#6366f1', iconKey:''                  },
  { en:'Store',                ar:'المتجر',             href:'/u/store',         icon:ShoppingBag,  color:'#d99401', iconKey:'icon_shop'          },
  { en:'My Orders',            ar:'طلباتي',            href:'/u/orders',        icon:ClipboardText,color:'#0ea5e9', iconKey:'icon_orders'        },
  { en:'Focus Mode',           ar:'وضع التركيز',       href:'/u/focus-mode',    icon:GraduationCap,color:'#06b6d4', iconKey:'icon_focus'         },
  { en:'My Wallet',            ar:'محفظتي',            href:'/u/wallet',        icon:Wallet,       color:'#22c55e', iconKey:'icon_wallet'        },
  { en:'Tickets',              ar:'تذاكر الدعم',       href:'/u/tickets',       icon:Headset,      color:'#f97316', iconKey:'icon_tickets'       },
  { en:'Educational Videos',   ar:'فيديوهات تعليمية', href:'/u/tutorials',     icon:PlayCircle,   color:'#ec4899', iconKey:'icon_tutorials'     },
  { en:'Blogs',                ar:'مقالات',            href:'/u/blogs',         icon:Article,      color:'#8b5cf6', iconKey:'icon_blogs'         },
  { en:'Quick Links',          ar:'روابط سريعة',       href:'/u/quick-links',   icon:LinkSimple,   color:'#14b8a6', iconKey:'icon_quick_links'   },
  { en:'My Account',           ar:'حسابي',             href:'/u/profile',       icon:UserCircle,   color:'#64748b', iconKey:'icon_profile'       },
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
  const [toast, setToast] = useState<{id:string; title:string; message:string; type:string} | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const [smartBannerDismissed, setSmartBannerDismissed] = useState(false)
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
  const [authModal, setAuthModal] = useState<'login'|'signup'|null>(null)

  useEffect(()=>{
    if (pathname==='/u/login') { setLoading(false); return }
    fetch('/api/member/verify').then(r=>{
      if (!r.ok) { setMember(null); setLoading(false); return null }
      return r.json()
    }).then(d=>{ if(d){ setMember({ ...d, id: d.member_id }); setNewEmail(d.email||''); setLoading(false) } })
  },[pathname])

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
        const n = payload.new as any
        setNotifs(prev => [n, ...prev])
        window.dispatchEvent(new CustomEvent('pk-member-notification', { detail: n }))
        if (toastTimer.current) clearTimeout(toastTimer.current)
        setToast({ id: n.id, title: n.title, message: n.message, type: n.type || 'info' })
        toastTimer.current = setTimeout(() => setToast(null), 5000)
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

  // Update browser tab title per active section
  useEffect(()=>{
    const tab = nav.find(n => pathname === n.href || pathname.startsWith(n.href+'/'))
    document.title = tab ? `${lang === 'ar' ? tab.ar : tab.en} | Pro Keys Store` : 'Pro Keys Store'
  },[pathname, lang, nav])

  // sync active tab on pathname change (back/forward or direct URL)
  useEffect(()=>{
    const tab = TAB_HREFS.find(h => pathname === h)
    if (tab) {
      setMountedTabs(prev => { const s = new Set(prev); s.add(tab); return s })
      setActiveTab(tab)
      window.dispatchEvent(new CustomEvent('pk-tab-change'))
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
    window.location.href = '/u/dashboard'
  }

  const VISITOR_TABS = ['/u/dashboard', '/u/store', '/u/quick-links']

  const navigateTo = (href: string) => {
    if (!member && !VISITOR_TABS.includes(href)) {
      setAuthModal('login')
      return
    }
    if (TAB_HREFS.includes(href)) {
      setMountedTabs(prev => { const s = new Set(prev); s.add(href); return s })
      setActiveTab(href)
      window.dispatchEvent(new CustomEvent('pk-tab-change'))
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
  if (loading) return null

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
              {active && <motion.div layoutId={`nav-pill-${isRtl}`} className="absolute inset-0 rounded-lg" style={{background: item.color+'15'}} transition={{type:'spring',stiffness:350,damping:30}}/>}
              <motion.div
                variants={{hover:{scale:1.18, rotate: isRtl ? -8 : 8}}}
                transition={{type:'spring', stiffness:400, damping:15}}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{background: item.color + (active?'25':'18')}}>
                {item.iconKey && ui[item.iconKey]
                  ? <img src={ui[item.iconKey]} alt="" className="w-4 h-4 object-contain"/>
                  : <Icon size={15} weight="duotone" style={{color: item.color}}/>
                }
              </motion.div>
              {!col && <span style={active ? {color: item.color, fontWeight:600} : {}}>{isRtl?item.ar:item.en}</span>}
            </div>
            </motion.div>
          )
        })}
      </nav>

      {/* Customize sidebar button */}
      {!col && member && (
        <button onClick={()=>setCustomizeOpen(true)}
          className="mx-3 mb-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-[calc(100%-24px)]">
          <SlidersHorizontal size={12}/><span>Customize sidebar</span>
        </button>
      )}

      {/* User / Visitor bottom */}
      <div className="p-3" style={{borderTop: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.5)'}}>
        {member ? (
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
                  <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                    {member?.member_code && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>{member.member_code}</span>
                    )}
                    {(() => { const r = getMemberRank(member?.total_spent_egp); return (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{background:`${r.color}22`,color:r.color,border:`1px solid ${r.color}44`}}>
                        {isRtl ? r.ar : r.en}
                      </span>
                    )})()}
                  </div>
                </div>
                <ChevronDown size={13} className="text-gray-400 flex-shrink-0"/>
              </>
            )}
          </button>
        ) : (
          !col && (
            <div className="flex flex-col gap-2">
              <button onClick={()=>setAuthModal('signup')}
                className="w-full py-2 rounded-lg text-xs font-bold text-white text-center transition-colors"
                style={{background:'#d99401'}}>
                {isRtl ? 'إنشاء حساب' : 'Sign Up'}
              </button>
              <button onClick={()=>setAuthModal('login')}
                className="w-full py-2 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center">
                {isRtl ? 'تسجيل الدخول' : 'Login'}
              </button>
            </div>
          )
        )}
      </div>
    </>
  )
  }

  // Glass background gradient — switches with dark state
  const glassPageBg = dark
    ? 'radial-gradient(ellipse 100% 80% at 10% 0%, rgba(217,148,1,0.18) 0%, transparent 50%), radial-gradient(ellipse 80% 100% at 90% 100%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 60% at 50% 50%, rgba(217,148,1,0.05) 0%, transparent 60%), #080c16'
    : 'radial-gradient(ellipse 100% 80% at 10% 0%, rgba(217,148,1,0.22) 0%, transparent 50%), radial-gradient(ellipse 80% 100% at 90% 100%, rgba(99,102,241,0.16) 0%, transparent 50%), radial-gradient(ellipse 60% 60% at 50% 50%, rgba(56,189,248,0.08) 0%, transparent 60%), #e8eef5'

  const sidebarGlassBg = dark
    ? 'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
    : 'linear-gradient(to bottom, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.32) 100%)'
  const sidebarMobileBg = dark
    ? 'linear-gradient(to bottom, rgba(10,14,26,0.97) 0%, rgba(8,12,22,0.99) 100%)'
    : 'linear-gradient(to bottom, rgba(255,255,255,0.98) 0%, rgba(250,252,255,0.99) 100%)'

  const headerGlassBg = dark
    ? 'rgba(8,12,22,0.38)'
    : 'rgba(255,255,255,0.42)'

  return (
    <MemberContext.Provider value={{ member, requireAuth: () => setAuthModal('login') }}>
    <div className={`flex h-screen overflow-hidden ${dark?'dark':''}`} dir={isRtl?'rtl':'ltr'} style={{background: glassPageBg}}>

      {/* ── Desktop Sidebar ─────────────────────────── */}
      <aside className={`hidden md:flex ${collapsed ? 'w-[66px]' : 'w-[220px]'} flex-shrink-0 flex-col h-screen border-r transition-all duration-200 relative z-10`}
        style={{
          background: sidebarGlassBg,
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.65)',
          boxShadow: dark ? '4px 0 40px -4px rgba(0,0,0,0.55)' : '4px 0 32px -4px rgba(0,0,0,0.07)',
        }}>
        {SidebarContent({})}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`absolute -${isRtl ? 'left' : 'right'}-3 bottom-16 w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow z-10`}
          style={{
            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.7)',
          }}
        >
          <ChevronLeft size={13} className={`text-gray-500 transition-transform duration-200 ${isRtl ? (collapsed ? '' : 'rotate-180') : (collapsed ? 'rotate-180' : '')}`}/>
        </button>
      </aside>

      {/* ── Mobile Sidebar overlay ───────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" dir={isRtl?'rtl':'ltr'}>
          <div className="fixed inset-0 bg-black/40" onClick={()=>setSidebar(false)}/>
          <div className={`relative w-64 flex flex-col h-full ${isRtl?'border-l':'ml-0 border-r'}`}
            style={{
              background: sidebarMobileBg,
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.65)',
              boxShadow: dark ? '8px 0 48px rgba(0,0,0,0.6)' : '8px 0 40px rgba(0,0,0,0.12)',
            }}>
            <button onClick={()=>setSidebar(false)} className="absolute top-3 end-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 z-10" style={{background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}}>
              <X size={14}/>
            </button>
            {SidebarContent({forMobile:true})}
          </div>
        </div>
      )}

      {/* ── Main ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-3 md:px-5 flex-shrink-0 relative z-10" style={{
          height:'58px',
          background: headerGlassBg,
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.65)',
          boxShadow: dark ? '0 4px 40px -4px rgba(0,0,0,0.45)' : '0 4px 24px -4px rgba(0,0,0,0.06)',
        }}>

          {/* Left: hamburger (mobile) + welcome */}
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={()=>setSidebar(true)} className="md:hidden w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Menu size={16}/>
            </button>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {member ? (
                  <>
                    {isRtl?'أهلاً':'Welcome'}{' '}
                    <span style={{color:'#d99401'}}>
                      <span className="sm:hidden">{member.full_name?.split(' ')[0]}!</span>
                      <span className="hidden sm:inline">{member.full_name}!</span>
                    </span>
                  </>
                ) : (
                  <span style={{color:'#d99401'}}>Pro Keys</span>
                )}
              </span>
              <span className="text-xs text-gray-400 hidden sm:block">
                {member ? (isRtl?'الوصول لجميع الأدوات النشطة':'Access all active tools') : (isRtl?'سجّل دخولك للوصول الكامل':'Sign in for full access')}
              </span>
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

            {/* Visitor: Sign Up + Login */}
            {!member && (
              <>
                <button onClick={()=>setAuthModal('signup')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                  style={{background:'#d99401'}}>
                  {isRtl ? 'إنشاء حساب' : 'Sign Up'}
                </button>
                <button onClick={()=>setAuthModal('login')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  {isRtl ? 'تسجيل الدخول' : 'Login'}
                </button>
              </>
            )}

            {/* Logged-in: Cart + Notifications + Logout */}
            {member && (
              <>
                <CartIcon/>
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
                    <div className="absolute end-0 top-10 w-72 sm:w-80 rounded-xl z-50 overflow-hidden" style={{
                      background: dark ? 'rgba(10,14,24,0.96)' : 'rgba(255,255,255,0.97)',
                      backdropFilter: 'blur(32px)',
                      WebkitBackdropFilter: 'blur(32px)',
                      border: dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(255,255,255,0.7)',
                      boxShadow: dark ? '0 20px 60px rgba(0,0,0,0.6)' : '0 20px 48px rgba(0,0,0,0.12)',
                    }}>
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
                <button onClick={logout}
                  className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-[#d99401] hover:bg-[#d9940112] transition-colors">
                  <LogOut size={14}/>
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── Realtime toast popup ── */}
        {toast && (() => {
          const colors: Record<string, {bg:string; border:string; icon:string}> = {
            success: { bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.35)', icon:'#10b981' },
            warning: { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.35)', icon:'#f59e0b' },
            error:   { bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.35)',  icon:'#ef4444' },
            info:    { bg:'rgba(99,102,241,0.12)', border:'rgba(99,102,241,0.35)', icon:'#6366f1' },
          }
          const c = colors[toast.type] || colors.info
          return (
            <div className="fixed bottom-5 end-5 z-[999] max-w-sm w-full pointer-events-auto"
              style={{animation:'pk-toast-in 0.3s cubic-bezier(0.16,1,0.3,1) both'}}>
              <style>{`
                @keyframes pk-toast-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
              `}</style>
              <div className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
                style={{background: dark ? 'rgba(10,13,24,0.75)' : 'rgba(255,255,255,0.75)', backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)', border:`1px solid ${c.border}`, boxShadow: dark ? `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)` : `0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)`}}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{background: c.bg, color: c.icon}}>
                  {toast.type === 'success' ? '✓' : toast.type === 'warning' ? '⚠' : toast.type === 'error' ? '✕' : 'ℹ'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{isRtl ? toast.title : (toast as any).title_en || toast.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">{isRtl ? toast.message : (toast as any).message_en || toast.message}</p>
                </div>
                <button onClick={() => setToast(null)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 transition-colors">
                  <X size={12}/>
                </button>
              </div>
            </div>
          )
        })()}

        {/* Task reminder banner */}
        {taskAlert && (
          <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold flex-shrink-0 z-40" style={{
            background: dark ? 'rgba(180,110,0,0.22)' : 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: dark ? '1px solid rgba(255,200,50,0.12)' : '1px solid rgba(217,148,1,0.25)',
            color: dark ? '#fde68a' : '#7c4f00',
          }}>
            <AlarmClock size={15} className="flex-shrink-0 animate-pulse"/>
            <span className="flex-1">{isRtl ? 'تذكير: ' : 'Reminder: '}{taskAlert.title}</span>
            <button onClick={()=>{ dismissedReminders.current.add(taskAlert.id); setTaskAlert(null) }}
              className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0">
              <X size={12}/>
            </button>
          </div>
        )}

        {/* ── Smart Action Banner ── */}
        {!smartBannerDismissed && member && (() => {
          const daysLeft = member.expires_at
            ? Math.ceil((new Date(member.expires_at).getTime() - Date.now()) / 86400000)
            : null
          const rank = getMemberRank(member.total_spent_egp)
          const nextRank = RANK_TIERS[RANK_TIERS.findIndex(r => r.key === rank.key) + 1]

          let banner: { msg_ar: string; msg_en: string; cta_ar: string; cta_en: string; href: string; color: string } | null = null

          if (daysLeft !== null && daysLeft <= 5 && daysLeft > 0) {
            banner = {
              msg_ar: `اشتراكك ينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} — جدد الآن ⚠️`,
              msg_en: `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — renew now ⚠️`,
              cta_ar: 'تجديد', cta_en: 'Renew',
              href: '/u/store', color: '#d99401',
            }
          } else if (nextRank && member.total_spent_egp !== undefined) {
            const gap = nextRank.min - (member.total_spent_egp || 0)
            if (gap > 0 && gap <= 500) {
              banner = {
                msg_ar: `أنت على بعد ${gap.toLocaleString()} جنيه من رتبة ${nextRank.ar} 🚀`,
                msg_en: `Only ${gap.toLocaleString()} EGP away from ${nextRank.en} rank 🚀`,
                cta_ar: 'تسوق', cta_en: 'Shop',
                href: '/u/store', color: nextRank.color,
              }
            }
          }

          if (!banner) return null
          return (
            <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold flex-shrink-0 z-40"
              style={{background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom: `1px solid ${banner.color}28`, color: banner.color}}>
              <span className="flex-1">{isRtl ? banner.msg_ar : banner.msg_en}</span>
              <a href={banner.href}
                className="px-3 py-1 rounded-lg text-white text-[11px] font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
                style={{background: banner.color}}>
                {isRtl ? banner.cta_ar : banner.cta_en}
              </a>
              <button onClick={() => setSmartBannerDismissed(true)}
                className="w-5 h-5 rounded flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity flex-shrink-0">
                <X size={11}/>
              </button>
            </div>
          )
        })()}

        {/* Content */}
        <main className="flex-1 overflow-hidden relative" data-scroll style={{background: dark ? 'rgba(9,13,24,0.18)' : 'rgba(240,244,248,0.15)', transform:'translateZ(0)'}}>
          {/* Keep-alive tab panels — mounted once, hidden when inactive */}
          {Array.from(mountedTabs).map(href => {
            const TabComp = TAB_MAP[href]
            const isActive = href === activeTab
            return (
              <div key={href} data-scroll-container="1" style={{display: isActive ? 'block' : 'none', position:'absolute', inset:0, overflowY:'auto'}}>
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
                data-scroll-container="1"
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
          <div className="rounded-2xl w-72 overflow-hidden" style={{
            background: dark ? 'rgba(10,14,24,0.96)' : 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(255,255,255,0.72)',
            boxShadow: dark ? '0 24px 64px rgba(0,0,0,0.65)' : '0 24px 56px rgba(0,0,0,0.14)',
          }} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden" style={{background:'#d99401'}}>
                {member?.avatar_url
                  ? <img src={member.avatar_url} className="w-full h-full object-cover" alt=""/>
                  : member?.full_name?.slice(0,1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate mb-1">{member?.full_name}</div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {member?.member_code && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>{member.member_code}</span>
                  )}
                  {(() => { const r = getMemberRank(member?.total_spent_egp); return (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{background:`${r.color}22`,color:r.color,border:`1px solid ${r.color}44`}}>
                      {isRtl ? r.ar : r.en}
                    </span>
                  )})()}
                </div>
                <div className="text-[11px] text-gray-400 truncate">{member?.email}</div>
              </div>
            </div>
            {/* Ranking */}
            {(() => {
              const spent = member?.total_spent_egp || 0
              const rank = getMemberRank(spent)
              const rankIdx = RANK_TIERS.findIndex(r => r.key === rank.key)
              const next = RANK_TIERS[rankIdx + 1] as typeof RANK_TIERS[number] | undefined
              const pct = next ? Math.min(100, ((spent - rank.min) / (next.min - rank.min)) * 100) : 100
              const remaining = next ? Math.max(0, next.min - spent) : 0
              return (
                <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2.5">{isRtl?'رتبتي':'My Rank'}</p>
                  <div className="flex items-center gap-2 mb-2">
                    {/* Current rank badge */}
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <HexBadge rk={rank} size={36}/>
                      <span className="text-[9px] font-bold" style={{color:rank.color}}>{isRtl ? rank.ar : rank.en}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="flex-1 min-w-0">
                      <div className="h-2 rounded-full overflow-hidden mb-1" style={{background: dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)'}}>
                        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:`linear-gradient(90deg,${rank.color},${next ? next.color : rank.color})`}}/>
                      </div>
                      {next
                        ? <div className="flex justify-between">
                            <span className="text-[9px] text-gray-400">{spent.toLocaleString()} EGP</span>
                            <span className="text-[9px] text-gray-400">{isRtl ? `يتبقى ${remaining.toLocaleString()} ج.م` : `${remaining.toLocaleString()} EGP left`}</span>
                          </div>
                        : <p className="text-[9px] font-bold text-center" style={{color:rank.color}}>👑 {isRtl?'أعلى رتبة':'Max Rank'}</p>
                      }
                    </div>
                    {/* Next rank badge */}
                    {next ? (
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0 opacity-45">
                        <HexBadge rk={next} size={36}/>
                        <span className="text-[9px] font-bold" style={{color:next.color}}>{isRtl ? next.ar : next.en}</span>
                      </div>
                    ) : <div className="w-9"/>}
                  </div>
                </div>
              )
            })()}
            {/* Language & Currency */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{isRtl?'اللغة والعملة':'Language & Currency'}</p>
              <div className="flex gap-2">
                <div className="flex-1 flex gap-1 p-1 rounded-lg" style={{background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)'}}>
                  {(['ar','en'] as const).map(l=>(
                    <button key={l} onClick={()=>setLang(l)}
                      className="flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all"
                      style={lang===l?{background:'#d99401',color:'#fff'}:{color: dark?'#9ca3af':'#6b7280'}}>
                      {l==='ar'?'عربي':'EN'}
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex gap-1 p-1 rounded-lg" style={{background: dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)'}}>
                  {(['egp','usd'] as const).map(c=>(
                    <button key={c} onClick={()=>setCurrency(c)}
                      className="flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all"
                      style={currency===c?{background:'#d99401',color:'#fff'}:{color: dark?'#9ca3af':'#6b7280'}}>
                      {c==='egp'?(lang==='ar'?'ج.م':'EGP'):'USD'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Buttons */}
            <div className="p-4 space-y-2 pt-3">
              <button onClick={()=>{setProfile(false);navigateTo('/u/profile')}}
                className="w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{background:'#d99401',color:'#fff'}}>
                <Globe size={14}/>{isRtl?'حسابي':'My Account'}
              </button>
              <button onClick={logout}
                className="w-full py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:text-red-500 hover:border-red-300"
                style={{borderColor: dark?'rgba(255,255,255,0.1)':'#e5e7eb',color: dark?'#9ca3af':'#6b7280'}}>
                <LogOut size={14}/>{isRtl?'تسجيل الخروج':'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customize sidebar modal ─────────────────── */}
      {customizeOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setCustomizeOpen(false)}>
          <div className="rounded-2xl w-80 overflow-hidden" style={{
            background: dark ? 'rgba(10,14,24,0.92)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(255,255,255,0.75)',
            boxShadow: dark ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 56px rgba(0,0,0,0.14)',
          }} onClick={e=>e.stopPropagation()}>
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

      {/* ── Auth Modal ── */}
      {authModal && (
        <AuthModal
          initialTab={authModal}
          onClose={()=>setAuthModal(null)}
          lang={lang as 'ar'|'en'}
          logo={ui.logo_url}
          siteName="Pro Keys"
        />
      )}

      {/* Member-only floating widgets */}
      {member && <FloatingCart/>}
      {member && <ChatWidget/>}

    </div>
    </MemberContext.Provider>
  )
}

function FloatingCart() {
  const { cartCount } = useCart()
  const { lang } = useLang()
  const isRtl = lang === 'ar'
  if (cartCount === 0) return null
  const side = isRtl ? 'left' : 'right'
  return (
    <Link href="/u/cart"
      className="fixed z-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      style={{
        bottom: '20px',
        [side]: '82px',
        width: 48, height: 48,
        borderRadius: '50%',
        background: '#d99401',
        boxShadow: '0 4px 20px #d9940160',
        color: '#fff',
      }}>
      <ShoppingCart size={18}/>
      {cartCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] font-bold"
          style={{background:'#ef4444',fontSize:9}}>{cartCount}</span>
      )}
    </Link>
  )
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <CartProvider>
        <UserLayoutInner>{children}</UserLayoutInner>
      </CartProvider>
    </LangProvider>
  )
}
