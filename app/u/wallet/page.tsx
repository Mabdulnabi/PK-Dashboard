'use client'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { Check, Clock, X, ChevronLeft, ChevronRight, Download, Wallet, TrendingUp, TrendingDown, Plus, ArrowUpRight, Copy, Trophy } from 'lucide-react'

interface WalletData {
  balance_egp: number; balance_usd: number
  last_charge: { amount: number; currency: string; created_at: string } | null
  last_deduct: { amount: number; currency: string; created_at: string } | null
  pending_charges: any[]
  total_spent_egp: number
}

// ── Rank system (mirrors profile page) ───────────────────────────────────────
const RANKS = [
  { key: 'regular',  ar: 'عادي',    en: 'Regular',  min: 0,      color: '#5a8098', light: '#b8d0e0', darkest: '#182e3c' },
  { key: 'bronze',   ar: 'برونزي',  en: 'Bronze',   min: 1,      color: '#b06030', light: '#f0bc78', darkest: '#321404' },
  { key: 'silver',   ar: 'فضي',     en: 'Silver',   min: 2000,   color: '#8888a0', light: '#e4e4f0', darkest: '#242432' },
  { key: 'gold',     ar: 'ذهبي',    en: 'Gold',     min: 8000,   color: '#c89010', light: '#fff060', darkest: '#342000' },
  { key: 'platinum', ar: 'بلاتيني', en: 'Platinum', min: 20000,  color: '#7898b8', light: '#dce8f8', darkest: '#1c2c48' },
  { key: 'emerald',  ar: 'زمردي',   en: 'Emerald',  min: 40000,  color: '#18a050', light: '#78f0a0', darkest: '#042c14' },
  { key: 'diamond',  ar: 'ماسي',    en: 'Diamond',  min: 60000,  color: '#3870b8', light: '#c0e0fc', darkest: '#0a1848' },
] as const

type RankKey = typeof RANKS[number]['key']

function getRank(spent: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (spent >= RANKS[i].min) return RANKS[i]
  }
  return RANKS[0]
}

const BADGE_CFG = {
  regular:  { g0:'#c8dce8', g1:'#6888a0', g2:'#1e3448', ft:'#d8eaf8', fur:'#a0c0d8', fb:'#182838', fll:'#243c50', ib:'#eef4f8' },
  bronze:   { g0:'#ffe090', g1:'#c07820', g2:'#3c1400', ft:'#ffe8a0', fur:'#d89838', fb:'#301000', fll:'#5a2808', ib:'#fef4e4' },
  silver:   { g0:'#ffffff', g1:'#9898a8', g2:'#202028', ft:'#ffffff', fur:'#dcdcec', fb:'#181820', fll:'#323240', ib:'#f0f0f6' },
  gold:     { g0:'#f5d060', g1:'#d99401', g2:'#3a1800', ft:'#f5d878', fur:'#d99401', fb:'#2a1000', fll:'#5c2800', ib:'#fff4e0' },
  platinum: { g0:'#f4f8ff', g1:'#7898c0', g2:'#182840', ft:'#f8fcff', fur:'#ccdcf4', fb:'#101e34', fll:'#203050', ib:'#c8d8ee' },
  emerald:  { g0:'#a8ffcc', g1:'#14b850', g2:'#022c10', ft:'#b8ffd4', fur:'#44ec84', fb:'#011c0a', fll:'#054018', ib:'#edfff4' },
  diamond:  { g0:'#e0f0ff', g1:'#4090d8', g2:'#081428', ft:'#eaf6ff', fur:'#b0d4f8', fb:'#060e20', fll:'#102040', ib:'#eef6ff' },
} as const

