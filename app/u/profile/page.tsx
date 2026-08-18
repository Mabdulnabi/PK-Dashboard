'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { Camera, Check, AlertCircle, Eye, EyeOff, User, Mail, Phone, Lock, Globe, DollarSign } from 'lucide-react'

interface Profile {
  full_name: string; email: string; whatsapp: string
  avatar_url: string; member_code: string; plan_slug: string
  expires_at: string; total_spent_egp: number
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 end-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {ok ? <Check size={15}/> : <AlertCircle size={15}/>}{msg}
    </div>
  )
}

/* ── Rank definitions ── */
const RANKS = [
  { key: 'regular',  ar: 'عادي',    en: 'Regular',  min: 0,      max: 1,       color: '#5a8098', light: '#b8d0e0', dark: '#1e3848', mid: '#4a7080', darkest: '#182e3c' },
  { key: 'bronze',   ar: 'برونزي',  en: 'Bronze',   min: 1,      max: 2000,    color: '#b06030', light: '#f0bc78', dark: '#8a4c20', mid: '#502408', darkest: '#321404' },
  { key: 'silver',   ar: 'فضي',     en: 'Silver',   min: 2000,   max: 8000,    color: '#8888a0', light: '#e4e4f0', dark: '#6e6e80', mid: '#383848', darkest: '#242432' },
  { key: 'gold',     ar: 'ذهبي',    en: 'Gold',     min: 8000,   max: 20000,   color: '#c89010', light: '#fff060', dark: '#906800', mid: '#503800', darkest: '#342000' },
  { key: 'platinum', ar: 'بلاتيني', en: 'Platinum', min: 20000,  max: 40000,   color: '#7898b8', light: '#dce8f8', dark: '#587898', mid: '#2c4460', darkest: '#1c2c48' },
  { key: 'emerald',  ar: 'زمردي',   en: 'Emerald',  min: 40000,  max: 60000,   color: '#18a050', light: '#78f0a0', dark: '#0c7838', mid: '#064820', darkest: '#042c14' },
  { key: 'diamond',  ar: 'ماسي',    en: 'Diamond',  min: 60000,  max: Infinity, color: '#3870b8', light: '#c0e0fc', dark: '#2050a0', mid: '#102868', darkest: '#0a1848' },
] as const

type RankKey = typeof RANKS[number]['key']

function getRank(spent: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (spent >= RANKS[i].min) return RANKS[i]
  }
  return RANKS[0]
}

/* ── Hex badge SVG — v5 design ── */
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
      {/* drop shadow */}
      <polygon points="20,-29 38,3 20,35 -20,35 -38,3 -20,-29" fill="#000" opacity="0.22" transform="translate(2,5)"/>
      {/* hex ring */}
      <polygon points="18,-32 36,0 18,32 -18,32 -36,0 -18,-32" fill={`url(#${gid})`}/>
      {/* face highlights */}
      <polygon points="-18,-32 18,-32 11,-20 -11,-20" fill={c.ft} opacity="0.92"/>
      <polygon points="18,-32 36,0 23,0 11,-20"       fill={c.fur} opacity="0.85"/>
      <polygon points="18,32 -18,32 -11,20 11,20"     fill={c.fb} opacity="0.88"/>
      <polygon points="-18,32 -36,0 -23,0 -11,20"     fill={c.fll} opacity="0.75"/>
      {/* inner white ring + bg */}
      <circle r="23" fill="#fff"/>
      <circle r="17" fill={c.ib}/>
      {/* icon centered at 0,0 */}
      {icon[rk.key as RankKey]}
    </svg>
  )
}

const PLAN_COLOR: Record<string, string> = { basic: '#3B82F6', vip: '#F59E0B', private: '#8B5CF6' }
const PLAN_LABEL: Record<string, { en: string; ar: string }> = {
  basic:   { en: 'Basic',   ar: 'أساسي' },
  vip:     { en: 'VIP',     ar: 'VIP'   },
  private: { en: 'Private', ar: 'خاص'   },
}

