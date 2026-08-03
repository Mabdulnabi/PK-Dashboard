'use client'
// app/ui-settings/page.tsx
import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Upload, Check, Image as ImageIcon, Trash2, Sun, Moon, LogIn, Key, MessageCircle } from 'lucide-react'

const LOGO_SLOTS = [
  {
    key: 'logo_url',
    label: 'اللوجو العام (احتياطي)',
    hint: 'يُستخدم fallback في كل المواضع اللي ملهاش لوجو خاص',
    section: 'member',
  },
  {
    key: 'logo_light_url',
    label: 'بورتال الأعضاء – وضع نهاري',
    hint: 'يظهر في السايدبار لما المستخدم في الوضع النهاري',
    section: 'member',
  },
  {
    key: 'logo_dark_url',
    label: 'بورتال الأعضاء – وضع ليلي',
    hint: 'يظهر في السايدبار لما المستخدم في الوضع الليلي',
    section: 'member',
  },
  {
    key: 'member_login_logo_url',
    label: 'صفحة تسجيل دخول الأعضاء',
    hint: 'اللوجو اللي بيظهر في صفحة /u/login',
    section: 'member',
  },
  {
    key: 'admin_logo_dark_url',
    label: 'لوحة الأدمن – وضع ليلي',
    hint: 'يظهر في السايدبار لما الداشبورد في الوضع الليلي (الوضع الافتراضي حالياً)',
    section: 'admin',
  },
  {
    key: 'admin_logo_light_url',
    label: 'لوحة الأدمن – وضع نهاري',
    hint: 'يظهر في السايدبار لما الداشبورد في الوضع النهاري (مستقبلي)',
    section: 'admin',
  },
  {
    key: 'admin_login_logo_url',
    label: 'صفحة تسجيل دخول الأدمن',
    hint: 'اللوجو اللي بيظهر في صفحة /auth/login',
    section: 'admin',
  },
] as const

type SlotKey = typeof LOGO_SLOTS[number]['key']

interface Settings {
  urls: Record<string, string>
  logo_width: string
  logo_height: string
  admin_logo_width: string
  admin_logo_height: string
}