function MiniHexBadge({ rk, size = 44 }: { rk: typeof RANKS[number]; size?: number }) {
  const c = BADGE_CFG[rk.key as keyof typeof BADGE_CFG]
  const gid = `whg-${rk.key}`
  const icons: Record<RankKey, React.ReactNode> = {
    regular:  <><circle cy={-5} r={5.5} fill="#5a8098"/><path d="M-8,11 Q-8,2 0,2 Q8,2 8,11" fill="#5a8098"/></>,
    bronze:   <><polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" fill="none" stroke="#c07820" strokeWidth="2.2" strokeLinejoin="round"/><circle r={3.5} fill="#c07820"/></>,
    silver:   <><polygon points="0,-10 8.5,-5 0,0 -8.5,-5" fill="#e8e8f4"/><polygon points="-8.5,-5 0,0 0,10 -8.5,5" fill="#808090"/><polygon points="8.5,-5 8.5,5 0,10 0,0" fill="#545462"/></>,
    gold:     <><polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#a06800"/><polygon points="0,0 0,-12 10.4,-6" fill="#f5d060"/><polygon points="0,0 10.4,-6 10.4,6" fill="#c88000"/><polygon points="0,0 10.4,6 0,12" fill="#b87000"/><polygon points="0,0 0,12 -10.4,6" fill="#7a4000"/><polygon points="0,0 -10.4,6 -10.4,-6" fill="#8c5000"/><polygon points="0,0 -10.4,-6 0,-12" fill="#d99401"/></>,
    platinum: <path fill="#4a78c8" d="M0,-15 3.6,-4.7 14.3,-4.7 6.1,1.7 9.0,12.4 0,6.4 -9.0,12.4 -6.1,1.7 -14.3,-4.7 -3.6,-4.7Z"/>,
    emerald:  <><polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#14a848"/><polygon points="0,-12 10.4,-6 0,-4" fill="#a0ffc8"/><polygon points="0,-12 -10.4,-6 0,-4" fill="#70f0a0"/><polygon points="10.4,-6 10.4,6 0,0 0,-4" fill="#0a8030"/><polygon points="-10.4,-6 -10.4,6 0,0 0,-4" fill="#14a040"/><polygon points="10.4,6 0,12 -10.4,6 0,0" fill="#086028"/></>,
    diamond:  <><polygon points="-9,-13 9,-13 15,-2 -15,-2" fill="#90c4f4"/><polygon points="-9,-13 0,-8 -15,-2" fill="#e0f4ff"/><polygon points="9,-13 15,-2 0,-8" fill="#cce8ff"/><polygon points="-9,-13 9,-13 0,-8" fill="#f4faff"/><polygon points="-15,-2 15,-2 0,14" fill="#4898e0"/><polygon points="-15,-2 0,-2 0,14" fill="#2870c0"/><polygon points="15,-2 0,14 0,-2" fill="#7ab8f0"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="-42 -48 84 96"
      style={{filter:`drop-shadow(0 0 6px ${rk.color}88)`}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0%"   stopColor={c.g0}/>
          <stop offset="50%"  stopColor={c.g1}/>
          <stop offset="100%" stopColor={c.g2}/>
        </linearGradient>
      </defs>
      {/* Outer hex ring */}
      <polygon points="0,-44 38.1,-22 38.1,22 0,44 -38.1,22 -38.1,-22" fill={`url(#${gid})`}/>
      {/* Inner dark circle */}
      <circle r={28} fill={c.ib}/>
      <circle r={26} fill={c.g2}/>
      {/* Icon */}
      <g>{icons[rk.key as RankKey]}</g>
    </svg>
  )
}
interface Gateway {
  id: string; name_ar: string; name_en: string; currency: string
  logo_url?: string; qr_url?: string
  uid?: string; uid_label_en?: string; uid_label_ar?: string
  instructions_en?: string; instructions_ar?: string
  is_dynamic?: boolean; edge_fn?: string | null
}

// Skeleton shimmer block
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg ${className || ''}`}/>
}

function WalletCard({ icon: Icon, label, value, sub, accent, featured, children }: {
  icon: any; label: string; value: string; sub?: string; accent: string; featured?: boolean; children?: React.ReactNode
}) {
  if (featured) return (
    <div className="rounded-2xl p-6 flex flex-col gap-3 relative overflow-hidden flex-1 min-w-[180px]"
      style={{background:`linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, boxShadow:`0 8px 32px ${accent}44`}}>
      <div className="absolute inset-0 opacity-10" style={{background:'radial-gradient(circle at bottom left, #fff, transparent 65%)'}}/>
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Icon size={15} className="text-white"/>
        </div>
      </div>
      <div className="text-3xl font-black text-white leading-none tabular-nums relative z-10">{value}</div>
      {children}
    </div>
  )
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm flex-1 min-w-[140px]">
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none" style={{background:`radial-gradient(circle at top right,${accent},transparent 65%)`}}/>
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60" style={{background:`linear-gradient(90deg,${accent},transparent)`}}/>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:accent+'20'}}>
          <Icon size={15} style={{color:accent}}/>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none tabular-nums">{value}</div>
      {children}
      {sub && !children && <div className="text-[11px] text-gray-400 dark:text-gray-600">{sub}</div>}
    </div>
  )
}