export default function MemberProfilePage() {
  const { t, lang, dir, currency, setLang, setCurrency } = useLang()
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [whatsapp,  setWhatsapp]  = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/member/profile').then(r => r.json()).then((d: Profile) => {
      setProfile(d); setFullName(d.full_name || ''); setEmail(d.email || '')
      setWhatsapp(d.whatsapp || ''); setAvatarUrl(d.avatar_url || '')
    })
  }, [])

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const res  = await fetch('/api/member/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) { setAvatarUrl(data.url); setToast({ msg: t('Photo updated', 'تم تحديث الصورة'), ok: true }) }
    else setToast({ msg: data.error || t('Upload failed', 'فشل الرفع'), ok: false })
  }

  const save = async () => {
    setSaving(true)
    const body: Record<string, any> = {}
    if (fullName !== profile?.full_name)           body.full_name = fullName
    if (email !== profile?.email)                  body.email     = email
    if (whatsapp !== (profile?.whatsapp || ''))    body.whatsapp  = whatsapp
    if (password.trim())                           body.password  = password
    if (Object.keys(body).length === 0) {
      setSaving(false); setToast({ msg: t('Nothing changed', 'لا يوجد تغييرات'), ok: false }); return
    }
    const res  = await fetch('/api/member/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving(false)
    if (res.ok) { setToast({ msg: t('Saved successfully ✓', 'تم الحفظ بنجاح ✓'), ok: true }); setPassword(''); setProfile(p => p ? { ...p, full_name: fullName, email, whatsapp } : p) }
    else setToast({ msg: data.error || t('Failed to save', 'فشل الحفظ'), ok: false })
  }

  const initials    = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const planColor   = PLAN_COLOR[profile?.plan_slug || ''] || '#6B7280'
  const planLabel   = PLAN_LABEL[profile?.plan_slug || ''] || { en: 'Member', ar: 'عضو' }
  const spent       = profile?.total_spent_egp ?? 0
  const rank        = getRank(spent)
  const rankIdx     = RANKS.findIndex(r => r.key === rank.key)
  const nextRank    = RANKS[rankIdx + 1]
  const progress    = nextRank ? Math.min(100, ((spent - rank.min) / (nextRank.min - rank.min)) * 100) : 100

  const inp = `w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#d99401] focus:ring-2 focus:ring-[#d99401]/10 transition-all`

  const glassCard = {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.65)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.07)',
  }

  if (!profile) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
    </div>
  )

  return (
    <div className="p-6 md:p-10 min-h-full" dir={dir}>

      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('Account Settings', 'إعدادات الحساب')}</h1>
        <p className="text-sm text-gray-400 mt-1">{t('Manage your profile, preferences and security', 'إدارة ملفك الشخصي وتفضيلاتك وأمان حسابك')}</p>
      </div>

      {/* ── Top row: form + lang/currency ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start mb-6">

        {/* Profile form card */}
        <div className="rounded-2xl overflow-hidden" style={glassCard}>
          <div className="relative px-8 py-7 flex items-center gap-6" style={{background:'linear-gradient(135deg,#0d1117 0%,#1a1200 100%)'}}>
            <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 80% 50%, #d9940150, transparent 60%)'}}/>
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center ring-2 ring-white/20 flex-shrink-0" style={{background:'#d99401'}}>
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar"/> : <span className="text-xl font-bold text-white">{initials}</span>}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute -bottom-1 -end-1 w-7 h-7 rounded-xl flex items-center justify-center shadow-lg disabled:opacity-60" style={{background:'#d99401'}}>
                {uploading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Camera size={13} className="text-white"/>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}/>
            </div>
            <div className="relative">
              <p className="text-white font-bold text-lg leading-tight">{profile.full_name}</p>
              <p className="text-gray-400 text-sm mt-0.5">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {profile.member_code && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>{profile.member_code}</span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{background: planColor}}>
                  {lang==='ar' ? planLabel.ar : planLabel.en}
                </span>
              </div>
            </div>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"><User size={11}/>{t('Full Name','الاسم الكامل')}</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('Your full name','اسمك الكامل')} className={inp}/>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"><Mail size={11}/>{t('Email Address','البريد الإلكتروني')}</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="email@example.com" className={inp} dir="ltr"/>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"><Phone size={11}/>{t('WhatsApp Number','رقم واتساب')}</label>
              <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} type="tel" placeholder="+201234567890" className={inp} dir="ltr"/>
              <p className="text-[11px] text-gray-400 mt-1.5">{t('For faster support contact','للتواصل السريع مع الدعم')}</p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"><Lock size={11}/>{t('New Password','كلمة مرور جديدة')}</label>
              <div className="relative">
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPass?'text':'password'}
                  placeholder={t('Leave blank to keep current','اتركها فارغة للإبقاء على الحالية')} className={inp+' pe-10'}/>
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <button onClick={save} disabled={saving}
                className="w-full md:w-auto px-8 py-3 rounded-xl disabled:opacity-50 text-white text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]" style={{background:'#d99401'}}>
                {saving ? t('Saving…','جاري الحفظ…') : t('Save Changes','حفظ التغييرات')}
              </button>
            </div>
          </div>
        </div>

        {/* Language + Currency stacked */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl p-5" style={glassCard}>
            <div className="flex items-center gap-2 mb-4">
              <Globe size={14} className="text-indigo-500"/>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Language','اللغة')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key:'en', flag:'🇬🇧', label:'English', sub:'English' },
                { key:'ar', flag:'🇪🇬', label:'العربية', sub:'Arabic'  },
              ] as const).map(o => (
                <button key={o.key} onClick={()=>setLang(o.key)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all text-start ${lang===o.key?'border-[#d99401] bg-[#d9940110]':'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                  <span className="text-xl flex-shrink-0">{o.flag}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold leading-tight truncate ${lang===o.key?'text-[#b37a00]':'text-gray-800 dark:text-gray-100'}`}>{o.label}</p>
                    <p className="text-[10px] text-gray-400">{o.sub}</p>
                  </div>
                  {lang===o.key && <Check size={13} className="ms-auto flex-shrink-0" style={{color:'#d99401'}}/>}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={glassCard}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={14} className="text-emerald-500"/>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Currency','العملة')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key:'egp', flag:'🇪🇬', label:'EGP', sub: t('Egyptian Pound','جنيه مصري') },
                { key:'usd', flag:'🇺🇸', label:'USD', sub: t('US Dollar','دولار أمريكي')  },
              ] as const).map(o => (
                <button key={o.key} onClick={()=>setCurrency(o.key)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all text-start ${currency===o.key?'border-[#d99401] bg-[#d9940110]':'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                  <span className="text-xl flex-shrink-0">{o.flag}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold leading-tight ${currency===o.key?'text-[#b37a00]':'text-gray-800 dark:text-gray-100'}`}>{o.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{o.sub}</p>
                  </div>
                  {currency===o.key && <Check size={13} className="ms-auto flex-shrink-0" style={{color:'#d99401'}}/>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Rank card — full width ── */}
      <div className="rounded-2xl overflow-hidden" style={glassCard}>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6 px-8 py-7"
          style={{background:`linear-gradient(135deg, ${rank.darkest}ee 0%, #0d111a 100%)`}}>
          {/* current badge */}
          <HexBadge rk={rank} size={96} active/>
          {/* info + progress */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-1">{t('Your rank','رتبتك الحالية')}</p>
            <p className="text-2xl font-bold mb-1" style={{color: rank.light}}>{lang==='ar' ? rank.ar : rank.en}</p>
            <p className="text-sm mb-4" style={{color: rank.color}}>
              {t('Total spent','إجمالي الإنفاق')}: <span className="font-bold">{spent.toLocaleString()}</span> {t('EGP','جنيه')}
            </p>
            {nextRank ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{t('Next','التالية')}: <span className="font-semibold" style={{color: nextRank.color}}>{lang==='ar' ? nextRank.ar : nextRank.en}</span></span>
                  <span className="text-xs text-gray-500">{(nextRank.min - spent).toLocaleString()} {t('EGP remaining','جنيه متبقي')}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                  <div className="h-full rounded-full transition-all duration-700" style={{width:`${progress}%`, background:`linear-gradient(90deg, ${rank.color}, ${nextRank.color})`}}/>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold" style={{color: rank.color}}>🏆 {t('Maximum rank achieved!','وصلت للرتبة الأعلى!')}</p>
            )}
          </div>
          {/* all badges row */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t('All ranks','كل الرتب')}</p>
            <div className="flex items-end gap-3">
              {RANKS.map((r, i) => {
                const isActive = r.key === rank.key
                const unlocked = i <= rankIdx
                return (
                  <div key={r.key} className="flex flex-col items-center gap-1.5">
                    <div style={{opacity: unlocked ? 1 : 0.3, transform: isActive ? 'scale(1.2)' : 'scale(1)', transition:'transform .2s'}}>
                      <HexBadge rk={r} size={isActive ? 52 : 40} active={isActive}/>
                    </div>
                    <span className="text-[8px] font-bold" style={{color: isActive ? r.light : unlocked ? r.color : '#6b7280'}}>
                      {lang==='ar' ? r.ar : r.en}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)}/>}
    </div>
  )
}
