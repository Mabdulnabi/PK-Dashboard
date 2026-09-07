'use client'
import { useEffect, useState, useCallback } from 'react'
import { useLang } from '@/lib/lang-context'
import { Copy, Check, Share2, Users, Gift, Star, Zap, ArrowUp, Clock } from 'lucide-react'
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
  const gid = `hg-${rk.key}`

  const icon: Record<RankKey, React.ReactNode> = {
    regular: <>
      <circle cy={-5} r={5.5} fill="#5a8098"/>
      <path d="M-8,11 Q-8,2 0,2 Q8,2 8,11" fill="#5a8098"/>
    </>,
    bronze: <>
      <polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" fill="none" stroke="#c07820" strokeWidth="2.2" strokeLinejoin="round"/>
      <circle r={3.5} fill="#c07820"/>
    </>,
    silver: <>
      <polygon points="0,-10 8.5,-5 0,0 -8.5,-5"  fill="#e8e8f4"/>
      <polygon points="-8.5,-5 0,0 0,10 -8.5,5"   fill="#808090"/>
      <polygon points="8.5,-5 8.5,5 0,10 0,0"     fill="#545462"/>
    </>,
    gold: <>
      <polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#a06800"/>
      <polygon points="0,0 0,-12 10.4,-6"     fill="#f5d060"/>
      <polygon points="0,0 10.4,-6 10.4,6"    fill="#c88000"/>
      <polygon points="0,0 10.4,6 0,12"       fill="#b87000"/>
      <polygon points="0,0 0,12 -10.4,6"      fill="#7a4000"/>
      <polygon points="0,0 -10.4,6 -10.4,-6"  fill="#8c5000"/>
      <polygon points="0,0 -10.4,-6 0,-12"    fill="#d99401"/>
    </>,
    platinum: <path fill="#4a78c8" d="M0,-15 3.6,-4.7 14.3,-4.7 6.1,1.7 9.0,12.4 0,6.4 -9.0,12.4 -6.1,1.7 -14.3,-4.7 -3.6,-4.7Z"/>,
    emerald: <>
      <polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#14a848"/>
      <polygon points="0,-12 10.4,-6 0,-4"     fill="#a0ffc8"/>
      <polygon points="0,-12 -10.4,-6 0,-4"    fill="#70f0a0"/>
      <polygon points="10.4,-6 10.4,6 0,0 0,-4" fill="#0a8030"/>
      <polygon points="-10.4,-6 -10.4,6 0,0 0,-4" fill="#14a040"/>
      <polygon points="10.4,6 0,12 -10.4,6 0,0" fill="#086028"/>
    </>,
    diamond: <>
      <polygon points="-9,-13 9,-13 15,-2 -15,-2" fill="#90c4f4"/>
      <polygon points="-9,-13 0,-8 -15,-2" fill="#e0f4ff"/>
      <polygon points="9,-13 15,-2 0,-8"   fill="#cce8ff"/>
      <polygon points="-9,-13 9,-13 0,-8"  fill="#f4faff"/>
      <polygon points="-15,-2 15,-2 0,14"  fill="#4898e0"/>
      <polygon points="-15,-2 0,-2 0,14"   fill="#2870c0"/>
      <polygon points="15,-2 0,14 0,-2"    fill="#7ab8f0"/>
    </>,
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

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ icon:Icon, label, value, sub, color = '#d99401' }:
  { icon:any; label:string; value:string; sub?:string; color?:string }) {
  return (
    <div className="flex-1 glass-card-themed rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:`${color}18`}}>
          <Icon size={12} style={{color}}/>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-black font-mono tabular-nums" style={{color}}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────
function TxRow({ tx, isRtl }: { tx: RewardsData['transactions'][0]; isRtl: boolean }) {
  const isEarn = tx.delta > 0
  const typeColor: Record<string, string> = {
    earn: '#22c55e', bonus: '#d99401', referral: '#8b5cf6', welcome: '#3b82f6',
    redeem: '#ef4444', expire: '#6b7280',
  }
  const color = typeColor[tx.type] || '#8890a0'
  const date  = new Date(tx.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month:'short', day:'numeric' })
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
export default function LoyaltyPage() {
  const { lang, currency } = useLang()
  const isRtl = lang === 'ar'
  const [data,    setData]    = useState<RewardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)
  const [tab,     setTab]     = useState<'points' | 'referral'>('points')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/member/rewards')
      if (r.ok) setData(await r.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{borderColor:'#d99401', borderTopColor:'transparent'}}/>
    </div>
  )

  return (
    <div className="p-4 md:p-5 flex flex-col gap-4" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── RANK BANNER — same as profile page ──────────────────────────── */}
      <div className="glass-card-themed rounded-2xl overflow-hidden flex-shrink-0" data-reveal>
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

      {/* ── Points balance summary ─────────────────────────────────────────── */}
      <div className="glass-card-themed rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            {isRtl ? 'رصيد النقاط' : 'Points Balance'}
          </div>
          <div className="font-mono font-black text-3xl tabular-nums" style={{color:'#d99401'}}>
            {(data?.balance ?? 0).toLocaleString()}
            <span className="text-sm font-normal text-gray-400 ms-1">{isRtl ? 'نقطة' : 'pts'}</span>
          </div>
        </div>
        {(data?.redeemable_egp ?? 0) > 0 && (
          <div className="text-center px-4 py-2 rounded-2xl"
            style={{background:'rgba(217,148,1,0.08)', border:'1px solid rgba(217,148,1,0.2)'}}>
            <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">
              {isRtl ? 'قابل للاستبدال' : 'Redeemable'}
            </div>
            <div className="text-xl font-black" style={{color:'#d99401'}}>{data!.redeemable_egp} {isRtl ? 'ج' : 'EGP'}</div>
          </div>
        )}
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl glass-card-themed">
        {[
          { key:'points',   ar:'النقاط والولاء',  en:'Points & Loyalty' },
          { key:'referral', ar:'برنامج الإحالة',   en:'Referral Program' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: tab === t.key ? '#d99401' : 'transparent',
              color:      tab === t.key ? '#000' : 'var(--muted-fg, #8890a0)',
            }}>
            {isRtl ? t.ar : t.en}
          </button>
        ))}
      </div>

      {/* ══ POINTS TAB ════════════════════════════════════════════════════════ */}
      {tab === 'points' && (
        <div className="flex flex-col gap-4">
          {/* Stats row */}
          <div className="flex gap-3">
            <StatPill icon={Zap}   label={isRtl ? 'مكتسب' : 'Earned'}     value={(data?.total_earned ?? 0).toLocaleString()} sub={isRtl ? 'إجمالي' : 'lifetime'} color="#22c55e"/>
            <StatPill icon={Star}  label={isRtl ? 'مستبدل' : 'Redeemed'}   value={(data?.total_redeemed ?? 0).toLocaleString()} sub={isRtl ? 'نقطة' : 'points'} color="#8b5cf6"/>
            <StatPill icon={Clock} label={isRtl ? 'ينتهي خلال' : 'Expires'} value={data?.expires_days != null ? `${data.expires_days}` : '—'} sub={isRtl ? 'يوم' : 'days'} color={data?.expires_days != null && data.expires_days < 30 ? '#ef4444' : '#8890a0'}/>
          </div>

          {/* How to earn */}
          <div className="glass-card-themed rounded-2xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
              {isRtl ? 'كيف تكسب النقاط' : 'How to Earn'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon:'🛒', ar:'كل 1 جنيه = 1 نقطة',         en:'1 EGP = 1 point',           sub_ar:'على أي اشتراك',    sub_en:'on any order' },
                { icon:'⚡', ar:'طلب 500–1499 ج → +100 نقطة', en:'Order 500–1499 → +100 pts', sub_ar:'بونص إضافي',       sub_en:'extra bonus' },
                { icon:'💎', ar:'طلب 1500+ ج → +300 نقطة',   en:'Order 1500+ → +300 pts',    sub_ar:'بونص الكبار',      sub_en:'big order bonus' },
                { icon:'🎁', ar:'أول اشتراك → +200 نقطة',    en:'First order → +200 pts',    sub_ar:'مكافأة ترحيب',     sub_en:'welcome gift' },
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{background:'rgba(217,148,1,0.05)', border:'1px solid rgba(217,148,1,0.12)'}}>
                  <span className="text-lg leading-none flex-shrink-0">{rule.icon}</span>
                  <div>
                    <div className="text-[11px] font-bold leading-tight">{isRtl ? rule.ar : rule.en}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">{isRtl ? rule.sub_ar : rule.sub_en}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Redeem rules */}
          <div className="glass-card-themed rounded-2xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              {isRtl ? 'قواعد الاستبدال' : 'Redemption Rules'}
            </div>
            <div className="space-y-2">
              {[
                { ar:'100 نقطة = 5 جنيه خصم (5% استرداد)',         en:'100 pts = 5 EGP discount (5% back)' },
                { ar:'الحد الأدنى للفاتورة: 300 جنيه',              en:'Minimum order to redeem: 300 EGP' },
                { ar:'حد أقصى للاستخدام: 15% من قيمة الفاتورة',     en:'Max per order: 15% of bill value' },
                { ar:'النقاط تنتهي بعد 4 أشهر من آخر شراء',        en:'Points expire 4 months after last purchase' },
              ].map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{background:'#d99401'}}/>
                  {isRtl ? rule.ar : rule.en}
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          {(data?.transactions ?? []).length > 0 && (
            <div className="glass-card-themed rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/60">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {isRtl ? 'آخر المعاملات' : 'Recent Activity'}
                </span>
              </div>
              <div className="px-5">
                {data!.transactions.map(tx => <TxRow key={tx.id} tx={tx} isRtl={isRtl}/>)}
              </div>
            </div>
          )}
          {(data?.transactions ?? []).length === 0 && (
            <div className="text-center py-10 text-sm text-gray-400">
              {isRtl ? 'لا توجد معاملات بعد — ابدأ بأول اشتراك!' : 'No activity yet — make your first order!'}
            </div>
          )}
        </div>
      )}

      {/* ══ REFERRAL TAB ══════════════════════════════════════════════════════ */}
      {tab === 'referral' && (
        <div className="flex flex-col gap-4">
          {/* Stats */}
          <div className="flex gap-3">
            <StatPill icon={Users} label={isRtl ? 'أصدقاء مُحالون' : 'Referred'}    value={String(data?.total_referred ?? 0)} color="#3b82f6"/>
            <StatPill icon={Gift}  label={isRtl ? 'نقاط إحالة' : 'Ref. Points'}     value={(data?.referral_points ?? 0).toLocaleString()} sub={isRtl ? 'نقطة' : 'pts'} color="#8b5cf6"/>
            <StatPill icon={Star}  label={isRtl ? 'مكافأة/إحالة' : 'Per Referral'} value="500" sub={isRtl ? 'نقطة' : 'pts'} color="#d99401"/>
          </div>

          {/* Coupon card */}
          <div className="glass-card-themed rounded-3xl p-6 relative overflow-hidden"
            style={{border:'2px dashed rgba(217,148,1,0.35)'}}>
            <div className="absolute top-1/2 -translate-y-1/2 -start-4 w-8 h-8 rounded-full bg-white dark:bg-gray-900"/>
            <div className="absolute top-1/2 -translate-y-1/2 -end-4 w-8 h-8 rounded-full bg-white dark:bg-gray-900"/>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              {isRtl ? 'كود الإحالة الخاص بك' : 'Your Referral Code'}
            </div>
            <div className="font-mono font-black tracking-[0.3em] text-3xl mb-4" style={{color:'#d99401'}}>
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold glass-card-themed">
                <Share2 size={14} style={{color:'#d99401'}}/>
                {isRtl ? 'مشاركة' : 'Share'}
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="glass-card-themed rounded-2xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
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
                    style={{background:'rgba(217,148,1,0.12)', color:'#d99401'}}>{s.step}</div>
                  <div className="text-sm">{isRtl ? s.ar : s.en}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Referred friends */}
          {(data?.referred ?? []).length > 0 && (
            <div className="glass-card-themed rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/60">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
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
                    <div className="text-[10px] text-gray-400">
                      {new Date(m.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{background:'rgba(139,92,246,0.12)', color:'#8b5cf6'}}>
                    +500 {isRtl ? 'نقطة' : 'pts'}
                  </div>
                </div>
              ))}
            </div>
          )}
          {(data?.referred ?? []).length === 0 && (
            <div className="text-center py-10 text-sm text-gray-400">
              {isRtl ? 'شارك كودك وابدأ في كسب النقاط!' : 'Share your code and start earning!'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
