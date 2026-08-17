'use client'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { Camera, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface Profile {
  full_name: string; email: string; whatsapp: string
  avatar_url: string; member_code: string; plan_slug: string; expires_at: string
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 end-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {ok ? <Check size={15}/> : <AlertCircle size={15}/>}{msg}
    </div>
  )
}

const PLAN_COLOR: Record<string, string> = { basic: '#3B82F6', vip: '#F59E0B', private: '#8B5CF6' }

export default function MemberProfilePage() {
  const { t, lang, dir, currency, setLang, setCurrency } = useLang()
  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [fullName,   setFullName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [whatsapp,   setWhatsapp]   = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [avatarUrl,  setAvatarUrl]  = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/member/profile').then(r => r.json()).then((d: Profile) => {
      setProfile(d)
      setFullName(d.full_name || '')
      setEmail(d.email || '')
      setWhatsapp(d.whatsapp || '')
      setAvatarUrl(d.avatar_url || '')
    })
  }, [])

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res  = await fetch('/api/member/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) {
      setAvatarUrl(data.url)
      setToast({ msg: t('Photo updated', 'تم تحديث الصورة'), ok: true })
    } else {
      setToast({ msg: data.error || t('Upload failed', 'فشل الرفع'), ok: false })
    }
  }

  const save = async () => {
    setSaving(true)
    const body: Record<string, any> = {}
    if (fullName !== profile?.full_name)    body.full_name  = fullName
    if (email !== profile?.email)           body.email      = email
    if (whatsapp !== (profile?.whatsapp || '')) body.whatsapp = whatsapp
    if (password.trim())                    body.password   = password

    if (Object.keys(body).length === 0) {
      setSaving(false)
      setToast({ msg: t('Nothing changed', 'لا يوجد تغييرات'), ok: false })
      return
    }

    const res  = await fetch('/api/member/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)

    if (res.ok) {
      setToast({ msg: t('Saved successfully ✓', 'تم الحفظ بنجاح ✓'), ok: true })
      setPassword('')
      setProfile(p => p ? { ...p, full_name: fullName, email, whatsapp } : p)
    } else {
      setToast({ msg: data.error || t('Failed to save', 'فشل الحفظ'), ok: false })
    }
  }

  const initials = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const inp = `w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#d99401] transition-all`

  if (!profile) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto" dir={dir}>
      <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
        {t('Account Settings', 'إعدادات الحساب')}
      </h1>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">

        {/* Avatar section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-6 py-8 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center ring-4 ring-white/20" style={{background:'#d99401'}}>
              {avatarUrl
                ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar"/>
                : <span className="text-2xl font-bold text-white">{initials}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute bottom-0 end-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-60" style={{background:'#d99401'}}>
              {uploading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <Camera size={14} className="text-white"/>
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}/>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <p className="text-white font-bold text-base">{profile.full_name}</p>
              {profile.member_code && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>
                  {profile.member_code}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
          </div>
        </div>

        {/* Form fields */}
        <div className="p-6 space-y-4">

          {/* Full name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('Full Name', 'الاسم الكامل')}
            </label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder={t('Your full name', 'اسمك الكامل')} className={inp}/>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('Email Address', 'البريد الإلكتروني')}
            </label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="email@example.com" className={inp} dir="ltr"/>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('WhatsApp Number', 'رقم واتساب')}
            </label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              type="tel" placeholder="+201234567890" className={inp} dir="ltr"/>
            <p className="text-[11px] text-gray-400 mt-1">
              {t('For faster support contact', 'للتواصل السريع مع الدعم')}
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              {t('New Password', 'كلمة مرور جديدة')}
            </label>
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)}
                type={showPass ? 'text' : 'password'}
                placeholder={t('Leave blank to keep current', 'اتركها فارغة للإبقاء على الحالية')}
                className={inp + ' pe-10'}/>
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full py-3 rounded-xl disabled:opacity-50 text-white text-sm font-bold transition-colors mt-2" style={{background:'#d99401'}}>
            {saving ? t('Saving…', 'جاري الحفظ…') : t('Save Changes', 'حفظ التغييرات')}
          </button>
        </div>
      </div>

      {/* Language & Currency */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden mt-5">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Language & Currency', 'اللغة والعملة')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t('Changes apply immediately across the site', 'التغييرات تُطبَّق فوراً على الموقع')}</p>
        </div>
        <div className="p-6 space-y-5">
          {/* Language */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5">{t('Language', 'اللغة')}</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key:'en', flag:'🇬🇧', label:'English', sub:'English'  },
                { key:'ar', flag:'🇪🇬', label:'العربية', sub:'Arabic'   },
              ] as const).map(o => (
                <button key={o.key} onClick={()=>setLang(o.key)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-start ${
                    lang===o.key
                      ? 'border-[#d99401] bg-[#d9940110]'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <span className="text-2xl flex-shrink-0">{o.flag}</span>
                  <div>
                    <p className={`text-sm font-bold leading-tight ${lang===o.key?'text-[#b37a00]':'text-gray-800 dark:text-gray-100'}`}>{o.label}</p>
                    <p className="text-[10px] text-gray-400">{o.sub}</p>
                  </div>
                  {lang===o.key && <Check size={14} className="ms-auto flex-shrink-0" style={{color:'#d99401'}}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5">{t('Currency', 'العملة')}</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key:'egp', flag:'🇪🇬', label:'EGP', sub: t('Egyptian Pound','جنيه مصري') },
                { key:'usd', flag:'🇺🇸', label:'USD', sub: t('US Dollar','دولار أمريكي')   },
              ] as const).map(o => (
                <button key={o.key} onClick={()=>setCurrency(o.key)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-start ${
                    currency===o.key
                      ? 'border-[#d99401] bg-[#d9940110]'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                  <span className="text-2xl flex-shrink-0">{o.flag}</span>
                  <div>
                    <p className={`text-sm font-bold leading-tight ${currency===o.key?'text-[#b37a00]':'text-gray-800 dark:text-gray-100'}`}>{o.label}</p>
                    <p className="text-[10px] text-gray-400">{o.sub}</p>
                  </div>
                  {currency===o.key && <Check size={14} className="ms-auto flex-shrink-0" style={{color:'#d99401'}}/>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)}/>}
    </div>
  )
}
