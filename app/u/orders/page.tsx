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
import { Crown, ChevronRight, Clock, CheckCircle, Package, Zap, Loader2, Wifi, X, Bell, RefreshCw, ShoppingBag, TrendingDown, Wallet, CalendarClock, LayoutGrid, Download, MessageSquare, RotateCcw, Star, Eye, EyeOff, Copy, Search } from 'lucide-react'
import BannerSlider from '@/components/ui/BannerSlider'
import NotifBanner from '@/components/ui/NotifBanner'

// ── Review Prompt ─────────────────────────────────────────
function ReviewPrompt({ purchases, t, lang }: { purchases: any[]; t: any; lang: string }) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const dismissed = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('pk_reviewed_tools') || '[]') as string[]
    : []

  const candidate = purchases.find(p => {
    if (!p.tool_id || !p.created_at) return false
    const age = Date.now() - new Date(p.created_at).getTime()
    return age >= WEEK_MS && !dismissed.includes(p.tool_id)
  })

  const [visible,    setVisible]    = useState(!!candidate)
  const [current,   setCurrent]    = useState(candidate)
  const [stars,     setStars]      = useState(0)
  const [hover,     setHover]      = useState(0)
  const [comment,   setComment]    = useState('')
  const [sent,      setSent]       = useState(false)
  const [sending,   setSending]    = useState(false)

  useEffect(()=>{
    if (!candidate) return
    setCurrent(candidate); setVisible(true); setStars(0); setComment(''); setSent(false)
  },[candidate?.tool_id])

  const dismiss = (toolId: string) => {
    const list = JSON.parse(localStorage.getItem('pk_reviewed_tools') || '[]')
    localStorage.setItem('pk_reviewed_tools', JSON.stringify([...list, toolId]))
    setVisible(false)
  }

  const submit = async () => {
    if (!stars || !current) return
    setSending(true)
    await fetch(`/api/tools/${current.tool_id}/reviews`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars, comment })
    })
    setSending(false)
    setSent(true)
    setTimeout(() => dismiss(current.tool_id), 2000)
  }

  if (!visible || !current) return null
  const isRtl = lang === 'ar'

  return (
    <div className="mb-5 rounded-2xl border border-[#d99401]/20 dark:border-[#d99401]/30 overflow-hidden bg-amber-50 dark:bg-[#1a1200]" dir={isRtl?'rtl':'ltr'}>
      <div className="flex items-start gap-4 p-4 md:p-5">
        {/* Tool image */}
        <div className="w-11 h-11 rounded-xl bg-[#d99401]/10 dark:bg-white/10 border border-[#d99401]/20 dark:border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
          {current.tool_image
            ? <img src={current.tool_image} alt={current.tool_name} className="w-8 h-8 object-contain"/>
            : <span className="text-xs font-bold text-white/40">{current.tool_name?.slice(0,2)}</span>}
        </div>

        <div className="flex-1 min-w-0">
          {sent ? (
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm py-1">
              <CheckCircle size={16}/>{t('Thank you for your review! 🎉','شكراً على تقييمك! 🎉')}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                  {t(`How's your experience with `, `كيف تجربتك مع `)}<span style={{color:'#d99401'}}>{current.tool_name}</span>?
                </p>
                <button onClick={()=>dismiss(current.tool_id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 ms-3">
                  <X size={14}/>
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">{t("You've been using it for a week — share your feedback",'استخدمتها أسبوع — شارك تجربتك')}</p>

              {/* Stars */}
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(i=>(
                  <button key={i} type="button"
                    onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(0)}
                    onClick={()=>setStars(i)}>
                    <Star size={22}
                      fill={(hover||stars)>=i?'#F59E0B':'none'}
                      stroke={(hover||stars)>=i?'#F59E0B':'#9CA3AF'}
                      className="transition-colors"/>
                  </button>
                ))}
              </div>

              {stars > 0 && (
                <div className="flex gap-2 items-start">
                  <input value={comment} onChange={e=>setComment(e.target.value)}
                    placeholder={t('Quick comment (optional)','تعليق سريع (اختياري)')}
                    className="flex-1 px-3 py-2 text-xs rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-[#d99401] transition-all"/>
                  <button onClick={submit} disabled={sending}
                    className="px-4 py-2 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-50 flex-shrink-0"
                    style={{background:'#d99401'}}>
                    {sending ? '...' : t('Send','إرسال')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Onboarding Checklist ──────────────────────────────────
function OnboardingChecklist({ createdAt, extReady, hasPurchase, t, lang }:{
  createdAt:string|null; extReady:boolean; hasPurchase:boolean; t:any; lang:string
}) {
  const [dismissed, setDismissed] = useState(()=>
    typeof window !== 'undefined' && !!localStorage.getItem('pk_onboarding_done')
  )

  if (dismissed || !createdAt) return null
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (hoursOld > 48) return null

  const steps = [
    {
      done: true,
      emoji: '🎉',
      en: 'Account activated — you\'re in!',
      ar: 'تم تفعيل حسابك — أهلاً بك! 🎊',
    },
    {
      done: hasPurchase,
      emoji: '🛒',
      en: 'Choose a tool → click "Buy Now" → confirm payment',
      ar: 'اختار أداة ← اضغط "اشتري الآن" ← أكّد الدفع',
    },
    {
      done: hasPurchase,
      emoji: '⚡',
      en: 'Subscription activated instantly! Go to "My Active Subscriptions"',
      ar: 'اشتراكك اتفعّل فوراً! روح "اشتراكاتي النشطة"',
    },
    {
      done: hasPurchase,
      emoji: '📋',
      en: 'Click "View Details" on your subscription card',
      ar: 'اضغط "عرض التفاصيل" على كارت الاشتراك بتاعك',
    },
    {
      done: extReady,
      emoji: '🔌',
      en: 'Install the browser extension (links inside View Details)',
      ar: 'ثبّت الإضافة من الروابط جوّا صفحة التفاصيل',
    },
    {
      done: extReady && hasPurchase,
      emoji: '🖥️',
      en: 'Choose a server → your tool opens automatically! 🚀',
      ar: 'اختار سيرفر ← الأداة هتفتح تلقائياً! 🚀',
    },
  ]
  const doneCount = steps.filter(s=>s.done).length
  const pct = Math.round(doneCount/steps.length*100)
  const allDone = doneCount === steps.length

  const dismiss = () => {
    localStorage.setItem('pk_onboarding_done','1')
    setDismissed(true)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{t('Getting Started — Welcome!','ابدأ رحلتك — أهلاً بيك!')}</p>
            <p className="text-[11px] text-gray-400">{doneCount}/{steps.length} {t('steps done','خطوات مكتملة')}</p>
          </div>
        </div>
        <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={14}/></button>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 mb-4 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:'linear-gradient(90deg,#d99401,#f5b800)'}}/>
      </div>
      <div className="space-y-2">
        {steps.map((s,i)=>{
          const label = lang === 'ar' ? s.ar : s.en
          return (
            <div key={i} className={`flex items-start gap-3 text-sm py-1.5 px-2 rounded-lg transition-colors ${s.done ? 'opacity-50' : 'bg-gray-50 dark:bg-gray-800/60'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${s.done ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {s.done
                  ? <CheckCircle size={12} className="text-emerald-500"/>
                  : <span className="text-[10px] font-bold text-gray-400">{i+1}</span>
                }
              </div>
              <span className={s.done ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}>
                <span className="me-1">{s.emoji}</span>{label}
              </span>
            </div>
          )
        })}
      </div>
      {allDone && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{background:'#d9940115',border:'1px solid #d9940130'}}>
          <span className="text-base">🎊</span>
          <p className="text-xs font-bold" style={{color:'#d99401'}}>
            {t("All set! You're a Pro Keys pro now 🔥","خلصت كل الخطوات! دلوقتي انت Pro Keys pro 🔥")}
          </p>
          <button onClick={dismiss} className="ms-auto text-xs font-bold underline flex-shrink-0" style={{color:'#d99401'}}>{t('Close','إغلاق')}</button>
        </div>
      )}
    </div>
  )
}

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
      href: `/u/checkout?tool_id=${soonest.tool_id||soonest.id}&renew=1`,
    }
  } else if (days !== null && days <= 7 && soonest) {
    action = {
      type: 'warning',
      title: lang==='ar' ? `${soonest.tool_name} ينتهي بعد ${days} أيام` : `${soonest.tool_name} expires in ${days} days`,
      subtitle: lang==='ar' ? 'فكر في التجديد قريباً' : 'Consider renewing soon',
      cta: lang==='ar' ? 'تجديد' : 'Renew',
      href: `/u/checkout?tool_id=${soonest.tool_id||soonest.id}&renew=1`,
    }
  } else if (unreadNotif) {
    const notifTitle = (lang !== 'ar' && unreadNotif.title_en) ? unreadNotif.title_en : (unreadNotif.title || (lang==='ar' ? 'لديك إشعار جديد' : 'You have a new notification'))
    const notifSub   = (lang !== 'ar' && unreadNotif.message_en) ? unreadNotif.message_en : (unreadNotif.message || '')
    action = {
      type: 'notif',
      title: notifTitle,
      subtitle: notifSub,
      cta: lang==='ar' ? 'عرض' : 'View',
      href: '/u/helpdesk',
    }
  } else if (isNewMember) {
    action = {
      type: 'new_member',
      title: lang==='ar' ? 'مرحباً! ابدأ رحلتك مع Pro Keys' : 'Welcome! Start your Pro Keys journey',
      subtitle: lang==='ar' ? 'تصفح أشهر الأدوات وابدأ الاشتراك' : 'Browse our most popular tools',
      cta: lang==='ar' ? 'تصفح المتجر' : 'Browse Shop',
      href: '/u/store',
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
  id:string; tool_id?:string; tool_name:string; tool_image?:string
  tool_video?:string; duration_label:string; category_slug?:string
  status?:string; expires_at?:string; starts_at?:string; payment_method:string
  amount_egp:number; duration_days?:number; retail_price_egp?:number
  has_delivery?:boolean; delivery_viewed?:boolean; created_at?:string
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

// ── Credentials Modal ─────────────────────────────────────
function CredentialsModal({ purchase, onClose, t, lang, settings }: {
  purchase: Purchase; onClose: ()=>void; t: any; lang: string; settings: any
}) {
  const [delivery, setDelivery]   = useState<any>(null)
  const [loading,  setLoading]    = useState(true)
  const [showPass, setShowPass]   = useState(false)
  const [copied,   setCopied]     = useState<string|null>(null)
  const isRtl = lang === 'ar'

  useEffect(()=>{
    fetch(`/api/member/delivery?purchase_id=${purchase.id}`)
      .then(r=>r.json())
      .then(d=>setDelivery(d.delivery||null))
      .finally(()=>setLoading(false))
  },[purchase.id])

  const copy = async (text:string, field:string) => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(()=>setCopied(null), 2000)
  }

  const days = daysLeft(purchase.expires_at)
  const isAccount = delivery?.delivery_type === 'account'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="rounded-3xl w-full max-w-md overflow-hidden"
        style={{
          background:'rgba(255,255,255,0.92)',
          backdropFilter:'blur(32px)',
          WebkitBackdropFilter:'blur(32px)',
          border:'1px solid rgba(255,255,255,0.7)',
          boxShadow:'0 32px 80px rgba(0,0,0,0.2)',
        }}
        onClick={e=>e.stopPropagation()} dir={isRtl?'rtl':'ltr'}>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-5"
          style={{background:'linear-gradient(135deg,#0d0f14 0%,#1a1200 100%)'}}>
          <div className="absolute inset-0 opacity-20"
            style={{backgroundImage:'radial-gradient(circle at 80% 20%, #d9940140, transparent 60%)'}}/>
          <button onClick={onClose}
            className="absolute top-4 end-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-colors">
            <X size={14}/>
          </button>
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {purchase.tool_image
                ? <img src={purchase.tool_image} className="w-9 h-9 object-contain" alt=""/>
                : <span className="text-white font-bold text-sm">{purchase.tool_name.slice(0,2)}</span>}
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">{purchase.tool_name}</div>
              <div className="flex items-center gap-2 mt-1">
                {days !== null && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${days<=3?'bg-red-500/20 text-red-300':days<=7?'bg-amber-500/20 text-amber-300':'bg-emerald-500/20 text-emerald-300'}`}>
                    {isRtl?`ينتهي بعد ${days} يوم`:`${days}d left`}
                  </span>
                )}
                <span className="text-[11px] text-white/40">{purchase.duration_label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
            </div>
          ) : !delivery ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <Clock size={24} className="text-amber-400"/>
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">{t('Account Being Prepared','جاري تجهيز حسابك')}</p>
              <p className="text-xs text-gray-400 mb-4">{t('Credentials will be delivered shortly','سيتم تسليم البيانات قريباً')}</p>
              <a href={`https://wa.me/${(settings.whatsapp_number||'').replace(/\D/g,'')}?text=${encodeURIComponent(`متى سيتم تسليم حساب ${purchase.tool_name}؟`)}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold bg-green-500 hover:bg-green-600 transition-colors">
                💬 {t('Ask on WhatsApp','استفسر على WhatsApp')}
              </a>
            </div>
          ) : (
            <div className="space-y-3">

              {isAccount ? (<>
                {/* Email row */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{t('Email','البريد الإلكتروني')}</div>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                    <span className="flex-1 text-sm font-mono text-gray-900 dark:text-gray-100 truncate" dir="ltr">{delivery.email}</span>
                    <button onClick={()=>copy(delivery.email,'email')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${copied==='email'?'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600':'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                      {copied==='email'?<CheckCircle size={13}/>:<Copy size={13}/>}
                    </button>
                  </div>
                </div>

                {/* Password row */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{t('Password','كلمة المرور')}</div>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                    <span className="flex-1 text-sm font-mono text-gray-900 dark:text-gray-100" dir="ltr">
                      {showPass ? delivery.password : '••••••••••••'}
                    </span>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={()=>setShowPass(s=>!s)}
                        className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                        {showPass?<EyeOff size={13}/>:<Eye size={13}/>}
                      </button>
                      <button onClick={()=>copy(delivery.password,'pass')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${copied==='pass'?'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600':'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        {copied==='pass'?<CheckCircle size={13}/>:<Copy size={13}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </>) : (
                /* Key row */
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{t('License Key','مفتاح الترخيص')}</div>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                    <span className="flex-1 text-sm font-mono text-gray-900 dark:text-gray-100 break-all" dir="ltr">
                      {showPass ? delivery.key : '••••-••••-••••-••••'}
                    </span>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={()=>setShowPass(s=>!s)}
                        className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                        {showPass?<EyeOff size={13}/>:<Eye size={13}/>}
                      </button>
                      <button onClick={()=>copy(delivery.key,'pass')}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${copied==='pass'?'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600':'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                        {copied==='pass'?<CheckCircle size={13}/>:<Copy size={13}/>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {delivery.notes && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">{t('Notes','ملاحظات')}</div>
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{delivery.notes}</p>
                </div>
              )}

              {/* Delivered at */}
              <p className="text-[11px] text-gray-400 text-center pt-1">
                {t('Delivered','تم التسليم')} {new Date(delivery.delivered_at).toLocaleDateString(lang==='ar'?'ar-EG':'en-GB')}
              </p>

              {/* Renew CTA if expiring soon */}
              {days !== null && days <= 7 && (
                <a href={`/u/checkout?tool_id=${purchase.tool_id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-black text-sm font-bold mt-1"
                  style={{background:'linear-gradient(90deg,#d99401,#f59e0b)'}}>
                  ⚡ {t('Renew Now','جدد الآن')}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ days, t }:{ days:number|null; t:any }) {
  if (days===null) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">{t('Lifetime','مدى الحياة')}</span>
  if (days<=3) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-500/10 text-red-600 animate-pulse">⚠ {days} {t('d','ي')}</span>
  if (days<=7) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600">{days} {t('days','أيام')}</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><CheckCircle size={9}/> {days} {t('days','أيام')}</span>
}

function QuickStats({ purchases, t, lang, currency, formatPrice, usdRate }: {
  purchases: Purchase[]; t: any; lang: string
  currency: string; formatPrice: (egp: number, rate?: number) => string; usdRate: number
}) {
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
      label:  lang === 'ar' ? 'الاشتراكات النشطة' : 'Active Subscriptions',
      value:  active,
      sub:    lang === 'ar' ? 'اشتراك نشط' : 'active plans',
      Icon:   LayoutGrid,
      accent: '#6366f1',
    },
    {
      label:  lang === 'ar' ? 'أقرب تجديد' : 'Next Renewal',
      value:  nextDays !== null ? nextDays : '—',
      sub:    nextDays !== null ? (lang === 'ar' ? 'يوم متبقي' : 'days left') : (lang === 'ar' ? 'لا يوجد' : 'none'),
      Icon:   CalendarClock,
      accent: '#f59e0b',
    },
    {
      label:  lang === 'ar' ? 'الإنفاق الشهري' : 'Monthly Spend',
      value:  formatPrice(Math.round(monthlySpend), usdRate),
      sub:    currency === 'usd'
        ? `${Math.round(monthlySpend).toLocaleString()} ${lang==='ar'?'جنيه':'EGP'} / ${lang==='ar'?'شهر':'mo'}`
        : lang === 'ar' ? 'شهرياً' : 'per month',
      Icon:   Wallet,
      accent: '#ef4444',
    },
    {
      label:  lang === 'ar' ? 'التوفير الشهري' : 'Monthly Savings',
      value:  monthlySavings > 0 ? formatPrice(Math.round(monthlySavings), usdRate) : '—',
      sub:    monthlySavings > 0
        ? currency === 'usd'
          ? `${Math.round(monthlySavings).toLocaleString()} ${lang==='ar'?'جنيه':'EGP'} / ${lang==='ar'?'شهر':'mo'}`
          : lang === 'ar' ? 'شهرياً' : 'per month'
        : (lang === 'ar' ? 'أضف سعر السوق' : 'set market price'),
      Icon:   TrendingDown,
      accent: '#10b981',
    },
  ]

  const savingsHint = monthlySavings > 0
    ? (lang === 'ar' ? 'مقابل السعر الرسمي' : 'vs. official price')
    : null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, sub, Icon, accent }, i) => {
        const isSavings = i === 3
        return (
          <div key={i} className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm">
            <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${accent}, transparent 65%)` }}/>
            <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}/>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '20' }}>
                <Icon size={15} style={{ color: accent }}/>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none tabular-nums">{value}</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-400 dark:text-gray-600">{sub}</span>
              {isSavings && savingsHint && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: accent + '15', color: accent }}>
                  {savingsHint}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function MyOrdersPage() {
  const router = useRouter()
  const settings  = useSiteSettings()
  const usdRate   = parseFloat(settings.usd_to_egp_rate || '50')
  const { t, lang, dir, currency, formatPrice } = useLang()
  const [purchases,    setPurchases]    = useState<Purchase[]>([])
  const [free,         setFree]         = useState<FreeTool[]>([])
  const [loading,      setLoading]      = useState(true)
  const [extReady,     setExtReady]     = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [connectingId, setConnectingId] = useState<string|null>(null)
  const [connectedId,  setConnectedId]  = useState<string|null>(null)
  const [quickError,   setQuickError]   = useState<string|null>(null)
  const [memberCreatedAt, setMemberCreatedAt] = useState<string|null>(null)
  const [hasTicket,    setHasTicket]    = useState(false)
  const [credPurchase,  setCredPurchase]  = useState<Purchase|null>(null)
  const [ratingPurchase,setRatingPurchase]= useState<Purchase|null>(null)
  const [ratingVal,     setRatingVal]     = useState(0)
  const [ratingTxt,     setRatingTxt]     = useState('')
  const [ratingBusy,    setRatingBusy]    = useState(false)
  const [confirmBusy,   setConfirmBusy]   = useState<string|null>(null)
  const [subFilter,     setSubFilter]     = useState<'all'|'shared'|'private'|'expiring'|'connected'>('all')
  const [orderQ,        setOrderQ]        = useState('')
  const [secBanners,    setSecBanners]    = useState<{url:string;link?:string}[]>([])
  const activeRef = useRef<string|null>(null)

  const fetchPurchases = () => {
    fetch('/api/member/purchases').then(r=>r.ok?r.json():{purchases:[]}).then(d=>setPurchases(d.purchases||[]))
  }

  const confirmDelivery = async (orderId: string) => {
    setConfirmBusy(orderId)
    await fetch(`/api/member/orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm_delivery' }),
    })
    fetchPurchases()
    setConfirmBusy(null)
  }

  const submitRating = async () => {
    if (!ratingPurchase || ratingVal === 0) return
    setRatingBusy(true)
    await fetch(`/api/member/orders/${ratingPurchase.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rate', rating: ratingVal, comment: ratingTxt }),
    })
    setRatingBusy(false)
    setRatingPurchase(null)
    setRatingVal(0)
    setRatingTxt('')
  }

  useEffect(()=>{
    fetch('/api/ui-settings').then(r=>r.json()).then(d=>{
      const ui = d.settings as Record<string,string>
      try {
        const parsed = JSON.parse(ui?.orders_banners || '[]')
        if (parsed.length) { setSecBanners(parsed.map((s:any)=>typeof s==='string'?{url:s}:s)); return }
      } catch {}
      if (ui?.orders_banner_url) setSecBanners([{ url: ui.orders_banner_url }])
    }).catch(()=>{})

    Promise.all([
      fetch('/api/member/purchases').then(r=>r.ok?r.json():{purchases:[]}),
      fetch('/api/member/shop').then(r=>r.ok?r.json():{free:[]}),
      fetch('/api/member/notifications').then(r=>r.ok?r.json():{notifications:[]}),
      fetch('/api/member/verify').then(r=>r.ok?r.json():{}),
      fetch('/api/member/tickets').then(r=>r.ok?r.json():{tickets:[]}),
    ]).then(([pData,sData,nData,vData,tData])=>{
      setPurchases(pData.purchases||[])
      setFree(sData.free||[])
      setNotifications(nData.notifications||[])
      if ((vData as any)?.created_at) setMemberCreatedAt((vData as any).created_at)
      setHasTicket(((tData as any)?.tickets||[]).length > 0)
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
        if (d.success) {
          setConnectedId(activeRef.current)
          // confirm state from extension
          window.postMessage({type:'PK_GET_STATE'},'*')
        } else {
          setConnectedId(null)
          setQuickError(d.error || t('Connection failed','فشل الاتصال'))
          setTimeout(()=>setQuickError(null), 4000)
        }
      }
      if (d.type==='PK_DISCONNECT_RESULT') {
        setConnectedId(null)
        setConnectingId(null)
        activeRef.current = null
      }
    }
    window.addEventListener('message', handler)
    // Initial burst: ping every 300ms for first 5s, then keep pinging every 3s until detected
    let attempts = 0
    const burst = setInterval(()=>{
      if (attempts>=17){ clearInterval(burst); return }
      attempts++
      window.postMessage({type:'PK_PING'},'*')
    }, 300)
    const keepAlive = setInterval(()=>{
      window.postMessage({type:'PK_PING'},'*')
    }, 3000)
    return ()=>{ window.removeEventListener('message', handler); clearInterval(burst); clearInterval(keepAlive) }
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
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
    </div>
  )

  return (
    <div className="p-3 md:p-6" dir={dir}>

      {secBanners.length > 0 && (
        <BannerSlider slides={secBanners} maxHeight={220} className="mb-5"/>
      )}

      <NotifBanner lang={lang} match={['تسليم','تحديث','delivered','updated','Order','طلب']}/>

      {/* ── Status cards — always at top ── */}
      {!loading && <QuickStats purchases={purchases} t={t} lang={lang} currency={currency} formatPrice={formatPrice} usdRate={usdRate}/>}

      {/* ── Action banners — below stats ── */}
      <ReviewPrompt purchases={purchases} t={t} lang={lang}/>

      <OnboardingChecklist
        createdAt={memberCreatedAt} extReady={extReady}
        hasPurchase={purchases.length>0}
        t={t} lang={lang}
      />

      <SmartNextAction purchases={purchases} notifications={notifications} loading={loading} t={t} lang={lang}/>

      {quickError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          ⚠ {quickError}
        </div>
      )}

      {/* My Active Subscriptions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            {t('My Active Subscriptions','اشتراكاتي النشطة')}
          </h2>
          {purchases.length>0 && (
            <span className="text-xs text-gray-400">{purchases.length} {t('order','طلب')}</span>
          )}
        </div>

        {/* Filter bar */}
        {purchases.length>0 && (
          <div className="mb-4 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center gap-2 glass-filter-bar">
            {/* Search — left on desktop, fills remaining space */}
            <div className="relative w-full sm:flex-1 sm:min-w-0">
              <Search size={12} className="absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{[lang==='ar'?'right':'left']:8}}/>
              <input value={orderQ} onChange={e=>setOrderQ(e.target.value)}
                placeholder={lang==='ar'?'بحث في الاشتراكات…':'Search subscriptions…'}
                className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#0ea5e9] transition-all"
                style={{padding:'6px 8px',[lang==='ar'?'paddingRight':'paddingLeft']:26}}/>
              {orderQ && (
                <button onClick={()=>setOrderQ('')} className="absolute top-1/2 -translate-y-1/2 text-gray-400" style={{[lang==='ar'?'left':'right']:6}}>
                  <X size={10}/>
                </button>
              )}
            </div>
            {/* Filter chips — right, scroll horizontally on overflow */}
            <div className="flex items-center gap-1.5 overflow-x-auto flex-shrink-0" style={{scrollbarWidth:'none'}}>
              {([
                {key:'all',      en:'All',           ar:'الكل',          color:'#0ea5e9', count:purchases.length},
                {key:'shared',   en:'Shared',        ar:'مشتركة',        color:'#d99401', count:purchases.filter(p=>p.category_slug==='shared').length},
                {key:'private',  en:'Private',       ar:'خاصة',          color:'#8b5cf6', count:purchases.filter(p=>p.category_slug==='private').length},
                {key:'expiring', en:'Expiring Soon', ar:'تنتهي قريباً',  color:'#f59e0b', count:purchases.filter(p=>{ const d=daysLeft(p.expires_at); return d!==null&&d<=5 }).length},
                {key:'connected',en:'Connected',     ar:'متصل',          color:'#10b981', count:connectedId?1:0},
              ] as const).map(f=>{
                const active = subFilter===f.key
                return (
                  <button key={f.key} onClick={()=>setSubFilter(f.key)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 whitespace-nowrap border"
                    style={active
                      ? {borderColor:f.color,color:f.color,background:f.color+'18'}
                      : {borderColor:'transparent',color:'#6b7280',background:'rgba(128,128,128,0.1)'}}>
                    {lang==='ar'?f.ar:f.en}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={active?{background:f.color,color:'#fff'}:{background:'rgba(128,128,128,0.15)',color:'#9ca3af'}}>
                      {f.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {purchases.length===0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Package size={24} className="text-gray-300"/>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('No orders yet','لا توجد طلبات بعد')}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {t('Browse our tools and place your first order.','تصفح أدواتنا وأنشئ طلبك الأول.')}
            </p>
            <a href="/u/dashboard"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-colors" style={{background:'#d99401'}}>
              {t('Browse Tools →','تصفح الأدوات →')}
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...purchases]
              .filter(p => {
                const d = daysLeft(p.expires_at)
                if (subFilter==='shared')   return p.category_slug==='shared'
                if (subFilter==='private')  return p.category_slug==='private'
                if (subFilter==='expiring') return d!==null && d<=5
                if (subFilter==='connected')return connectedId===p.id
                return true
              })
              .filter(p => !orderQ || p.tool_name.toLowerCase().includes(orderQ.toLowerCase()))
              .sort((a,b) => new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime())
              .map(p=>{
              const days         = daysLeft(p.expires_at)
              const isShared     = p.category_slug === 'shared'
              const isPrivate    = p.category_slug === 'private'
              const isConnecting = connectingId === p.id
              const isConnected  = connectedId  === p.id
              const isPending    = p.status === 'pending'
              const isDelivered  = p.status === 'delivered'
              const isCompleted  = p.status === 'completed'

              return (
                <div key={p.id} className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#d99401]/40 dark:hover:border-[#d99401]/30 transition-all duration-200">
                  <div className="h-1 w-full" style={{background:'linear-gradient(90deg,#d99401,#f5b800)'}}/>

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
                    <div className="flex items-center gap-1.5 text-xs font-medium mb-2 text-red-400">
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

                    {/* Renew button — shown when ≤7 days left */}
                    {days !== null && days <= 7 && (
                      <button
                        onClick={()=>router.push(`/u/checkout?tool_id=${p.tool_id||p.id}&renew=1`)}
                        className="w-full mb-2.5 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
                        style={{background: days <= 3 ? '#ef4444' : '#d99401'}}>
                        <RotateCcw size={11}/>
                        {days <= 3
                          ? t(`⚠ Renew Now — ${days}d left`, `⚠ جدّد الآن — ${days} ${days===1?'يوم':'أيام'} متبقية`)
                          : t(`Renew — ${days}d left`, `جدّد — ${days} ${days===1?'يوم':'أيام'} متبقية`)
                        }
                      </button>
                    )}

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
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isConnected?'bg-emerald-500 text-white cursor-default':'disabled:opacity-60 text-white shadow-sm'}`}
                            style={isConnected?{}:{background:'#d99401'}}>
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
                            className="flex-1 py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-400 flex items-center justify-center gap-1.5 hover:border-[#d99401]/50 hover:text-[#d99401] transition-all">
                            <Zap size={12}/>{t('Quick Connect','اتصال سريع')}
                          </button>
                        )
                      )}

                      {isPrivate && (<>
                        {/* No delivery yet */}
                        {!p.has_delivery && (
                          <span className="flex-1 py-2.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-500 flex items-center justify-center gap-1.5">
                            <Clock size={12}/>{t('Pending Delivery','في الانتظار')}
                          </span>
                        )}

                        {/* Has delivery — show credentials button */}
                        {p.has_delivery && (
                          <button onClick={()=>setCredPurchase(p)}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 relative"
                            style={{background:'linear-gradient(90deg,#d99401,#f59e0b)',boxShadow:'0 3px 10px #d9940130'}}>
                            {!p.delivery_viewed && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 animate-pulse"/>
                            )}
                            <Eye size={12}/>{t('View Credentials','بيانات الدخول')}
                          </button>
                        )}
                      </>)}
                    </div>

                    {/* Private action row — full-width below main buttons */}
                    {isPrivate && isDelivered && (
                      <button onClick={()=>confirmDelivery(p.id)} disabled={confirmBusy===p.id}
                        className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-all flex items-center justify-center gap-1.5"
                        style={{background:'#10b981'}}>
                        {confirmBusy===p.id
                          ? <><Loader2 size={11} className="animate-spin"/>{t('...','...')}</>
                          : <><CheckCircle size={11}/>{t('Confirm Delivery','تأكيد الاستلام')}</>
                        }
                      </button>
                    )}

                    {isPrivate && isCompleted && (
                      <button onClick={()=>{ setRatingPurchase(p); setRatingVal(0); setRatingTxt('') }}
                        className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        style={{background:'#f59e0b18',border:'1px solid #f59e0b60',color:'#f59e0b'}}>
                        <Star size={11} fill="#f59e0b"/>{t('Rate','تقييم')}
                      </button>
                    )}
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
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-[#d99401]/40 hover:bg-[#d9940108] transition-all group">
                  {tool.image_url
                    ? <img src={tool.image_url} alt={tool.name} className="h-10 w-auto object-contain"/>
                    : <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">{tool.name.slice(0,2).toUpperCase()}</div>
                  }
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">{tool.name}</span>
                  <span className="text-[10px] font-bold group-hover:underline" style={{color:'#d99401'}}>{t('Free Access →','دخول مجاني →')}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {credPurchase && (
        <CredentialsModal
          purchase={credPurchase}
          onClose={()=>setCredPurchase(null)}
          t={t} lang={lang} settings={settings}
        />
      )}

      {/* Rating Modal */}
      {ratingPurchase && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={()=>setRatingPurchase(null)}>
          <div className="rounded-2xl w-full max-w-sm overflow-hidden"
            style={{
              background:'rgba(255,255,255,0.92)',
              backdropFilter:'blur(32px)',
              WebkitBackdropFilter:'blur(32px)',
              border:'1px solid rgba(255,255,255,0.7)',
              boxShadow:'0 24px 64px rgba(0,0,0,0.18)',
            }}
            onClick={e=>e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                {ratingPurchase.tool_image && (
                  <img src={ratingPurchase.tool_image} className="w-7 h-7 object-contain" alt=""/>
                )}
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  {t(`Rate ${ratingPurchase.tool_name}`, `تقييم ${ratingPurchase.tool_name}`)}
                </p>
              </div>
              <button onClick={()=>setRatingPurchase(null)}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <X size={13}/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-center gap-3">
                {[1,2,3,4,5].map(i=>(
                  <button key={i} onClick={()=>setRatingVal(i)} className="transition-transform hover:scale-110">
                    <Star size={30}
                      fill={i<=ratingVal?'#F59E0B':'none'}
                      stroke={i<=ratingVal?'#F59E0B':'#9CA3AF'}/>
                  </button>
                ))}
              </div>
              <textarea value={ratingTxt} onChange={e=>setRatingTxt(e.target.value)} rows={3}
                placeholder={t('Add a comment (optional)...','أضف تعليقاً (اختياري)...')}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#f59e0b] resize-none transition-all"/>
              <button onClick={submitRating} disabled={ratingVal===0||ratingBusy}
                className="w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{background:'#f59e0b'}}>
                {ratingBusy?'...':(t('Submit Review','إرسال التقييم'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
