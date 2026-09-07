'use client'
import { useEffect, useState, useCallback } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { Copy, Check, Share2, Users, Gift, Star, Zap, ArrowUp, Clock, Info, ChevronDown, ChevronUp, Ticket, Loader2 } from 'lucide-react'
import React from 'react'

// ─── Rank definitions (identical to profile page) ─────────────────────────────
const RANKS = [
  { key: 'regular',  ar: 'عادي',    en: 'Regular',  min: 0,      max: 1,        color: '#5a8098', light: '#b8d0e0', dark: '#1e3848', mid: '#4a7080', darkest: '#182e3c' },
  { key: 'bronze',   ar: 'برونزي',  en: 'Bronze',   min: 1,      max: 2000,     color: '#b06030', light: '#f0bc78', dark: '#8a4c20', mid: '#502408', darkest: '#321404' },
  { key: 'silver',   ar: 'فضي',     en: 'Silver',   min: 2000,   max: 8000,     color: '#8888a0', light: '#e4e4f0', dark: '#6e6e80', mid: '#383848', darkest: '#242432' },
  { key: 'gold',     ar: 'ذهبي',    en: 'Gold',     min: 8000,   max: 20000,    color: '#c89010', light: '#fff060', dark: '#906800', mid: '#503800', darkest: '#342000' },
  { key: 'platinum', ar: 'بلاتيني', en: 'Platinum', min: 20000,  max: 40000,    color: '#7898b8', light: '#dce8f8', dark: '#587898', mid: '#2c4460', darkest: '#1c2c48' },
  { key: 'emerald',  ar: 'زمردي',   en: 'Emerald',  min: 40000,  max: 60000,    color: '#18a050', light: '#78f0a0', dark: '#0c7838', mid: '#064820', darkest: '#042c14' },
  { key: 'diamond',  ar: 'ماسي',    en: 'Diamond',  min: 60000,  max: Infinity, color: '#3870b8', light: '#c0e0fc', dark: '#2050a0', mid: '#102868', darkest: '#0a1848' },
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

function HexBadge({ rk, size = 72, active = false }: { rk: typeof RANKS[number]; size?: number; active?: boolean }) {
  const c = BADGE_CFG[rk.key as keyof typeof BADGE_CFG]
  const gid = `hg2-${rk.key}`
  const icon: Record<RankKey, React.ReactNode> = {
    regular: <><circle cy={-5} r={5.5} fill="#5a8098"/><path d="M-8,11 Q-8,2 0,2 Q8,2 8,11" fill="#5a8098"/></>,
    bronze:  <><polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" fill="none" stroke="#c07820" strokeWidth="2.2" strokeLinejoin="round"/><circle r={3.5} fill="#c07820"/></>,
    silver:  <><polygon points="0,-10 8.5,-5 0,0 -8.5,-5" fill="#e8e8f4"/><polygon points="-8.5,-5 0,0 0,10 -8.5,5" fill="#808090"/><polygon points="8.5,-5 8.5,5 0,10 0,0" fill="#545462"/></>,
    gold:    <><polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#a06800"/><polygon points="0,0 0,-12 10.4,-6" fill="#f5d060"/><polygon points="0,0 10.4,-6 10.4,6" fill="#c88000"/><polygon points="0,0 10.4,6 0,12" fill="#b87000"/><polygon points="0,0 0,12 -10.4,6" fill="#7a4000"/><polygon points="0,0 -10.4,6 -10.4,-6" fill="#8c5000"/><polygon points="0,0 -10.4,-6 0,-12" fill="#d99401"/></>,
    platinum: <path fill="#4a78c8" d="M0,-15 3.6,-4.7 14.3,-4.7 6.1,1.7 9.0,12.4 0,6.4 -9.0,12.4 -6.1,1.7 -14.3,-4.7 -3.6,-4.7Z"/>,
    emerald: <><polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#14a848"/><polygon points="0,-12 10.4,-6 0,-4" fill="#a0ffc8"/><polygon points="0,-12 -10.4,-6 0,-4" fill="#70f0a0"/><polygon points="10.4,-6 10.4,6 0,0 0,-4" fill="#0a8030"/><polygon points="-10.4,-6 -10.4,6 0,0 0,-4" fill="#14a040"/><polygon points="10.4,6 0,12 -10.4,6 0,0" fill="#086028"/></>,
    diamond: <><polygon points="-9,-13 9,-13 15,-2 -15,-2" fill="#90c4f4"/><polygon points="-9,-13 0,-8 -15,-2" fill="#e0f4ff"/><polygon points="9,-13 15,-2 0,-8" fill="#cce8ff"/><polygon points="-9,-13 9,-13 0,-8" fill="#f4faff"/><polygon points="-15,-2 15,-2 0,14" fill="#4898e0"/><polygon points="-15,-2 0,-2 0,14" fill="#2870c0"/><polygon points="15,-2 0,14 0,-2" fill="#7ab8f0"/></>,
  }
  return (
    <svg width={size} height={size} viewBox="-42 -48 84 96"
      style={{filter: active ? `drop-shadow(0 0 8px ${rk.color}99)` : undefined}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={c.g0}/>
          <stop offset="50%"  stopColor={c.g1}/>
          <stop offset="100%" stopColor={c.g2}/>
        </linearGradient>
      </defs>
      <polygon points="20,-29 38,3 20,35 -20,35 -38,3 -20,-29" fill="#000" opacity="0.22" transform="translate(2,5)"/>
      <polygon points="18,-32 36,0 18,32 -18,32 -36,0 -18,-32" fill={`url(#${gid})`}/>
      <polygon points="-18,-32 18,-32 11,-20 -11,-20" fill={c.ft} opacity="0.92"/>
      <polygon points="18,-32 36,0 23,0 11,-20"       fill={c.fur} opacity="0.85"/>
      <polygon points="18,32 -18,32 -11,20 11,20"     fill={c.fb} opacity="0.88"/>
      <polygon points="-18,32 -36,0 -23,0 -11,20"     fill={c.fll} opacity="0.75"/>
      <circle r="23" fill="#fff"/>
      <circle r="17" fill={c.ib}/>
      {icon[rk.key as RankKey]}
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface RewardsData {
  balance: number; total_earned: number; total_redeemed: number
  redeemable_egp: number; expires_days: number | null; total_spent_egp: number
  transactions: { id:string; delta:number; type:string; label:string; label_ar:string; created_at:string }[]
  referral_code: string | null; total_referred: number; referral_points: number
  referred: { id:string; full_name:string; created_at:string }[]
}

// ─── Orders-style stat card ────────────────────────────────────────────────────
function StatCard({ icon:Icon, label, value, sub, accent }: { icon:any; label:string; value:string|number; sub?:string; accent:string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm flex-1">
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07] pointer-events-none"
        style={{background:`radial-gradient(circle at top right, ${accent}, transparent 65%)`}}/>
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
        style={{background:`linear-gradient(90deg, ${accent}, transparent)`}}/>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:`${accent}20`}}>
          <Icon size={13} style={{color:accent}}/>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 dark:text-gray-600">{sub}</div>}
    </div>
  )
}

// ─── Orders-style info card wrapper ───────────────────────────────────────────
function InfoCard({ accent = '#d99401', children, className = '', ...rest }: { accent?: string; children: React.ReactNode; className?: string; [k: string]: unknown }) {
  return (
    <div className={`rounded-xl relative overflow-hidden bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm ${className}`} {...(rest as React.HTMLAttributes<HTMLDivElement>)}>
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-50"
        style={{background:`linear-gradient(90deg, ${accent}, transparent)`}}/>
      {children}
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ tx, isRtl }: { tx: RewardsData['transactions'][0]; isRtl: boolean }) {
  const isEarn = tx.delta > 0
  const typeColor: Record<string, string> = {
    earn:'#22c55e', bonus:'#d99401', referral:'#8b5cf6', welcome:'#3b82f6',
    redeem:'#ef4444', expire:'#6b7280',
  }
  const color = typeColor[tx.type] || '#8890a0'
  const date = new Date(tx.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month:'short', day:'numeric' })
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{background:`${color}18`}}>
        {isEarn
          ? <ArrowUp size={12} style={{color}}/>
          : <ArrowUp size={12} style={{color, transform:'rotate(180deg)'}}/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">
          {isRtl ? (tx.label_ar || tx.label) : (tx.label || tx.label_ar)}
        </div>
        <div className="text-[10px] text-gray-400">{date}</div>
      </div>
      <div className="font-mono font-black text-sm flex-shrink-0" style={{color}}>
        {isEarn ? '+' : ''}{tx.delta.toLocaleString()}
        <span className="text-[9px] font-normal ms-0.5 opacity-60">{isRtl ? 'نقطة' : 'pts'}</span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RewardsPage() {
  const { lang, currency } = useLang()
  const settings = useSiteSettings()
  const isRtl = lang === 'ar'
  const [data,       setData]       = useState<RewardsData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [copied,     setCopied]     = useState(false)
  const [tab,        setTab]        = useState<'points' | 'referral'>('points')
  const [redeemOpen,    setRedeemOpen]    = useState(false)
  const [generating,    setGenerating]    = useState(false)
  const [generatedCode, setGeneratedCodeState] = useState<{ code: string; value_egp: number; expires_at: string } | null>(null)
  const [codeCopied,    setCodeCopied]    = useState(false)
  const [redeemError,   setRedeemError]   = useState('')

  const setGeneratedCode = (v: { code: string; value_egp: number; expires_at: string } | null) => {
    setGeneratedCodeState(v)
    try {
      if (v) localStorage.setItem('pk_reward_coupon', JSON.stringify(v))
      else localStorage.removeItem('pk_reward_coupon')
    } catch {}
  }

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/member/rewards')
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pk_reward_coupon')
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (new Date(parsed.expires_at) > new Date()) {
        setGeneratedCodeState(parsed)
        setRedeemOpen(true)
      } else {
        localStorage.removeItem('pk_reward_coupon')
      }
    } catch {}
  }, [])

  const spent    = data?.total_spent_egp ?? 0
  const rank     = getRank(spent)
  const rankIdx  = RANKS.findIndex(r => r.key === rank.key)
  const nextRank = RANKS[rankIdx + 1] ?? null
  const progress = nextRank
    ? Math.min(100, ((spent - rank.min) / (nextRank.min - rank.min)) * 100)
    : 100

  const fmtAmt = (egp: number) => currency === 'usd'
    ? `${(egp / 50).toLocaleString(undefined, { maximumFractionDigits: 1 })} USD`
    : `${egp.toLocaleString()} ${isRtl ? 'جنيه' : 'EGP'}`

  const referralLink = typeof window !== 'undefined' && data?.referral_code
    ? `${window.location.origin}/u/login?ref=${data.referral_code}`
    : ''

  const copy = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = () => {
    if (navigator.share && referralLink) {
      navigator.share({
        title: 'Pro Keys',
        text: isRtl
          ? `سجّل معي في Pro Keys وابدأ من 200 نقطة هدية!\nكودك: ${data?.referral_code}`
          : `Join me on Pro Keys and get 200 bonus points!\nCode: ${data?.referral_code}`,
        url: referralLink,
      })
    } else { copy() }
  }

  const redeemEgp = data?.redeemable_egp ?? 0

  const generateCoupon = async () => {
    setGenerating(true)
    setRedeemError('')
    try {
      const r = await fetch('/api/member/rewards/redeem', { method: 'POST' })
      const json = await r.json()
      if (!r.ok) {
        setRedeemError(json?.error === 'insufficient_points'
          ? (isRtl ? 'رصيدك أقل من 100 نقطة' : 'Balance below 100 points')
          : (json?.error || (isRtl ? 'حدث خطأ، حاول مجدداً' : 'Error, please try again')))
      } else {
        setGeneratedCode(json)
        load() // refresh balance
      }
    } catch (err) {
      console.error('redeem fetch error:', err)
      setRedeemError(isRtl ? 'حدث خطأ، حاول مجدداً' : 'Error, please try again')
    } finally {
      setGenerating(false)
    }
  }

  const copyCode = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode.code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{borderColor:'#d99401', borderTopColor:'transparent'}}/>
    </div>
  )

  return (
    <>
      {/* Cairo font for Arabic */}
      {isRtl && (
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap'); [dir=rtl]{font-family:'Cairo',sans-serif!important}`}</style>
      )}

      <div className="p-4 md:p-5 flex flex-col gap-4" dir={isRtl ? 'rtl' : 'ltr'}>

        {/* ── RANK BANNER — same as profile page ───────────────────────── */}
        <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm rounded-2xl overflow-hidden flex-shrink-0">
          <div className="px-4 md:px-6 py-4 md:py-6"
            style={{background:`linear-gradient(135deg, ${rank.darkest}ee 0%, #0d111a 100%)`}}>
            <div className="flex flex-col md:grid md:grid-cols-[auto_1fr_auto] md:items-center gap-4 md:gap-6">
              <HexBadge rk={rank} size={72} active/>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 mb-0.5">{isRtl ? 'رتبتك الحالية' : 'Your rank'}</p>
                <p className="text-xl font-bold mb-1" style={{color: rank.light}}>{isRtl ? rank.ar : rank.en}</p>
                <p className="text-sm mb-3" style={{color: rank.color}}>
                  {isRtl ? 'إجمالي الإنفاق' : 'Total spent'}: <span className="font-bold">{fmtAmt(spent)}</span>
                </p>
                {nextRank ? (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-400">
                        {isRtl ? 'التالية' : 'Next'}: <span className="font-semibold" style={{color: nextRank.color}}>{isRtl ? nextRank.ar : nextRank.en}</span>
                      </span>
                      <span className="text-xs text-gray-500">{fmtAmt(nextRank.min - spent)} {isRtl ? 'متبقي' : 'remaining'}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden w-full" style={{background:'rgba(255,255,255,0.08)'}}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{width:`${progress}%`, background:`linear-gradient(90deg, ${rank.color}, ${nextRank.color})`}}/>
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-bold" style={{color: rank.color}}>🏆 {isRtl ? 'وصلت للرتبة الأعلى!' : 'Maximum rank achieved!'}</p>
                )}
              </div>
              {/* All ranks */}
              <div className="flex flex-col items-start md:items-center gap-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{isRtl ? 'كل الرتب' : 'All ranks'}</p>
                <div className="overflow-x-auto pb-1 w-full md:w-auto" style={{scrollbarWidth:'none'}}>
                  <div className="flex items-end gap-3 min-w-max">
                    {RANKS.map((r, i) => {
                      const isActive = r.key === rank.key
                      const unlocked = i <= rankIdx
                      return (
                        <div key={r.key} className="flex flex-col items-center gap-1.5">
                          <div style={{opacity: unlocked ? 1 : 0.28, transform: isActive ? 'scale(1.2)' : 'scale(1)', transition:'transform .2s'}}>
                            <HexBadge rk={r} size={isActive ? 60 : 46} active={isActive}/>
                          </div>
                          <span className="text-[9px] font-bold" style={{color: isActive ? r.light : unlocked ? r.color : '#6b7280'}}>
                            {isRtl ? r.ar : r.en}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Points balance + redeem CTA ───────────────────────────────── */}
        <div className="rounded-xl relative overflow-hidden bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm p-4 flex items-center justify-between gap-4" data-reveal>
          <div className="absolute top-0 left-0 right-0 h-[2px] opacity-50"
            style={{background:'linear-gradient(90deg, #d99401, transparent)'}}/>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
              {isRtl ? 'رصيد النقاط' : 'Points Balance'}
            </div>
            <div className="font-mono font-bold text-3xl tabular-nums text-gray-900 dark:text-gray-100">
              {(data?.balance ?? 0).toLocaleString()}
              <span className="text-sm font-normal text-gray-400 ms-1">{isRtl ? 'نقطة' : 'pts'}</span>
            </div>
          </div>
          {redeemEgp > 0 && (
            <button onClick={() => setRedeemOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0"
              style={{background:'#d99401', color:'#000'}}>
              {isRtl ? `استبدل ${fmtAmt(redeemEgp)}` : `Redeem ${fmtAmt(redeemEgp)}`}
              {redeemOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          )}
        </div>

        {/* ── Coupon Generator Panel ────────────────────────────────────── */}
        {redeemOpen && (redeemEgp > 0 || generatedCode) && (
          <InfoCard accent="#d99401" className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Ticket size={16} style={{color:'#d99401'}}/>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {isRtl ? 'توليد كوبون خصم' : 'Generate Discount Coupon'}
              </div>
            </div>

            {!generatedCode ? (
              <>
                {/* Info */}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 mb-4 text-xs text-amber-800 dark:text-amber-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold mb-1"><Info size={11}/>{isRtl ? 'تفاصيل الكوبون' : 'Coupon Details'}</div>
                  {(isRtl ? [
                    `القيمة: ${fmtAmt(redeemEgp)} خصم (${Math.floor((data?.balance ?? 0) / 100) * 100} نقطة)`,
                    `صالح لمدة 7 أيام من الآن`,
                    `استخدام مرة واحدة فقط على أي اشتراك`,
                    `الحد الأدنى للفاتورة: ${fmtAmt(300)}`,
                  ] : [
                    `Value: ${fmtAmt(redeemEgp)} off (${Math.floor((data?.balance ?? 0) / 100) * 100} points)`,
                    `Valid for 7 days from now`,
                    `Single-use on any subscription`,
                    `Minimum order: ${fmtAmt(300)}`,
                  ]).map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5"><span style={{color:'#d99401'}}>•</span>{c}</div>
                  ))}
                </div>
                {redeemError && (
                  <div className="text-xs text-red-500 mb-3 text-center">{redeemError}</div>
                )}
                <button
                  onClick={generateCoupon}
                  disabled={generating}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                  style={{background:'#d99401', color:'#000'}}>
                  {generating
                    ? <><Loader2 size={15} className="animate-spin"/>{isRtl ? 'جاري التوليد...' : 'Generating...'}</>
                    : <><Ticket size={15}/>{isRtl ? `احصل على كوبون ${fmtAmt(redeemEgp)}` : `Get ${fmtAmt(redeemEgp)} Coupon`}</>
                  }
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="text-xs text-gray-400 mb-2">{isRtl ? 'كوبونك الخاص' : 'Your Coupon Code'}</div>
                  <div className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed"
                    style={{borderColor:'rgba(217,148,1,0.5)', background:'rgba(217,148,1,0.05)'}}>
                    <span className="font-mono font-black text-2xl tracking-widest text-gray-900 dark:text-gray-100">
                      {generatedCode.code}
                    </span>
                    <button onClick={copyCode}
                      className="p-2 rounded-lg transition-colors"
                      style={{background: codeCopied ? '#22c55e22' : 'rgba(217,148,1,0.12)'}}>
                      {codeCopied
                        ? <Check size={16} style={{color:'#22c55e'}}/>
                        : <Copy size={16} style={{color:'#d99401'}}/>
                      }
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-center text-gray-500 dark:text-gray-400">
                  <div>
                    {isRtl
                      ? `قيمة الخصم: ${currency === 'usd' ? `${(generatedCode.value_egp / 50).toFixed(1)} USD` : `${generatedCode.value_egp} جنيه`}`
                      : `Discount: ${currency === 'usd' ? `${(generatedCode.value_egp / 50).toFixed(1)} USD` : `${generatedCode.value_egp} EGP`}`
                    }
                  </div>
                  <div>
                    {isRtl ? 'ينتهي:' : 'Expires:'} {new Date(generatedCode.expires_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB')}
                  </div>
                  <div className="text-amber-500 font-semibold pt-1">
                    {isRtl ? 'استخدم الكود عند الدفع في المتجر' : 'Apply this code at checkout in the store'}
                  </div>
                </div>
                <button onClick={() => setGeneratedCode(null)}
                  className="mt-4 w-full py-2 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  {isRtl ? 'إخفاء / توليد كوبون جديد' : 'Hide / Generate new coupon'}
                </button>
              </>
            )}
          </InfoCard>
        )}

        {/* ── TABS ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-[#1a2233]" data-reveal>
          {[
            { key:'points',   ar:'النقاط والولاء',  en:'Points & Loyalty' },
            { key:'referral', ar:'برنامج الإحالة',   en:'Referral Program' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: tab === t.key ? '#d99401' : 'transparent',
                color:      tab === t.key ? '#000' : '#9ca3af',
              }}>
              {isRtl ? t.ar : t.en}
            </button>
          ))}
        </div>

        {/* ══ POINTS TAB ══════════════════════════════════════════════════ */}
        {tab === 'points' && (
          <div className="flex flex-col gap-4">
            {/* Stat cards — orders style */}
            <div className="flex gap-3" data-reveal-stagger>
              <StatCard icon={Zap}   accent="#22c55e" label={isRtl ? 'مكتسب' : 'Earned'}     value={(data?.total_earned ?? 0).toLocaleString()} sub={isRtl ? 'إجمالي' : 'lifetime'}/>
              <StatCard icon={Star}  accent="#8b5cf6" label={isRtl ? 'مستبدل' : 'Redeemed'}   value={(data?.total_redeemed ?? 0).toLocaleString()} sub={isRtl ? 'نقطة' : 'points'}/>
              <StatCard icon={Clock} accent="#ef4444" label={isRtl ? 'ينتهي خلال' : 'Expires'} value={data?.expires_days != null ? `${data.expires_days}` : '—'} sub={isRtl ? 'يوم' : 'days'}/>
            </div>

            {/* How to earn */}
            <InfoCard accent="#d99401" className="p-5" data-reveal>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
                {isRtl ? 'كيف تكسب النقاط' : 'How to Earn'}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon:'🛒', ar: currency==='usd' ? '1 USD = 50 نقطة' : 'كل 1 جنيه = 1 نقطة',            en: currency==='usd' ? '1 USD = 50 points' : '1 EGP = 1 point',           sub_ar:'على أي اشتراك',           sub_en:'on any order' },
                  { icon:'⚡', ar:`من ${fmtAmt(500)} → +100 نقطة`,  en:`From ${fmtAmt(500)} → +100 pts`,   sub_ar:`أقل من ${fmtAmt(1500)}`,   sub_en:`under ${fmtAmt(1500)}` },
                  { icon:'💎', ar:`من ${fmtAmt(1500)} → +300 نقطة`, en:`From ${fmtAmt(1500)} → +300 pts`,  sub_ar:'بونص الطلب الكبير',         sub_en:'big order bonus' },
                  { icon:'🎁', ar:'أول اشتراك → +200 نقطة',         en:'First order → +200 pts',            sub_ar:'مكافأة ترحيب',              sub_en:'welcome gift' },
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8">
                    <span className="text-base leading-none flex-shrink-0">{rule.icon}</span>
                    <div>
                      <div className="text-[11px] font-bold leading-tight text-gray-800 dark:text-gray-200">{isRtl ? rule.ar : rule.en}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{isRtl ? rule.sub_ar : rule.sub_en}</div>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>

            {/* Redemption rules */}
            <InfoCard accent="#8b5cf6" className="p-5" data-reveal>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                {isRtl ? 'قواعد الاستبدال' : 'Redemption Rules'}
              </div>
              <div className="space-y-2">
                {[
                  { ar:`100 نقطة = ${fmtAmt(5)} خصم على أي طلب`,      en:`100 pts = ${fmtAmt(5)} discount on any order` },
                  { ar:`الحد الأدنى للفاتورة: ${fmtAmt(300)}`,         en:`Minimum order to redeem: ${fmtAmt(300)}` },
                  { ar:'حد أقصى للاستخدام: 15% من قيمة الفاتورة',     en:'Max per order: 15% of bill value' },
                  { ar:'النقاط تنتهي بعد 4 أشهر من آخر شراء',        en:'Points expire 4 months after last purchase' },
                ].map((rule, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{background:'#8b5cf6'}}/>
                    {isRtl ? rule.ar : rule.en}
                  </div>
                ))}
              </div>
              {redeemEgp > 0 && (
                <button onClick={() => { setRedeemOpen(true); window.scrollTo({top:0, behavior:'smooth'}) }}
                  className="mt-4 w-full py-2.5 rounded-lg text-sm font-bold border transition-colors"
                  style={{borderColor:'#8b5cf6', color:'#8b5cf6', background:'rgba(139,92,246,0.06)'}}>
                  {isRtl ? `لديك ${fmtAmt(redeemEgp)} جاهزة للاستبدال ←` : `You have ${fmtAmt(redeemEgp)} ready to redeem →`}
                </button>
              )}
            </InfoCard>

            {/* Transactions */}
            {(data?.transactions ?? []).length > 0 && (
              <InfoCard accent="#d99401" data-reveal>
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/60">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {isRtl ? 'آخر المعاملات' : 'Recent Activity'}
                  </span>
                </div>
                <div className="px-5">
                  {data!.transactions.map(tx => <TxRow key={tx.id} tx={tx} isRtl={isRtl}/>)}
                </div>
              </InfoCard>
            )}
            {(data?.transactions ?? []).length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">
                {isRtl ? 'لا توجد معاملات بعد — ابدأ بأول اشتراك!' : 'No activity yet — make your first order!'}
              </div>
            )}
          </div>
        )}

        {/* ══ REFERRAL TAB ════════════════════════════════════════════════ */}
        {tab === 'referral' && (
          <div className="flex flex-col gap-4">
            {/* Stats */}
            <div className="flex gap-3" data-reveal-stagger>
              <StatCard icon={Users} accent="#3b82f6" label={isRtl ? 'أصدقاء مُحالون' : 'Referred'}    value={data?.total_referred ?? 0}/>
              <StatCard icon={Gift}  accent="#8b5cf6" label={isRtl ? 'نقاط إحالة' : 'Ref. Points'}     value={(data?.referral_points ?? 0).toLocaleString()} sub={isRtl ? 'نقطة' : 'pts'}/>
              <StatCard icon={Star}  accent="#d99401" label={isRtl ? 'مكافأة/إحالة' : 'Per Referral'} value="500" sub={isRtl ? 'نقطة' : 'pts'}/>
            </div>

            {/* Coupon card */}
            <div className="rounded-xl relative overflow-hidden bg-white dark:bg-[#111827] border-2 border-dashed shadow-sm p-6" data-reveal
              style={{borderColor:'rgba(217,148,1,0.4)'}}>
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-50"
                style={{background:'linear-gradient(90deg, #d99401, transparent)'}}/>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                {isRtl ? 'كود الإحالة الخاص بك' : 'Your Referral Code'}
              </div>
              <div className="font-mono font-black tracking-[0.3em] text-3xl mb-3 text-gray-900 dark:text-gray-100" style={{color:'#d99401'}}>
                {data?.referral_code ?? '——'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                {isRtl
                  ? 'شارك الكود مع أصدقائك — كل صديق يسجّل ويشتري، إنت تكسب 500 نقطة وهو يبدأ بـ 200 نقطة هدية'
                  : 'Share your code — for every friend who registers and purchases, you earn 500 points and they start with 200 bonus points'}
              </div>
              <div className="flex gap-2">
                <button onClick={copy}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center"
                  style={{background: copied ? '#22c55e' : '#d99401', color:'#000'}}>
                  {copied ? <Check size={14}/> : <Copy size={14}/>}
                  {copied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الكود' : 'Copy Code')}
                </button>
                <button onClick={share}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <Share2 size={14} style={{color:'#d99401'}}/>
                  {isRtl ? 'مشاركة' : 'Share'}
                </button>
              </div>
            </div>

            {/* How it works */}
            <InfoCard accent="#3b82f6" className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
                {isRtl ? 'كيف تشتغل؟' : 'How it works'}
              </div>
              <div className="space-y-3">
                {[
                  { step:'01', ar:'شارك كودك مع صديق',             en:'Share your code with a friend' },
                  { step:'02', ar:'يسجّل حساب برابطك أو كودك',      en:'They sign up using your link/code' },
                  { step:'03', ar:'بيعمل أول عملية شراء',          en:'They make their first purchase' },
                  { step:'04', ar:'إنت تكسب 500 نقطة تلقائياً 🎉', en:'You earn 500 points automatically 🎉' },
                ].map(s => (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                      style={{background:'rgba(59,130,246,0.10)', color:'#3b82f6'}}>{s.step}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{isRtl ? s.ar : s.en}</div>
                  </div>
                ))}
              </div>
            </InfoCard>

            {/* Referred friends */}
            {(data?.referred ?? []).length > 0 && (
              <InfoCard accent="#8b5cf6">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/60">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {isRtl ? 'الأصدقاء المسجّلون' : 'Referred Friends'}
                  </span>
                </div>
                {data!.referred.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{background:'rgba(217,148,1,0.12)', color:'#d99401'}}>
                      {m.full_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{m.full_name}</div>
                      <div className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</div>
                    </div>
                    <div className="text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{background:'rgba(139,92,246,0.12)', color:'#8b5cf6'}}>
                      +500 {isRtl ? 'نقطة' : 'pts'}
                    </div>
                  </div>
                ))}
              </InfoCard>
            )}
            {(data?.referred ?? []).length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">
                {isRtl ? 'شارك كودك وابدأ في كسب النقاط!' : 'Share your code and start earning!'}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
