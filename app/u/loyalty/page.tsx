'use client'
import { useEffect, useState, useCallback } from 'react'
import { useLang } from '@/lib/lang-context'
import { BADGE_CFG, RANK_TIERS, getMemberRank, type RankKey } from '@/lib/rank'
import { Copy, Check, Share2, Users, Gift, Star, Zap, ArrowUp, Clock } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface RewardsData {
  balance: number; total_earned: number; total_redeemed: number
  redeemable_egp: number; expires_days: number | null; total_spent_egp: number
  transactions: { id:string; delta:number; type:string; label:string; label_ar:string; created_at:string }[]
  referral_code: string | null; total_referred: number; referral_points: number
  referred: { id:string; full_name:string; created_at:string }[]
}

// ─── Large Hex Badge ──────────────────────────────────────────────────────────
function HexBadge({ rankKey, size = 88 }: { rankKey: RankKey; size?: number }) {
  const c    = BADGE_CFG[rankKey]
  const rank = RANK_TIERS.find(r => r.key === rankKey)!
  const id   = `hb-${rankKey}-${size}`
  const cx   = size / 2
  // hexagon clip
  const pts  = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${cx + (cx - 2) * Math.cos(a)},${cx + (cx - 2) * Math.sin(a)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter:`drop-shadow(0 0 14px ${c.g1}55)` }}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={c.g0}/>
          <stop offset="50%"  stopColor={c.g1}/>
          <stop offset="100%" stopColor={c.g2}/>
        </linearGradient>
        <clipPath id={`${id}-clip`}><polygon points={pts}/></clipPath>
      </defs>
      {/* Glow ring */}
      <polygon points={pts} fill="none" stroke={c.g1} strokeWidth="1.5" opacity="0.5"/>
      {/* Fill */}
      <polygon points={pts} fill={`url(#${id}-g)`} clipPath={`url(#${id}-clip)`}/>
      {/* Inner light */}
      <ellipse cx={cx} cy={cx * 0.65} rx={cx * 0.45} ry={cx * 0.22} fill={c.ft} opacity="0.18"/>
      {/* Rank initial */}
      <text x={cx} y={cx + 5} textAnchor="middle" fill={c.ft}
        fontSize={size * 0.28} fontWeight="900" fontFamily="system-ui"
        style={{ userSelect:'none' }}>
        {rank.en[0]}
      </text>
    </svg>
  )
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ icon:Icon, label, value, sub, color = '#d99401' }:
  { icon:any; label:string; value:string; sub?:string; color?:string }) {
  return (
    <div className="flex-1 rounded-2xl p-4 border border-[var(--border)]"
      style={{ background:'rgba(255,255,255,0.03)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background:`${color}18` }}>
          <Icon size={12} style={{ color }}/>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-black font-mono tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Transaction Row ─────────────────────────────────────────────────────────
function TxRow({ tx, isRtl }: { tx: RewardsData['transactions'][0]; isRtl: boolean }) {
  const isEarn = tx.delta > 0
  const typeColor: Record<string, string> = {
    earn: '#22c55e', bonus: '#d99401', referral: '#8b5cf6', welcome: '#3b82f6',
    redeem: '#ef4444', expire: '#6b7280',
  }
  const color = typeColor[tx.type] || '#8890a0'
  const date  = new Date(tx.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month:'short', day:'numeric' })
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background:`${color}18` }}>
        {isEarn ? <ArrowUp size={12} style={{ color }}/> : <ArrowUp size={12} style={{ color, transform:'rotate(180deg)' }}/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">
          {isRtl ? (tx.label_ar || tx.label) : (tx.label || tx.label_ar)}
        </div>
        <div className="text-[10px] text-gray-400">{date}</div>
      </div>
      <div className="font-mono font-black text-sm flex-shrink-0" style={{ color }}>
        {isEarn ? '+' : ''}{tx.delta.toLocaleString()}
        <span className="text-[9px] font-normal ml-0.5 opacity-60">{isRtl ? 'نقطة' : 'pts'}</span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LoyaltyPage() {
  const { lang } = useLang()
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

  const rank     = getMemberRank(data?.total_spent_egp ?? 0)
  const rankIdx  = RANK_TIERS.findIndex(r => r.key === rank.key)
  const nextRank = RANK_TIERS[rankIdx + 1] ?? null
  const progress = nextRank
    ? Math.min(100, Math.round(((data?.total_spent_egp ?? 0) - rank.min) / (nextRank.min - rank.min) * 100))
    : 100
  const c = BADGE_CFG[rank.key as RankKey]

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
        text: isRtl ? `سجّل معي في Pro Keys وابدأ من 200 نقطة هدية!\nكودك: ${data?.referral_code}` : `Join me on Pro Keys and get 200 bonus points!\nCode: ${data?.referral_code}`,
        url: referralLink,
      })
    } else { copy() }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor:'#d99401', borderTopColor:'transparent' }}/>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── HERO RANK CARD ─────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden mb-4 p-6"
        style={{
          background: `linear-gradient(135deg, ${c.g2}cc 0%, rgba(10,12,20,0.95) 60%)`,
          border: `1px solid ${c.g1}30`,
          boxShadow: `0 0 40px ${c.g1}18`,
        }}>
        {/* Background texture — subtle hex grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hex-bg" x="0" y="0" width="40" height="46" patternUnits="userSpaceOnUse">
              <polygon points="20,2 38,12 38,34 20,44 2,34 2,12" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-bg)"/>
        </svg>

        <div className="relative flex items-center gap-5">
          {/* Badge */}
          <div className="flex-shrink-0">
            <HexBadge rankKey={rank.key as RankKey} size={80}/>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: c.g1 }}>
              {isRtl ? 'رتبتك الحالية' : 'Your Rank'}
            </div>
            <div className="text-2xl font-black mb-0.5" style={{ color: c.g0 }}>
              {isRtl ? rank.ar : rank.en}
            </div>
            <div className="font-mono font-black text-3xl tabular-nums" style={{ color:'#fff' }}>
              {(data?.balance ?? 0).toLocaleString()}
              <span className="text-sm font-normal text-gray-300 ms-1">{isRtl ? 'نقطة' : 'pts'}</span>
            </div>
          </div>
          {/* Redeemable bubble */}
          {(data?.redeemable_egp ?? 0) > 0 && (
            <div className="flex-shrink-0 text-center px-3 py-2 rounded-2xl"
              style={{ background:`${c.g1}22`, border:`1px solid ${c.g1}40` }}>
              <div className="text-[9px] text-gray-300 uppercase tracking-widest">{isRtl ? 'قابل للاستبدال' : 'Redeemable'}</div>
              <div className="text-lg font-black" style={{ color: c.g1 }}>{data!.redeemable_egp} ج</div>
            </div>
          )}
        </div>

        {/* Rank progress */}
        {nextRank && (
          <div className="relative mt-5">
            <div className="flex justify-between text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest">
              <span>{isRtl ? rank.ar : rank.en}</span>
              <span style={{ color: nextRank.color }}>{isRtl ? nextRank.ar : nextRank.en} — {nextRank.min.toLocaleString()} {isRtl ? 'ج إجمالي' : 'EGP spent'}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width:`${progress}%`, background:`linear-gradient(90deg, ${c.g1}, ${nextRank.color})` }}/>
            </div>
            <div className="text-[9px] text-gray-400 mt-1 text-center">{progress}% {isRtl ? 'للمستوى التالي' : 'to next rank'}</div>
          </div>
        )}
        {!nextRank && (
          <div className="mt-5 text-center text-xs font-bold" style={{ color: c.g1 }}>
            {isRtl ? '🏆 أعلى مستوى — أنت في القمة!' : '🏆 Max Rank — You\'ve reached the top!'}
          </div>
        )}
      </div>

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-2xl mb-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)' }}>
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
        <div className="space-y-4">
          {/* Stats row */}
          <div className="flex gap-3">
            <StatPill icon={Star}  label={isRtl ? 'الرصيد' : 'Balance'}   value={(data?.balance ?? 0).toLocaleString()} sub={isRtl ? 'نقطة' : 'points'} color="#d99401"/>
            <StatPill icon={Zap}   label={isRtl ? 'مكتسب' : 'Earned'}     value={(data?.total_earned ?? 0).toLocaleString()} sub={isRtl ? 'إجمالي' : 'lifetime'} color="#22c55e"/>
            <StatPill icon={Clock} label={isRtl ? 'ينتهي خلال' : 'Expires'} value={data?.expires_days != null ? `${data.expires_days}` : '—'} sub={isRtl ? 'يوم' : 'days'} color={data?.expires_days != null && data.expires_days < 30 ? '#ef4444' : '#8890a0'}/>
          </div>

          {/* How to earn */}
          <div className="rounded-2xl p-5 border border-[var(--border)]" style={{ background:'rgba(255,255,255,0.03)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
              {isRtl ? 'كيف تكسب النقاط' : 'How to Earn'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon:'🛒', ar:'كل 1 جنيه = 1 نقطة',         en:'1 EGP = 1 point',           sub_ar:'على أي اشتراك',     sub_en:'on any order' },
                { icon:'⚡', ar:'طلب 500–1499 ج → +100 نقطة', en:'Order 500–1499 → +100 pts', sub_ar:'بونص إضافي',        sub_en:'extra bonus' },
                { icon:'💎', ar:'طلب 1500+ ج → +300 نقطة',   en:'Order 1500+ → +300 pts',    sub_ar:'بونص الكبار',       sub_en:'big order bonus' },
                { icon:'🎁', ar:'أول اشتراك → +200 نقطة',    en:'First order → +200 pts',    sub_ar:'مكافأة ترحيب',      sub_en:'welcome gift' },
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
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
          <div className="rounded-2xl p-5 border border-[var(--border)]" style={{ background:'rgba(255,255,255,0.03)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              {isRtl ? 'قواعد الاستبدال' : 'Redemption Rules'}
            </div>
            <div className="space-y-2">
              {[
                { ar:'100 نقطة = 5 جنيه خصم (5% استرداد)', en:'100 pts = 5 EGP discount (5% back)' },
                { ar:'الحد الأدنى للفاتورة: 300 جنيه', en:'Minimum order to redeem: 300 EGP' },
                { ar:'حد أقصى للاستخدام: 15% من قيمة الفاتورة', en:'Max per order: 15% of bill value' },
                { ar:'النقاط تنتهي بعد 4 أشهر من آخر شراء', en:'Points expire 4 months after last purchase' },
              ].map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                  <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background:'#d99401' }}/>
                  {isRtl ? rule.ar : rule.en}
                </div>
              ))}
            </div>
          </div>

          {/* Rank Ladder */}
          <div className="rounded-2xl p-5 border border-[var(--border)]" style={{ background:'rgba(255,255,255,0.03)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
              {isRtl ? 'سلّم المستويات' : 'Rank Ladder'}
            </div>
            <div className="relative flex items-center justify-between">
              {/* Connecting line */}
              <div className="absolute top-[22px] left-0 right-0 h-px" style={{ background:'rgba(255,255,255,0.08)', zIndex:0 }}/>
              <div className="absolute top-[22px] left-0 h-px transition-all duration-700"
                style={{ width:`${(rankIdx / (RANK_TIERS.length - 1)) * 100}%`, background:`linear-gradient(90deg, #5a8098, ${rank.color})`, zIndex:1 }}/>
              {RANK_TIERS.map((r, i) => {
                const rc    = BADGE_CFG[r.key as RankKey]
                const isCur = r.key === rank.key
                const isPast = i < rankIdx
                return (
                  <div key={r.key} className="flex flex-col items-center gap-1.5 relative z-10" style={{ flex: '0 0 auto' }}>
                    <div style={{
                      opacity: isPast ? 0.6 : isCur ? 1 : 0.3,
                      filter:  isCur ? `drop-shadow(0 0 8px ${rc.g1})` : 'none',
                      transform: isCur ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.3s',
                    }}>
                      <HexBadge rankKey={r.key as RankKey} size={36}/>
                    </div>
                    <div className="text-[8px] font-bold text-center" style={{ color: isCur ? r.color : '#6b7280', maxWidth: 40 }}>
                      {isRtl ? r.ar : r.en}
                    </div>
                    {!isCur && !isPast && r.min > 0 && (
                      <div className="text-[7px] text-gray-500">{(r.min/1000).toFixed(0)}k</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Transactions */}
          {(data?.transactions ?? []).length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between"
                style={{ background:'rgba(255,255,255,0.03)' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {isRtl ? 'آخر المعاملات' : 'Recent Activity'}
                </span>
              </div>
              <div className="px-5 divide-y divide-[var(--border)]">
                {data!.transactions.map(tx => <TxRow key={tx.id} tx={tx} isRtl={isRtl}/>)}
              </div>
            </div>
          )}
          {(data?.transactions ?? []).length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500">
              {isRtl ? 'لا توجد معاملات بعد — ابدأ بأول اشتراك!' : 'No activity yet — make your first order!'}
            </div>
          )}
        </div>
      )}

      {/* ══ REFERRAL TAB ════════════════════════════════════════════════════ */}
      {tab === 'referral' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex gap-3">
            <StatPill icon={Users} label={isRtl ? 'أصدقاء مُحالون' : 'Referred'} value={String(data?.total_referred ?? 0)} color="#3b82f6"/>
            <StatPill icon={Gift}  label={isRtl ? 'نقاط إحالة' : 'Ref. Points'} value={(data?.referral_points ?? 0).toLocaleString()} sub={isRtl ? 'نقطة' : 'pts'} color="#8b5cf6"/>
            <StatPill icon={Star}  label={isRtl ? 'مكافأة/إحالة' : 'Per Referral'} value="500" sub={isRtl ? 'نقطة' : 'pts'} color="#d99401"/>
          </div>

          {/* Coupon card */}
          <div className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background:'rgba(217,148,1,0.06)',
              border:'2px dashed rgba(217,148,1,0.35)',
            }}>
            {/* Cutout circles (coupon aesthetic) */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 rounded-full" style={{ background:'var(--bg)' }}/>
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 w-8 h-8 rounded-full" style={{ background:'var(--bg)' }}/>

            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
              {isRtl ? 'كود الإحالة الخاص بك' : 'Your Referral Code'}
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="font-mono font-black tracking-[0.3em] text-3xl" style={{ color:'#d99401' }}>
                {data?.referral_code ?? '——'}
              </div>
            </div>

            <div className="text-xs text-gray-400 mb-4 leading-relaxed">
              {isRtl
                ? 'شارك الكود مع أصدقائك — كل صديق يسجّل ويشتري، إنت تكسب 500 نقطة وهو يبدأ بـ 200 نقطة هدية'
                : 'Share your code — for every friend who registers and purchases, you earn 500 points and they start with 200 bonus points'}
            </div>

            <div className="flex gap-2">
              <button onClick={copy}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 justify-center"
                style={{ background: copied ? '#22c55e' : '#d99401', color:'#000' }}>
                {copied ? <Check size={14}/> : <Copy size={14}/>}
                {copied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ الكود' : 'Copy Code')}
              </button>
              <button onClick={share}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border border-[var(--border)] hover:border-[#d99401]"
                style={{ color:'var(--fg)' }}>
                <Share2 size={14} style={{ color:'#d99401' }}/>
                {isRtl ? 'مشاركة' : 'Share'}
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-2xl p-5 border border-[var(--border)]" style={{ background:'rgba(255,255,255,0.03)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
              {isRtl ? 'كيف تشتغل؟' : 'How it works'}
            </div>
            <div className="space-y-3">
              {[
                { step:'01', ar:'شارك كودك مع صديق',              en:'Share your code with a friend' },
                { step:'02', ar:'يسجّل حساب برابطك أو كودك',       en:'They sign up using your link/code' },
                { step:'03', ar:'بيعمل أول عملية شراء',           en:'They make their first purchase' },
                { step:'04', ar:'إنت تكسب 500 نقطة تلقائياً 🎉',  en:'You earn 500 points automatically 🎉' },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{ background:'rgba(217,148,1,0.12)', color:'#d99401' }}>{s.step}</div>
                  <div className="text-sm">{isRtl ? s.ar : s.en}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Referred friends */}
          {(data?.referred ?? []).length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border)]" style={{ background:'rgba(255,255,255,0.03)' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  {isRtl ? 'الأصدقاء المسجّلون' : 'Referred Friends'}
                </span>
              </div>
              {data!.referred.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                    style={{ background:'rgba(217,148,1,0.12)', color:'#d99401' }}>
                    {m.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{m.full_name}</div>
                    <div className="text-[10px] text-gray-400">
                      {new Date(m.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background:'rgba(139,92,246,0.12)', color:'#8b5cf6' }}>
                    +500 {isRtl ? 'نقطة' : 'pts'}
                  </div>
                </div>
              ))}
            </div>
          )}
          {(data?.referred ?? []).length === 0 && (
            <div className="text-center py-10 text-sm text-gray-500">
              {isRtl ? 'شارك كودك وابدأ في كسب النقاط!' : 'Share your code and start earning!'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
