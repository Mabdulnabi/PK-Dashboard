'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { useSiteSettings } from '@/lib/use-site-settings'
import { Crown, ChevronRight, Clock, CheckCircle, Package, Zap, Loader2, Wifi, X, Bell, RefreshCw, ShoppingBag, TrendingDown, Wallet, CalendarClock, LayoutGrid } from 'lucide-react'

// ── Smart Next Action ──────────────────────────────────────
type ActionType = 'urgent'|'warning'|'notif'|'new_member'
interface SmartAction { type: ActionType; title: string; subtitle: string; cta: string; href: string }

function SmartNextAction({ purchases, notifications, loading, t, lang }: {
  purchases: any[]; notifications: any[]; loading: boolean; t: any; lang: string
}) {
  const [dismissed, setDismissed] = useState(false)

  if (loading || dismissed) return null

  const soonest = [...purchases].sort((a,b)=>(daysLeft(a.expires_at)??9999)-(daysLeft(b.expires_at)??9999))[0]
  const days = soonest ? daysLeft(soonest?.expires_at) : null
  const unreadNotif = notifications.find(n=>!n.is_read)
  const isNewMember = purchases.length === 0

  let action: SmartAction | null = null

  if (days !== null && days <= 3 && soonest) {
    action = {
      type: 'urgent',
      title: lang==='ar' ? `⚠ ${soonest.tool_name} ينتهي بعد ${days} ${days===1?'يوم':'أيام'}` : `⚠ ${soonest.tool_name} expires in ${days} day${days===1?'':'s'}`,
      subtitle: lang==='ar' ? 'جدد الآن لتجنب انقطاع الخدمة' : 'Renew now to avoid interruption',
      cta: lang==='ar' ? 'تجديد الآن' : 'Renew Now',
      href: `/u/checkout?tool_id=${soonest.id}&renew=1`,
    }
  } else if (days !== null && days <= 7 && soonest) {
    action = {
      type: 'warning',
      title: lang==='ar' ? `${soonest.tool_name} ينتهي بعد ${days} أيام` : `${soonest.tool_name} expires in ${days} days`,
      subtitle: lang==='ar' ? 'فكر في التجديد قريباً' : 'Consider renewing soon',
      cta: lang==='ar' ? 'تجديد' : 'Renew',
      href: `/u/checkout?tool_id=${soonest.id}&renew=1`,
    }
  } else if (unreadNotif) {
    action = {
      type: 'notif',
      title: unreadNotif.title || (lang==='ar' ? 'لديك إشعار جديد' : 'You have a new notification'),
      subtitle: unreadNotif.message || '',
      cta: lang==='ar' ? 'عرض' : 'View',
      href: '/u/helpdesk',
    }
  } else if (isNewMember) {
    action = {
      type: 'new_member',
      title: lang==='ar' ? 'مرحباً! ابدأ رحلتك مع Pro Keys' : 'Welcome! Start your Pro Keys journey',
      subtitle: lang==='ar' ? 'تصفح أشهر الأدوات وابدأ الاشتراك' : 'Browse our most popular tools',
      cta: lang==='ar' ? 'تصفح المتجر' : 'Browse Shop',
      href: '/u/shop/shared',
    }
  }

  if (!action) return null

  const styles: Record<ActionType, { bg: string; border: string; icon: React.ReactNode }> = {
    urgent:     { bg:'bg-red-50 dark:bg-red-500/10',    border:'border-red-200 dark:border-red-500/30',    icon:<RefreshCw size={16} className="text-red-500 flex-shrink-0"/> },
    warning:    { bg:'bg-amber-50 dark:bg-amber-500/10', border:'border-amber-200 dark:border-amber-500/30', icon:<Clock size={16} className="text-amber-500 flex-shrink-0"/> },
    notif:      { bg:'bg-blue-50 dark:bg-blue-500/10',   border:'border-blue-200 dark:border-blue-500/30',   icon:<Bell size={16} className="text-blue-500 flex-shrink-0"/> },
    new_member: { bg:'bg-purple-50 dark:bg-purple-500/10',border:'border-purple-200 dark:border-purple-500/30',icon:<ShoppingBag size={16} className="text-purple-500 flex-shrink-0"/> },
  }
  const ctaStyles: Record<ActionType, string> = {
    urgent:     'bg-red-500 hover:bg-red-600 text-white',
    warning:    'bg-amber-500 hover:bg-amber-600 text-white',
    notif:      'bg-blue-500 hover:bg-blue-600 text-white',
    new_member: 'bg-purple-500 hover:bg-purple-600 text-white',
  }
  const s = styles[action.type]

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border mb-6 ${s.bg} ${s.border}`}>
      {s.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{action.title}</p>
        {action.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{action.subtitle}</p>}
      </div>
      <a href={action.href}
        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${ctaStyles[action.type]}`}>
        {action.cta} →
      </a>
      <button onClick={()=>setDismissed(true)}
        className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 transition-colors">
        <X size={13}/>
      </button>
    </div>
  )
}

