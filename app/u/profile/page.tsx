'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { Camera, Check, AlertCircle, Eye, EyeOff, User, Mail, Phone, Lock, Globe, DollarSign } from 'lucide-react'
import NotifBanner from '@/components/ui/NotifBanner'

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

const RANKS = [
  { key: 'regular',  ar: 'عادي',    en: 'Regular',  min: 0,      color: '#5a8098', light: '#b8d0e0' },
  { key: 'bronze',   ar: 'برونزي',  en: 'Bronze',   min: 1,      color: '#b06030', light: '#f0bc78' },
  { key: 'silver',   ar: 'فضي',     en: 'Silver',   min: 2000,   color: '#8888a0', light: '#e4e4f0' },
  { key: 'gold',     ar: 'ذهبي',    en: 'Gold',     min: 8000,   color: '#c89010', light: '#fff060' },
  { key: 'platinum', ar: 'بلاتيني', en: 'Platinum', min: 20000,  color: '#7898b8', light: '#dce8f8' },
  { key: 'emerald',  ar: 'زمردي',   en: 'Emerald',  min: 40000,  color: '#18a050', light: '#78f0a0' },
  { key: 'diamond',  ar: 'ماسي',    en: 'Diamond',  min: 60000,  color: '#3870b8', light: '#c0e0fc' },
] as const
function getRank(s: number) { for (let i = RANKS.length - 1; i >= 0; i--) { if (s >= RANKS[i].min) return RANKS[i] } return RANKS[0] }

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
  const rank        = getRank(profile?.total_spent_egp ?? 0)

  const inp = `w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#d99401] focus:ring-2 focus:ring-[#d99401]/10 transition-all`

  if (!profile) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
    </div>
  )

  const fmtAmt = (egp: number) => currency === 'usd'
    ? `${(egp / 50).toLocaleString(undefined, { maximumFractionDigits: 1 })} USD`
    : `${egp.toLocaleString()} ${t('EGP','جنيه')}`

  return (
    <div className="p-4 md:p-5 flex flex-col gap-3" dir={dir}>

      <NotifBanner lang={lang} match={['تقييم','Review','Approved','Rejected','قبول','رفض']}/>

      <div className="flex-shrink-0">
        <h1 className="text-base font-bold text-gray-900 dark:text-white">{t('Account Settings', 'إعدادات الحساب')}</h1>
        <p className="text-[11px] text-gray-400">{t('Manage your profile, preferences and security', 'إدارة ملفك الشخصي وتفضيلاتك وأمان حسابك')}</p>
      </div>

      {/* ── Profile card ── */}
      <div className="glass-card-themed rounded-2xl overflow-hidden flex flex-col" data-reveal>
        {/* Avatar hero */}
        <div className="relative px-4 md:px-6 py-5 flex items-center gap-4 md:gap-5"
          style={{background:'linear-gradient(135deg,#0d1117 0%,#1a1200 100%)'}}>
          <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 80% 50%, #d9940150, transparent 60%)'}}/>
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center ring-2 ring-white/20" style={{background:'#d99401'}}>
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
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {profile.member_code && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>{profile.member_code}</span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:`${rank.color}30`,color:rank.light,border:`1px solid ${rank.color}60`}}>
                {lang==='ar' ? rank.ar : rank.en}
              </span>
            </div>
          </div>
        </div>

        {/* Form: 2-col grid */}
        <div className="px-4 md:px-6 pt-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5"><User size={10}/>{t('Full Name','الاسم الكامل')}</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('Your full name','اسمك الكامل')} className={inp}/>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5"><Mail size={10}/>{t('Email Address','البريد الإلكتروني')}</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="email@example.com" className={inp} dir="ltr"/>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5"><Phone size={10}/>{t('WhatsApp','واتساب')}</label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} type="tel" placeholder="+201234567890" className={inp} dir="ltr"/>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5"><Lock size={10}/>{t('New Password','كلمة مرور جديدة')}</label>
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)} type={showPass?'text':'password'}
                placeholder={t('Leave blank to keep current','اتركها فارغة للإبقاء على الحالية')} className={inp+' pe-10'}/>
              <button type="button" onClick={() => setShowPass(p => !p)} className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
            </div>
          </div>

          {/* Lang + Currency — stacked on mobile, inline on md+ */}
          <div className="md:col-span-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 pt-1">
            {/* Language */}
            <div className="flex items-center gap-2">
              <Globe size={12} className="text-indigo-500 flex-shrink-0"/>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{t('Language','اللغة')}</span>
              <div className="flex gap-1.5">
                {([{ key:'en', flag:'🇬🇧', label:'English' }, { key:'ar', flag:'🇪🇬', label:'العربية' }] as const).map(o => (
                  <button key={o.key} onClick={()=>setLang(o.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${lang===o.key?'border-[#d99401] bg-[#d9940115] text-[#b37a00]':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
                    <span>{o.flag}</span>{o.label}{lang===o.key&&<Check size={10} style={{color:'#d99401'}}/>}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700"/>
            {/* Currency */}
            <div className="flex items-center gap-2">
              <DollarSign size={12} className="text-emerald-500 flex-shrink-0"/>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{t('Currency','العملة')}</span>
              <div className="flex gap-1.5">
                {([{ key:'egp', flag:'🇪🇬', label:'EGP' }, { key:'usd', flag:'🇺🇸', label:'USD' }] as const).map(o => (
                  <button key={o.key} onClick={()=>setCurrency(o.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${currency===o.key?'border-[#d99401] bg-[#d9940115] text-[#b37a00]':'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
                    <span>{o.flag}</span>{o.label}{currency===o.key&&<Check size={10} style={{color:'#d99401'}}/>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider + Save */}
        <div className="mx-4 md:mx-6 border-t border-gray-100 dark:border-gray-800/60"/>
        <div className="px-4 md:px-6 py-4 flex justify-end">
          <button onClick={save} disabled={saving}
            className="px-8 py-2.5 rounded-xl disabled:opacity-50 text-white text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]" style={{background:'#d99401'}}>
            {saving ? t('Saving…','جاري الحفظ…') : t('Save Changes','حفظ التغييرات')}
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)}/>}
    </div>
  )
}