export default function UISettingsPage() {
  const [urls,           setUrls]        = useState<Record<string, string>>({})
  const [logoWidth,      setLogoWidth]   = useState('40')
  const [logoHeight,     setLogoHeight]  = useState('40')
  const [adminLogoW,     setAdminLogoW]  = useState('36')
  const [adminLogoH,     setAdminLogoH]  = useState('36')
  const [fabIcon,        setFabIcon]     = useState('')
  const [loading,        setLoading]     = useState(true)
  const [uploadingSlot,  setUpSlot]      = useState<string | null>(null)
  const [saving,         setSaving]      = useState(false)
  const [msg,            setMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/ui-settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings || {}
        const u: Record<string, string> = {}
        LOGO_SLOTS.forEach(sl => { u[sl.key] = s[sl.key] || '' })
        setUrls(u)
        setLogoWidth(s.logo_width || '40')
        setLogoHeight(s.logo_height || '40')
        setAdminLogoW(s.admin_logo_width || '36')
        setAdminLogoH(s.admin_logo_height || '36')
        setFabIcon(s.live_chat_fab_icon || '')
        setLoading(false)
      })
  }, [])

  async function uploadLogo(slot: string, file: File) {
    setUpSlot(slot); setMsg(null)
    const form = new FormData()
    form.append('file', file)
    form.append('slot', slot)
    const res  = await fetch('/api/admin/ui-settings/upload', { method: 'POST', body: form })
    const data = await res.json()
    setUpSlot(null)
    if (!res.ok) { setMsg({ type: 'error', text: data.error }); return }
    setUrls(prev => ({ ...prev, [slot]: data.url }))
  }

  async function save() {
    setSaving(true); setMsg(null)
    const body: Record<string, string> = {
      logo_width: logoWidth, logo_height: logoHeight,
      admin_logo_width: adminLogoW, admin_logo_height: adminLogoH,
      live_chat_fab_icon: fabIcon,
      ...urls,
    }
    const res = await fetch('/api/ui-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { setMsg({ type: 'error', text: 'حصل خطأ في الحفظ' }); return }
    setMsg({ type: 'success', text: 'تم حفظ إعدادات الواجهة ✓' })
  }

  const inp = "w-full bg-white dark:bg-[#1F2937] text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 border border-gray-200 dark:border-[#374151] focus:border-blue-500 outline-none transition-colors"

  function LogoSlot({ slot }: { slot: typeof LOGO_SLOTS[number] }) {
    const url  = urls[slot.key] || ''
    const busy = uploadingSlot === slot.key
    return (
      <div className="flex items-start gap-4 py-4 border-b border-gray-100 dark:border-[#374151] last:border-b-0">
        {/* Preview */}
        <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-[#374151] flex items-center justify-center overflow-hidden flex-shrink-0">
          {url
            ? <img src={url} alt={slot.label} className="w-full h-full object-contain p-1"/>
            : <ImageIcon size={20} className="text-gray-600"/>
          }
        </div>
        {/* Controls */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5">{slot.label}</div>
          <div className="text-xs text-gray-500 mb-2">{slot.hint}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fileRefs.current[slot.key]?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors"
            >
              {busy
                ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <Upload size={11}/>
              }
              {busy ? 'جاري الرفع...' : 'رفع'}
            </button>
            {url && (
              <button
                onClick={() => setUrls(prev => ({ ...prev, [slot.key]: '' }))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors"
              >
                <Trash2 size={11}/>حذف
              </button>
            )}
            <input
              ref={el => { fileRefs.current[slot.key] = el }}
              type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadLogo(slot.key, e.target.files[0])}
            />
          </div>
          {url && (
            <input
              value={url}
              onChange={e => setUrls(prev => ({ ...prev, [slot.key]: e.target.value }))}
              placeholder="https://..." dir="ltr"
              className="mt-2 w-full bg-gray-50 dark:bg-[#111827] text-gray-600 dark:text-gray-400 text-xs rounded-lg px-3 py-2 border border-gray-200 dark:border-[#374151] focus:border-blue-500 outline-none transition-colors"
            />
          )}
        </div>
      </div>
    )
  }

  const memberSlots = LOGO_SLOTS.filter(s => s.section === 'member')
  const adminSlots  = LOGO_SLOTS.filter(s => s.section === 'admin')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0D1117]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="إعدادات الواجهة" subtitle="تحكم في شعارات وألوان واجهة المستخدم" />

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">

              {msg && (
                <div className={`px-4 py-3 rounded-lg text-sm border ${
                  msg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-300 border-red-500/20'
                }`}>{msg.text}</div>
              )}

              {/* ── Member Portal Logos ──────────────────── */}
              <div className="rounded-2xl p-6 bg-white dark:bg-[#1F2937] border border-gray-100 dark:border-[#374151] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Key size={14} className="text-blue-400"/>
                  <h2 className="text-gray-900 dark:text-white font-bold text-sm">لوجوهات بورتال الأعضاء</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  اللوجو العام fallback لأي موضع ملوش لوجو خاص.
                  النهاري والليلي بيتحدد حسب اختيار المستخدم في البورتال.
                </p>
                {memberSlots.map(s => <LogoSlot key={s.key} slot={s}/>)}

                {/* Size controls for member portal */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-[#374151]">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">عرض اللوجو (px)</label>
                    <input type="number" value={logoWidth} onChange={e => setLogoWidth(e.target.value)} className={inp}/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">ارتفاع اللوجو (px)</label>
                    <input type="number" value={logoHeight} onChange={e => setLogoHeight(e.target.value)} className={inp}/>
                  </div>
                </div>
              </div>

              {/* ── Admin Dashboard Logos ────────────────── */}
              <div className="rounded-2xl p-6 bg-white dark:bg-[#1F2937] border border-gray-100 dark:border-[#374151] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Sun size={14} className="text-amber-400"/>
                  <h2 className="text-gray-900 dark:text-white font-bold text-sm">لوجوهات لوحة الأدمن</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  الليلي هو الافتراضي دلوقتي. النهاري جاهز للوضع النهاري لما يتفعّل.
                </p>
                {adminSlots.map(s => <LogoSlot key={s.key} slot={s}/>)}

                {/* Size controls for admin */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-[#374151]">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">عرض لوجو الأدمن (px)</label>
                    <input type="number" value={adminLogoW} onChange={e => setAdminLogoW(e.target.value)} className={inp}/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">ارتفاع لوجو الأدمن (px)</label>
                    <input type="number" value={adminLogoH} onChange={e => setAdminLogoH(e.target.value)} className={inp}/>
                  </div>
                </div>
              </div>

              {/* ── Live Chat ───────────────────────────── */}
              <div className="rounded-2xl p-6 bg-white dark:bg-[#1F2937] border border-gray-100 dark:border-[#374151] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle size={14} style={{ color: '#d99401' }}/>
                  <h2 className="text-gray-900 dark:text-white font-bold text-sm">Live Chat</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">تحكم في أيقونة زر الشات العائم اللي بيظهر عند العميل</p>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">
                    أيقونة الزر العائم (Emoji)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      value={fabIcon}
                      onChange={e => setFabIcon(e.target.value)}
                      placeholder="مثال: 💬 أو 🎧 — اتركه فاضي للأيقونة الافتراضية"
                      className={inp}
                      maxLength={4}
                    />
                    {fabIcon && (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 shadow"
                        style={{ background: '#d99401' }}>
                        {fabIcon}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Save */}
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : <Check size={15}/>
                }
                حفظ التغييرات
              </button>

            </div>
          )}
        </div>
      </main>
    </div>
  )
}