interface Purchase {
  id:string; tool_name:string; tool_image?:string
  tool_video?:string; duration_label:string; category_slug?:string
  expires_at?:string; starts_at?:string; payment_method:string
  amount_egp:number; duration_days?:number; retail_price_egp?:number
  has_delivery?:boolean; delivery_viewed?:boolean
}

function subProgress(p: Purchase): number | null {
  if (!p.expires_at || !p.duration_days) return null
  const expiresMs = new Date(p.expires_at).getTime()
  const totalMs   = p.duration_days * 86400000
  const startsMs  = p.starts_at ? new Date(p.starts_at).getTime() : expiresMs - totalMs
  return Math.min(100, Math.max(0, ((Date.now() - startsMs) / totalMs) * 100))
}
interface FreeTool { id:string; name:string; image_url?:string; access_url:string }

function daysLeft(expiresAt?:string) {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime()-Date.now())/86400000)
}

function StatusBadge({ days, t }:{ days:number|null; t:any }) {
  if (days===null) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">{t('Lifetime','مدى الحياة')}</span>
  if (days<=3) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-500/10 text-red-600 animate-pulse">⚠ {days} {t('d','ي')}</span>
  if (days<=7) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600">{days} {t('days','أيام')}</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><CheckCircle size={9}/> {days} {t('days','أيام')}</span>
}