export default function PaymentsPage() {
  const { t, lang, formatPrice, dir, currency } = useLang()
  const [payments, setPayments] = useState<any[]>([])
  const [wallet,   setWallet]   = useState<WalletData|null>(null)
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [perPage,  setPerPage]  = useState(10)
  const [showTopUp,setShowTopUp]= useState(false)
  const [topUpGw,  setTopUpGw]  = useState('')
  const [topUpAmt, setTopUpAmt] = useState('')
  const [topUpCur, setTopUpCur] = useState('EGP')
  const [topUpTx,  setTopUpTx]  = useState('')
  const [topUpSent,setTopUpSent]= useState(false)
  const [submitting,setSubmitting]=useState(false)
  const [downloading, setDownloading] = useState<string|null>(null)
  const [easykashWaiting, setEasykashWaiting] = useState(false)
  const [easykashError, setEasykashError] = useState<string|null>(null)
  const [copiedUid, setCopiedUid] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const copyUid = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUid(true)
      setTimeout(() => setCopiedUid(false), 2000)
    })
  }

  const refreshWallet = () =>
    fetch('/api/member/wallet').then(r=>r.json()).then(wd=>{ if (wd && !wd.error) setWallet(wd) })

  useEffect(()=>{
    Promise.all([
      fetch('/api/member/payment').then(r=>r.json()),
      fetch('/api/member/wallet').then(r=>r.json()).catch(()=>null),
      fetch('/api/member/gateways').then(r=>r.json()).catch(()=>({gateways:[]})),
    ]).then(([pd, wd, gd])=>{
      setPayments(pd.payments||[])
      if (wd && !wd.error) setWallet(wd)
      setGateways(gd.gateways||[])
      setLoading(false)
    })
    // Poll wallet balance every 30s for real-time balance updates
    const interval = setInterval(refreshWallet, 30_000)
    return () => clearInterval(interval)
  },[])

  const fmtAmt = (n:number, cur:string) => `${Number(n).toLocaleString()} ${cur}`
  const fmtDate = (d:string) => new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})

  // Active balance based on selected currency
  const balAmt = wallet ? (currency === 'usd' ? wallet.balance_usd : wallet.balance_egp) : 0
  const balCur = currency === 'usd' ? 'USD' : 'EGP'

  const submitTopUp = async () => {
    if (!topUpAmt || !topUpGw) return
    setSubmitting(true)
    const gw = gateways.find(g=>g.id===topUpGw)
    await fetch('/api/member/wallet',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ amount:parseFloat(topUpAmt), currency:topUpCur, gateway:topUpGw, gateway_name:gw?.name_en, tx_ref:topUpTx }),
    })
    setSubmitting(false); setTopUpSent(true)
  }

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  const handleEasykash = async () => {
    if (!topUpAmt || !topUpGw || !activeGw) return
    setSubmitting(true)
    setEasykashError(null)
    try {
      // Step 1: create payment record
      const cr = await fetch('/api/member/payment/create', {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ gateway: activeGw.name_en, amount: parseFloat(topUpAmt), currency: topUpCur }),
      })
      const { payment_id, error: ce } = await cr.json()
      if (!payment_id) throw new Error(ce || 'Failed to create payment')

      // Step 2: get EasyKash payment link
      const lr = await fetch('/api/member/payment/verify', {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ edge_fn: 'create-easykash-link', payment_id, amount: parseFloat(topUpAmt) }),
      })
      const ld = await lr.json()
      if (!ld.payUrl) throw new Error(ld.error || 'Failed to create payment link')

      // Step 3: navigate to payment link
      // Try new tab first; if popup blocked fall back to current tab
      const opened = window.open(ld.payUrl, '_blank')
      if (!opened) window.location.href = ld.payUrl

      setSubmitting(false)
      setEasykashWaiting(true)

      // Step 4: poll for verification
      pollingRef.current = setInterval(async () => {
        try {
          const pr = await fetch('/api/member/payment/verify', {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ edge_fn: 'verify-easykash', payment_id }),
          })
          const pd = await pr.json()
          if (pd.verified || pd.success) {
            clearInterval(pollingRef.current!)
            setEasykashWaiting(false)
            setTopUpSent(true)
            fetch('/api/member/wallet').then(r=>r.json()).then(wd=>{ if (!wd.error) setWallet(wd) })
          }
        } catch {}
      }, 5000)
    } catch (e: any) {
      setSubmitting(false)
      setEasykashError(e.message || 'Something went wrong')
    }
  }

  const statusIcon = (s:string) =>
    s==='completed'?<Check size={13} className="text-emerald-500"/>:
    s==='pending'  ?<Clock size={13} className="text-amber-500"/>:
                    <X size={13} className="text-red-500"/>

  const statusStyle = (s:string) =>
    s==='completed'?{bg:'#DCFCE7',color:'#166534'}:
    s==='pending'  ?{bg:'#FEF3C7',color:'#92400E'}:
                    {bg:'#FEE2E2',color:'#991B1B'}

  const statusLabel = (s:string) =>
    s==='completed'?t('Completed','مكتمل'):
    s==='pending'  ?t('Pending','معلق'):
                    t('Failed','فشل')

  const totalPages = Math.ceil(payments.length/perPage)
  const paginated  = payments.slice((page-1)*perPage, page*perPage)

  const downloadInvoice = async (id: string, paymentCode?: string) => {
    setDownloading(id)
    const res  = await fetch(`/api/member/invoices/${id}`)
    if (!res.ok) { setDownloading(null); return }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${paymentCode || 'invoice-' + id.slice(0,8)}.pdf`
    a.click(); URL.revokeObjectURL(url)
    setDownloading(null)
  }

  const cols = [
    t('Code','الكود'),
    t('Description','البيان'),
    t('Amount','المبلغ'),
    t('Method','وسيلة الدفع'),
    t('Status','الحالة'),
    t('Date','التاريخ'),
    '',
  ]

  const activeGw = gateways.find(g=>g.id===topUpGw)

  return (
    <div dir={dir} className="p-3 md:p-6 space-y-4">

      {/* ── Wallet Cards skeleton ── */}
      {loading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-24"/>
            <Skeleton className="h-8 w-32"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton className="h-32 rounded-2xl"/>
            <Skeleton className="h-32 rounded-xl"/>
            <Skeleton className="h-28 rounded-xl"/>
            <Skeleton className="h-28 rounded-xl"/>
          </div>
        </div>
      )}

      {/* ── Wallet Cards ── */}
      {!loading && wallet !== null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('My Wallet','محفظتي')}</h2>
            <button onClick={()=>{ setShowTopUp(v=>!v); setTopUpSent(false); setTopUpAmt(''); setTopUpTx(''); setTopUpGw(gateways[0]?.id||'') }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
              style={{background:'#22c55e',boxShadow:'0 4px 12px #22c55e33'}}>
              <Plus size={13}/> {t('Topup your wallet','شحن محفظتي')}
            </button>
          </div>
          {(() => {
            const spent    = wallet.total_spent_egp ?? 0
            const rank     = getRank(spent)
            const rankIdx  = RANKS.findIndex(r => r.key === rank.key)
            const nextRank = RANKS[rankIdx + 1] as typeof RANKS[number] | undefined
            const progress = nextRank ? Math.min(100, ((spent - rank.min) / (nextRank.min - rank.min)) * 100) : 100
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1 — Balance */}
                <WalletCard icon={Wallet} label={t('Wallet Balance','رصيد المحفظة')} value={fmtAmt(balAmt, balCur)} accent="#d99401" featured>
                  <div className="text-white/70 text-xs font-medium relative z-10">
                    {t('Also available','متاح أيضاً')}: {fmtAmt(currency==='usd'?wallet.balance_egp:wallet.balance_usd, currency==='usd'?'EGP':'USD')}
                  </div>
                </WalletCard>

                {/* 2 — Rank card */}
                <div className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden flex-1 min-w-[140px] bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm">
                  <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1] pointer-events-none" style={{background:`radial-gradient(circle at top right,${rank.color},transparent 65%)`}}/>
                  <div className="absolute top-0 left-0 right-0 h-[2px] opacity-70" style={{background:`linear-gradient(90deg,${rank.color},transparent)`}}/>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{t('My Rank','رتبتي')}</span>
                    <Trophy size={15} style={{color:rank.color}}/>
                  </div>
                  <div className="flex items-center gap-3">
                    <MiniHexBadge rk={rank} size={44}/>
                    <div>
                      <div className="text-lg font-black leading-none tabular-nums" style={{color:rank.light}}>{lang==='ar' ? rank.ar : rank.en}</div>
                      <div className="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5">{(spent).toLocaleString()} EGP {t('spent','مُنفق')}</div>
                    </div>
                  </div>
                  {nextRank ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{lang==='ar' ? nextRank.ar : nextRank.en}</span>
                        <span className="text-[10px] font-bold" style={{color:rank.color}}>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{width:`${progress}%`, background:`linear-gradient(90deg,${rank.color},${nextRank.color})`}}/>
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-600">
                        {(nextRank.min - spent).toLocaleString()} EGP {t('to next rank','للرتبة التالية')}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold" style={{color:rank.color}}>🏆 {t('Max rank!','الرتبة الأعلى!')}</div>
                  )}
                </div>

                {/* 3 — Last Charge */}
                <WalletCard icon={TrendingUp} label={t('Last Charge','آخر شحن')}
                  value={wallet.last_charge ? fmtAmt(wallet.last_charge.amount, wallet.last_charge.currency) : '—'}
                  accent="#22C55E">
                  {wallet.last_charge && (
                    <div className="text-[11px] text-gray-400 dark:text-gray-600">{fmtDate(wallet.last_charge.created_at)}</div>
                  )}
                </WalletCard>

                {/* 4 — Last Deduction */}
                <WalletCard icon={TrendingDown} label={t('Last Deduction','آخر خصم')}
                  value={wallet.last_deduct ? fmtAmt(wallet.last_deduct.amount, wallet.last_deduct.currency) : '—'}
                  accent="#EF4444">
                  {wallet.last_deduct && (
                    <div className="text-[11px] text-gray-400 dark:text-gray-600">{fmtDate(wallet.last_deduct.created_at)}</div>
                  )}
                </WalletCard>
              </div>
            )
          })()}

          {/* Top-up form */}
          {showTopUp && (
            <div className="mt-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              {topUpSent ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
                    <Check size={22} className="text-emerald-500"/>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{t('Request Submitted!','تم إرسال الطلب!')}</p>
                  <p className="text-xs text-gray-400">{t('Admin will confirm and credit your wallet shortly.','سيقوم الأدمن بتأكيد الطلب وإضافة الرصيد قريباً.')}</p>
                </div>
              ) : easykashWaiting ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-3">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"/>
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">{t('Waiting for payment...','في انتظار الدفع...')}</p>
                  <p className="text-xs text-gray-400 mb-4">{t('Complete payment in the new tab. This page updates automatically.','أتمم الدفع في التبويب الجديد. ستتحدث هذه الصفحة تلقائياً.')}</p>
                  <button onClick={()=>{ if(pollingRef.current)clearInterval(pollingRef.current); setEasykashWaiting(false) }}
                    className="text-xs text-gray-400 underline">{t('Cancel','إلغاء')}</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Charge Wallet','شحن المحفظة')}</h3>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">{t('Amount','المبلغ')} *</label>
                      <input type="number" value={topUpAmt} onChange={e=>setTopUpAmt(e.target.value)} placeholder="0"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-[#22c55e] text-gray-900 dark:text-gray-100"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">{t('Currency','العملة')}</label>
                      <select value={topUpCur} onChange={e=>setTopUpCur(e.target.value)}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none text-gray-900 dark:text-gray-100">
                        <option value="EGP">EGP</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>

                  {/* Gateway cards — bigger grid */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 block mb-2">{t('Payment Method','طريقة الدفع')} *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {gateways.map(gw=>(
                        <button key={gw.id} onClick={()=>setTopUpGw(gw.id)}
                          className="relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center"
                          style={topUpGw===gw.id
                            ? {borderColor:'#22c55e', background:'#22c55e08'}
                            : {borderColor:'#E5E7EB',background:'transparent'}}>
                          {topUpGw===gw.id && (
                            <div className="absolute top-2 end-2 w-4 h-4 rounded-full flex items-center justify-center" style={{background:'#22c55e'}}>
                              <Check size={9} className="text-white"/>
                            </div>
                          )}
                          {gw.logo_url
                            ? <img src={gw.logo_url} alt={gw.name_en} className="h-8 w-auto object-contain"/>
                            : <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800"/>
                          }
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{lang==='ar'?gw.name_ar:gw.name_en}</span>
                          <span className="text-[10px] text-gray-400">{gw.currency}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected gateway info — QR left, details+TxID right */}
                  {activeGw && (
                    <div className="p-4 rounded-xl border" style={{background:'#22c55e08',borderColor:'#22c55e30'}}>
                      <div className="flex items-start gap-4">
                        {/* QR first in DOM → left LTR / right RTL */}
                        {activeGw.qr_url && (
                          <img src={activeGw.qr_url} alt="QR Code"
                            className="w-40 h-40 flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 object-contain bg-white p-1"/>
                        )}
                        <div className="flex-1 space-y-3 min-w-0">
                          {/* UID with one-click copy */}
                          {activeGw.uid && (
                            <div className="text-xs">
                              <div className="text-gray-500 mb-1">
                                {lang==='ar'?(activeGw.uid_label_ar||activeGw.uid_label_en||'أرسل إلى'):(activeGw.uid_label_en||'Send to')}
                              </div>
                              <button onClick={()=>copyUid(activeGw.uid!)}
                                className="flex items-center gap-2 group w-full text-start">
                                <span className="font-mono font-black text-gray-900 dark:text-gray-100 text-sm tracking-wide break-all" dir="ltr">
                                  {activeGw.uid}
                                </span>
                                <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                                  style={{background: copiedUid ? '#22c55e20' : '#00000008'}}>
                                  {copiedUid
                                    ? <Check size={11} className="text-emerald-500"/>
                                    : <Copy size={11} className="text-gray-400 group-hover:text-gray-600"/>}
                                </span>
                              </button>
                            </div>
                          )}
                          {/* Instructions */}
                          {(lang==='ar'?activeGw.instructions_ar:activeGw.instructions_en) && (
                            <div className="text-xs text-gray-400 leading-relaxed">
                              {lang==='ar'?activeGw.instructions_ar:activeGw.instructions_en}
                            </div>
                          )}
                          {/* Dynamic (EasyKash): Pay Now */}
                          {activeGw.is_dynamic ? (
                            <div className="space-y-2">
                              {easykashError && (
                                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                                  {easykashError}
                                </div>
                              )}
                              <button onClick={handleEasykash} disabled={submitting||!topUpAmt}
                                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                style={{background:'#22c55e',boxShadow:'0 4px 14px #22c55e33'}}>
                                {submitting
                                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                  : <><ArrowUpRight size={15}/> {t('Pay Now','ادفع الآن')}</>}
                              </button>
                            </div>
                          ) : (
                            /* Static: TxID + submit in the same right column, below instructions */
                            <div className="space-y-2 pt-2 border-t border-green-500/20">
                              <label className="text-[10px] font-bold uppercase text-gray-400 block">{t('Transaction ID / Reference','رقم العملية / المرجع')} *</label>
                              <input value={topUpTx} onChange={e=>setTopUpTx(e.target.value)} placeholder="TxID or reference..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-[#22c55e] text-gray-900 dark:text-gray-100"/>
                              <button onClick={submitTopUp} disabled={submitting||!topUpAmt||!topUpGw}
                                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                style={{background:'#22c55e'}}>
                                {submitting?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><ArrowUpRight size={15}/> {t('Submit Charge Request','إرسال طلب الشحن')}</>}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Payment History','سجل المدفوعات')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{payments.length} {t('transactions','عملية')}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{t('Show','عرض')}</span>
            <select value={perPage} onChange={e=>{ setPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-300 outline-none">
              {[5,10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
            <span>{t('rows','صف')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {cols.map(h=>(
                <th key={h} className="text-start text-xs font-semibold uppercase tracking-wide text-gray-400 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading&&(
              Array.from({length:5}).map((_,i)=>(
                <tr key={i} className="border-t border-gray-50 dark:border-gray-800">
                  {Array.from({length:7}).map((_,j)=>(
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full"/></td>
                  ))}
                </tr>
              ))
            )}
            {!loading&&payments.length===0&&<tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">{t('No payments yet','لا توجد مدفوعات بعد')}</td></tr>}
            {paginated.map(p=>{
              const st=statusStyle(p.status)
              const isWallet = p.row_type === 'wallet_tx'
              return (
                <tr key={p.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    {p.payment_code ? (
                      <span className="text-xs font-bold px-2 py-1 rounded-md tracking-wide"
                        style={isWallet
                          ? {background:'#22c55e15',color:'#22c55e',border:'1px solid #22c55e30'}
                          : {background:'#d9940115',color:'#d99401',border:'1px solid #d9940130'}}>
                        {p.payment_code}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200 max-w-[200px] truncate">
                    {p.tool_name
                      ? (p.tool_name.includes(' / ')
                          ? (lang === 'ar' ? p.tool_name.split(' / ')[0] : p.tool_name.split(' / ')[1])
                          : p.tool_name)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {isWallet ? fmtAmt(Number(p.amount), p.currency) : formatPrice(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.gateway||'—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit" style={{background:st.bg,color:st.color}}>
                      {statusIcon(p.status)}{statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {fmtDate(p.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {!isWallet && p.status==='completed' && (
                      <button
                        onClick={()=>downloadInvoice(p.id, p.payment_code)}
                        disabled={downloading===p.id}
                        title={t('Download Invoice','تحميل الفاتورة')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50"
                      >
                        {downloading===p.id
                          ? <div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin"/>
                          : <Download size={11}/>
                        }
                        {t('PDF','PDF')}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        {totalPages>1&&(
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400">
              {(page-1)*perPage+1}–{Math.min(page*perPage,payments.length)} {t('of','من')} {payments.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                {lang==='ar'?<ChevronRight size={14}/>:<ChevronLeft size={14}/>}
              </button>
              {Array.from({length:totalPages},(_,i)=>i+1)
                .filter(n=>n===1||n===totalPages||Math.abs(n-page)<=1)
                .reduce((acc:(number|string)[],n,i,arr)=>{
                  if(i>0&&(n as number)-(arr[i-1] as number)>1) acc.push('...')
                  acc.push(n); return acc
                },[])
                .map((n,i)=>n==='...'
                  ?<span key={`d${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                  :<button key={n} onClick={()=>setPage(n as number)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${page===n?'text-white':'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      style={page===n?{background:'#22c55e'}:{}}>
                      {n}
                    </button>
                )}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                {lang==='ar'?<ChevronLeft size={14}/>:<ChevronRight size={14}/>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