function QuickStats({ purchases, t, lang }: { purchases: Purchase[]; t: any; lang: string }) {
  if (purchases.length === 0) return null

  const active = purchases.length

  const soonest = [...purchases]
    .filter(p => p.expires_at)
    .sort((a,b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime())[0]
  const nextDays = soonest ? daysLeft(soonest.expires_at) : null

  const monthlySpend = purchases.reduce((sum, p) => {
    const days = p.duration_days || 30
    return sum + (p.amount_egp / (days / 30))
  }, 0)

  const monthlySavings = purchases
    .filter(p => (p.retail_price_egp || 0) > 0)
    .reduce((sum, p) => {
      const days = p.duration_days || 30
      return sum + ((p.retail_price_egp! - p.amount_egp) / (days / 30))
    }, 0)

  const cards = [
    {
      label: lang === 'ar' ? 'الاشتراكات النشطة' : 'Active Subscriptions',
      value: active.toString(),
      sub:   lang === 'ar' ? 'اشتراك نشط' : 'active plans',
      icon:  <LayoutGrid size={18}/>,
      gradient: 'from-indigo-500 to-blue-500',
      bg: 'from-indigo-50 to-blue-50 dark:from-indigo-500/10 dark:to-blue-500/10',
      border: 'border-indigo-100 dark:border-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: lang === 'ar' ? 'أقرب تجديد' : 'Next Renewal',
      value: nextDays !== null ? `${nextDays}` : '—',
      sub:   nextDays !== null ? (lang === 'ar' ? 'يوم متبقي' : 'days left') : (lang === 'ar' ? 'لا يوجد' : 'none'),
      icon:  <CalendarClock size={18}/>,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10',
      border: 'border-amber-100 dark:border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: lang === 'ar' ? 'الإنفاق الشهري' : 'Monthly Spend',
      value: `${Math.round(monthlySpend).toLocaleString()}`,
      sub:   lang === 'ar' ? 'جنيه / شهر' : 'EGP / mo',
      icon:  <Wallet size={18}/>,
      gradient: 'from-rose-500 to-red-500',
      bg: 'from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10',
      border: 'border-rose-100 dark:border-rose-500/20',
      text: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: lang === 'ar' ? 'التوفير الشهري' : 'Monthly Savings',
      value: monthlySavings > 0 ? `${Math.round(monthlySavings).toLocaleString()}` : '—',
      sub:   monthlySavings > 0 ? (lang === 'ar' ? 'جنيه / شهر' : 'EGP / mo') : (lang === 'ar' ? 'أضف سعر السوق' : 'set market price'),
      icon:  <TrendingDown size={18}/>,
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10',
      border: 'border-emerald-100 dark:border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((c, i) => (
        <div key={i} className={`relative rounded-2xl border bg-gradient-to-br ${c.bg} ${c.border} p-4 overflow-hidden`}>
          <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${c.gradient} opacity-70`}/>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${c.gradient} text-white shadow-sm`}>
            {c.icon}
          </div>
          <div className={`text-2xl font-extrabold ${c.text} leading-none mb-1`}>{c.value}</div>
          <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.sub}</div>
          <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 font-medium leading-tight">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function UserDashboard() {
  const router = useRouter()
  const settings = useSiteSettings()
  const { t, lang, dir } = useLang()
  const [purchases,    setPurchases]    = useState<Purchase[]>([])
  const [free,         setFree]         = useState<FreeTool[]>([])
  const [loading,      setLoading]      = useState(true)
  const [extReady,     setExtReady]     = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [connectingId, setConnectingId] = useState<string|null>(null)
  const [connectedId,  setConnectedId]  = useState<string|null>(null)
  const [quickError,   setQuickError]   = useState<string|null>(null)
  const activeRef = useRef<string|null>(null)

  const fetchPurchases = () => {
    fetch('/api/member/purchases').then(r=>r.ok?r.json():{purchases:[]}).then(d=>setPurchases(d.purchases||[]))
  }

  useEffect(()=>{
    Promise.all([
      fetch('/api/member/purchases').then(r=>r.ok?r.json():{purchases:[]}),
      fetch('/api/member/shop').then(r=>r.ok?r.json():{free:[]}),
      fetch('/api/member/notifications').then(r=>r.ok?r.json():{notifications:[]}),
    ]).then(([pData,sData,nData])=>{
      setPurchases(pData.purchases||[])
      setFree(sData.free||[])
      setNotifications(nData.notifications||[])
      setLoading(false)
    }).catch(()=>setLoading(false))

    const channel = supabase
      .channel('dashboard-purchases')
      .on('postgres_changes',{ event:'*', schema:'public', table:'tool_purchases' },()=>fetchPurchases())
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[])

  // Extension detection
  useEffect(()=>{
    const handler = (e: MessageEvent) => {
      if (e.source !== window) return
      const d = e.data
      if (!d?.type?.startsWith('PK_')) return
      if (d.type==='PK_EXTENSION_READY') { setExtReady(true); window.postMessage({type:'PK_GET_STATE'},'*') }
      if (d.type==='PK_STATE')           { setExtReady(true) }
      if (d.type==='PK_INJECT_RESULT') {
        setConnectingId(null)
        if (d.success) { setConnectedId(activeRef.current) }
        else {
          setConnectedId(null)
          setQuickError(d.error || t('Connection failed','فشل الاتصال'))
          setTimeout(()=>setQuickError(null), 4000)
        }
      }
    }
    window.addEventListener('message', handler)
    let attempts = 0
    const poll = setInterval(()=>{
      if (attempts>=15){ clearInterval(poll); return }
      attempts++
      window.postMessage({type:'PK_PING'},'*')
    }, 300)
    return ()=>{ window.removeEventListener('message', handler); clearInterval(poll) }
  },[])

  async function quickConnect(purchase: Purchase) {
    if (connectingId) return
    setQuickError(null)
    setConnectingId(purchase.id)
    activeRef.current = purchase.id

    const sRes  = await fetch(`/api/member/servers?tool=${encodeURIComponent(purchase.tool_name)}`,{credentials:'include'})
    const sData = await sRes.json()
    const available = (sData.servers||[]).filter((s:any)=>!s.is_full)

    if (!available.length) {
      setConnectingId(null)
      setQuickError(t('All servers full','كل السيرفرات ممتلئة'))
      setTimeout(()=>setQuickError(null), 4000)
      return
    }

    const best = available.reduce((p:any,c:any)=>
      (c.current_active_users/c.max_concurrent_users)<(p.current_active_users/p.max_concurrent_users)?c:p
    )

    const sessRes  = await fetch(`/api/member/servers/session?server_id=${best.id}`,{credentials:'include'})
    const sessData = await sessRes.json()

    if (!sessRes.ok || !sessData.session_data) {
      setConnectingId(null)
      setQuickError(sessData.error || t('Failed to get session','فشل جلب الجلسة'))
      setTimeout(()=>setQuickError(null), 4000)
      return
    }

    window.postMessage({
      type:'PK_INJECT_REQUEST',
      toolName:    purchase.tool_name,
      sessionData: sessData.session_data,
      serverId:    best.id,
      proxy:       sessData.proxy || null,
    },'*')
  }

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-3 md:p-6" dir={dir}>

      <SmartNextAction purchases={purchases} notifications={notifications} loading={loading} t={t} lang={lang}/>

      {!loading && <QuickStats purchases={purchases} t={t} lang={lang}/>}

      {quickError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          ⚠ {quickError}
        </div>
      )}

      {/* Active Subscriptions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            {t('My Active Subscriptions','اشتراكاتي النشطة')}
          </h2>
          {purchases.length>0 && (
            <span className="text-xs text-gray-400">{purchases.length} {t('subscription','اشتراك')}</span>
          )}
        </div>

        {purchases.length===0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Crown size={24} className="text-red-400"/>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('Start Using Your Tools','ابدأ استخدام أدواتك الآن')}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {t('You have no active subscriptions.','ما عندكش اشتراكات نشطة حالياً.')}
            </p>
            <a href="/u/shop/shared"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
              {t('Browse Shop →','تصفح المتجر →')}
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...purchases].sort((a,b)=>(daysLeft(a.expires_at)??9999)-(daysLeft(b.expires_at)??9999)).map(p=>{
              const days         = daysLeft(p.expires_at)
              const isShared     = p.category_slug === 'shared'
              const isPrivate    = p.category_slug === 'private'
              const isConnecting = connectingId === p.id
              const isConnected  = connectedId  === p.id

              return (
                <div key={p.id} className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-lg hover:border-red-200 dark:hover:border-red-500/30 transition-all duration-200">
                  <div className="h-1 w-full bg-gradient-to-r from-red-400 to-red-600"/>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.tool_image
                          ? <img src={p.tool_image} alt={p.tool_name} className="w-9 h-9 object-contain"/>
                          : <Package size={20} className="text-gray-300"/>
                        }
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge days={days} t={t}/>
                        {isConnected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                            <Wifi size={9}/> {t('Connected','متصل')}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-tight">{p.tool_name}</h3>

                    {/* Expires line — red */}
                    <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium mb-2">
                      <Clock size={11}/>
                      <span>
                        {p.expires_at
                          ? `${t('Expires','ينتهي')} ${new Date(p.expires_at).toLocaleDateString(lang==='ar'?'ar-EG':'en-GB')}`
                          : t('Lifetime','مدى الحياة')
                        }
                      </span>
                    </div>

                    {/* Progress bar */}
                    {(() => {
                      const pct = subProgress(p)
                      if (pct === null) return null
                      const barColor = pct >= 85 ? 'bg-red-500' : pct >= 65 ? 'bg-amber-400' : 'bg-emerald-400'
                      return (
                        <div className="mb-4">
                          <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }}/>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Buttons row */}
                    <div className="flex gap-2">
                      <button
                        onClick={()=>router.push(`/u/subscription/${p.id}`)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-1.5">
                        {t('View Details','عرض التفاصيل')} <ChevronRight size={13} className={lang==='ar'?'rotate-180':''}/>
                      </button>

                      {isShared && (
                        extReady ? (
                          <button
                            onClick={()=>{ if(!isConnecting) quickConnect(p) }}
                            disabled={isConnecting || isConnected}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              isConnected
                                ? 'bg-emerald-500 text-white cursor-default'
                                : 'bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white shadow-sm shadow-red-500/20'
                            }`}>
                            {isConnecting
                              ? <><Loader2 size={12} className="animate-spin"/>{t('Connecting...','جاري...')}</>
                              : isConnected
                              ? <><Wifi size={12}/>{t('Connected','متصل')}</>
                              : <><Zap size={12}/>{t('Quick Connect','اتصال سريع')}</>
                            }
                          </button>
                        ) : (
                          <button
                            onClick={()=>router.push(`/u/subscription/${p.id}`)}
                            title={t('Install extension first','ثبّت الإضافة أولاً')}
                            className="flex-1 py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-400 flex items-center justify-center gap-1.5 hover:border-red-300 hover:text-red-400 transition-all">
                            <Zap size={12}/>{t('Quick Connect','اتصال سريع')}
                          </button>
                        )
                      )}

                      {isPrivate && (
                        p.has_delivery ? (
                          <button onClick={()=>router.push(`/u/subscription/${p.id}`)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center justify-center gap-1.5 relative">
                            {!p.delivery_viewed && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 animate-pulse"/>
                            )}
                            <CheckCircle size={12}/>{t('View Credentials','بيانات الدخول')}
                          </button>
                        ) : (
                          <span className="flex-1 py-2.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-500 flex items-center justify-center gap-1.5">
                            <Clock size={12}/>{t('Pending Delivery','في الانتظار')}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Free Tools */}
      {free.length>0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-4">
            {t('Free Tools','أدوات مجانية')}
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {free.map(tool=>(
                <a key={tool.id} href={tool.access_url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all group">
                  {tool.image_url
                    ? <img src={tool.image_url} alt={tool.name} className="h-10 w-auto object-contain"/>
                    : <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">{tool.name.slice(0,2).toUpperCase()}</div>
                  }
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">{tool.name}</span>
                  <span className="text-[10px] text-red-500 font-bold group-hover:underline">{t('Free Access →','دخول مجاني →')}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
