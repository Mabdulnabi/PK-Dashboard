'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import RichEditor from '@/components/ui/RichEditor'
import {
  Upload, Check, Image as ImageIcon, Trash2, Key, MessageCircle,
  Image, FileText, Layers, Globe, SlidersHorizontal, AlertCircle,
} from 'lucide-react'

// ── Logo slots ────────────────────────────────────────────────────────────────
const LOGO_SLOTS = [
  { key: 'logo_url',             label: 'اللوجو العام (احتياطي)',        hint: 'يُستخدم fallback في كل المواضع اللي ملهاش لوجو خاص',                           section: 'member' },
  { key: 'logo_light_url',       label: 'بورتال الأعضاء – وضع نهاري',    hint: 'يظهر في السايدبار لما المستخدم في الوضع النهاري',                            section: 'member' },
  { key: 'logo_dark_url',        label: 'بورتال الأعضاء – وضع ليلي',     hint: 'يظهر في السايدبار لما المستخدم في الوضع الليلي',                             section: 'member' },
  { key: 'member_login_logo_url',label: 'صفحة تسجيل دخول الأعضاء',       hint: 'اللوجو اللي بيظهر في صفحة /u/login',                                        section: 'member' },
  { key: 'invoice_logo',         label: 'لوجو الفاتورة (Invoice)',        hint: 'يظهر على الفاتورة المرسلة للعملاء',                                          section: 'member' },
  { key: 'admin_logo_dark_url',  label: 'لوحة الأدمن – وضع ليلي',        hint: 'يظهر في السايدبار لما الداشبورد في الوضع الليلي (الوضع الافتراضي حالياً)',    section: 'admin'  },
  { key: 'admin_logo_light_url', label: 'لوحة الأدمن – وضع نهاري',       hint: 'يظهر في السايدبار لما الداشبورد في الوضع النهاري',                           section: 'admin'  },
  { key: 'admin_login_logo_url', label: 'صفحة تسجيل دخول الأدمن',        hint: 'اللوجو اللي بيظهر في صفحة /auth/login',                                     section: 'admin'  },
] as const

type SlotKey = typeof LOGO_SLOTS[number]['key']

// ── Pages ─────────────────────────────────────────────────────────────────────
const PAGE_SLUGS = ['about-us','contact-us','privacy-policy','refund-policy','delivery-policy','terms-of-use']
const PAGE_LABELS: Record<string,{en:string;ar:string}> = {
  'about-us':        { en:'About Us',         ar:'من نحن'            },
  'contact-us':      { en:'Contact Us',        ar:'اتصل بنا'          },
  'privacy-policy':  { en:'Privacy Policy',    ar:'سياسة الخصوصية'   },
  'refund-policy':   { en:'Refund Policy',     ar:'سياسة الاسترداد'  },
  'delivery-policy': { en:'Delivery Policy',   ar:'سياسة التسليم'    },
  'terms-of-use':    { en:'Terms of Use',      ar:'شروط الاستخدام'   },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'ok'|'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok' ? <Check size={15}/> : <AlertCircle size={15}/>}{msg}
    </div>
  )
}

const inp = "w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 border border-gray-200 dark:border-gray-700 focus:border-red-400 outline-none transition-colors"

// ── Main ─────────────────────────────────────────────────────────────────────
export default function UISettingsPage() {
  const [tab,     setTab]    = useState<'logos'|'banners'|'icons'|'pages'|'landing'>('logos')
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]  = useState<{msg:string;type:'ok'|'err'}|null>(null)

  // ── Logos state ──
  const [urls,        setUrls]       = useState<Record<string,string>>({})
  const [logoWidth,   setLogoWidth]  = useState('40')
  const [logoHeight,  setLogoHeight] = useState('40')
  const [adminLogoW,  setAdminLogoW] = useState('36')
  const [adminLogoH,  setAdminLogoH] = useState('36')
  const [fabIcon,     setFabIcon]    = useState('')
  const [siteName,    setSiteName]   = useState('')
  const [logoSaving,  setLogoSaving] = useState(false)
  const [uploadingSlot, setUpSlot]   = useState<string|null>(null)
  const fileRefs = useRef<Record<string,HTMLInputElement|null>>({})

  // ── Banners state ──
  const [dashBanners,      setDashBanners]      = useState<{url:string;link?:string}[]>([])
  const [bannerUploading,  setBannerUploading]  = useState(false)
  const [sharedBanners,    setSharedBanners]    = useState<{url:string;link?:string}[]>([])
  const [sharedUploading,  setSharedUploading]  = useState(false)
  const [privateBanners,   setPrivateBanners]   = useState<{url:string;link?:string}[]>([])
  const [privateUploading, setPrivateUploading] = useState(false)
  const [ordersBanners,    setOrdersBanners]    = useState<{url:string;link?:string}[]>([])
  const [ordersUploading,  setOrdersUploading]  = useState(false)

  // ── Icons state ──
  const [iconSettings, setIconSettings] = useState<Record<string,string>>({})
  const [iconSaving,   setIconSaving]   = useState(false)
  const [iconUploading,setIconUploading]= useState<string|null>(null)
  const iconFileRefs = useRef<Record<string,HTMLInputElement|null>>({})

  // ── Pages state ──
  const [pageSettings,   setPageSettings]   = useState<Record<string,string>>({})
  const [activePageSlug, setActivePageSlug] = useState('about-us')
  const [pageLang,       setPageLang]       = useState<'en'|'ar'>('en')
  const [pageContent,    setPageContent]    = useState('')
  const [pageSaving,     setPageSaving]     = useState(false)

  // ── Load all ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/ui-settings').then(r => r.json()).then(d => {
      const s: Record<string,string> = d.settings || {}

      // logos
      const u: Record<string,string> = {}
      LOGO_SLOTS.forEach(sl => { u[sl.key] = s[sl.key] || '' })
      setUrls(u)
      setLogoWidth(s.logo_width || '40')
      setLogoHeight(s.logo_height || '40')
      setAdminLogoW(s.admin_logo_width || '36')
      setAdminLogoH(s.admin_logo_height || '36')
      setFabIcon(s.live_chat_fab_icon || '')
      setSiteName(s.site_name || '')

      // banners
      const parseBanners = (raw: string, fallback: string) => {
        if (!raw && !fallback) return []
        try { const p = JSON.parse(raw || '[]'); return p.map((x: any) => typeof x === 'string' ? { url: x } : x) } catch {}
        return fallback ? [{ url: fallback }] : []
      }
      try {
        const p = JSON.parse(s.dashboard_banners || '[]')
        setDashBanners(p.map((x: any) => typeof x === 'string' ? { url: x } : x))
      } catch { if (s.dashboard_banner_url) setDashBanners([{ url: s.dashboard_banner_url }]) }
      setSharedBanners(parseBanners(s.shared_store_banners,  s.shared_store_banner_url))
      setPrivateBanners(parseBanners(s.private_store_banners, s.private_store_banner_url))
      setOrdersBanners(parseBanners(s.orders_banners,         s.orders_banner_url))

      // icons
      const icons: Record<string,string> = {}
      ICON_SLOTS.forEach(ic => { icons[ic.key] = s[ic.key] || '' })
      setIconSettings(icons)

      // pages
      setPageSettings(s)
      setPageContent(s[`page_about-us_en`] || '')

      setLoading(false)
    })
  }, [])

  // sync page content when slug/lang changes
  useEffect(() => {
    setPageContent(pageSettings[`page_${activePageSlug}_${pageLang}`] || '')
  }, [activePageSlug, pageLang, pageSettings])

  // ── Logo helpers ──────────────────────────────────────────────────────────
  async function uploadLogo(slot: string, file: File) {
    setUpSlot(slot)
    const form = new FormData(); form.append('file', file); form.append('slot', slot)
    const res  = await fetch('/api/admin/ui-settings/upload', { method: 'POST', body: form })
    const data = await res.json()
    setUpSlot(null)
    if (!res.ok) { setToast({ msg: data.error, type: 'err' }); return }
    setUrls(prev => ({ ...prev, [slot]: data.url }))
  }

  async function saveLogos() {
    setLogoSaving(true)
    const body: Record<string,string> = {
      logo_width: logoWidth, logo_height: logoHeight,
      admin_logo_width: adminLogoW, admin_logo_height: adminLogoH,
      live_chat_fab_icon: fabIcon, site_name: siteName,
      ...urls,
    }
    const res = await fetch('/api/ui-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setLogoSaving(false)
    setToast({ msg: res.ok ? 'تم حفظ اللوجوهات ✓' : 'حصل خطأ في الحفظ', type: res.ok ? 'ok' : 'err' })
  }

  // ── Banner helpers ────────────────────────────────────────────────────────
  const saveBanners = async (key: string, list: {url:string;link?:string}[]) => {
    await fetch('/api/admin/ui-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: JSON.stringify(list) }),
    })
  }

  const uploadBanner = async (file: File, slot: string, key: string, list: {url:string;link?:string}[], setList: (v:{url:string;link?:string}[])=>void, setUpl: (v:boolean)=>void) => {
    setUpl(true)
    const fd = new FormData(); fd.append('file', file); fd.append('slot', `${slot}-${Date.now()}`)
    const res  = await fetch('/api/admin/ui-settings/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUpl(false)
    if (!res.ok || !data.url) { setToast({ msg: data.error || 'Upload failed', type: 'err' }); return }
    const newList = [...list, { url: data.url }]
    setList(newList); saveBanners(key, newList)
    setToast({ msg: 'Banner added', type: 'ok' })
  }

  const removeBanner = (key: string, url: string, list: {url:string;link?:string}[], setList: (v:{url:string;link?:string}[])=>void) => {
    const newList = list.filter(b => b.url !== url)
    setList(newList); saveBanners(key, newList)
  }

  const updateBannerLink = (key: string, url: string, link: string, list: {url:string;link?:string}[], setList: (v:{url:string;link?:string}[])=>void) => {
    const newList = list.map(b => b.url === url ? { ...b, link: link || undefined } : b)
    setList(newList); saveBanners(key, newList)
  }

  // ── Icon helpers ──────────────────────────────────────────────────────────
  async function uploadIcon(key: string, file: File) {
    setIconUploading(key)
    const form = new FormData(); form.append('file', file); form.append('slot', key)
    const res  = await fetch('/api/admin/ui-settings/upload', { method: 'POST', body: form })
    const data = await res.json()
    setIconUploading(null)
    if (!res.ok) { setToast({ msg: data.error, type: 'err' }); return }
    const newSettings = { ...iconSettings, [key]: data.url }
    setIconSettings(newSettings)
    await fetch('/api/admin/ui-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: data.url }) })
    setToast({ msg: 'Icon uploaded', type: 'ok' })
  }

  async function saveIconSizes() {
    setIconSaving(true)
    const body: Record<string,string> = {}
    ICON_SLOTS.forEach(ic => { body[ic.key] = iconSettings[ic.key] || '' })
    await fetch('/api/admin/ui-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setIconSaving(false)
    setToast({ msg: 'Icon settings saved', type: 'ok' })
  }

  // ── Pages helpers ─────────────────────────────────────────────────────────
  async function savePage() {
    setPageSaving(true)
    const key = `page_${activePageSlug}_${pageLang}`
    const res = await fetch('/api/admin/ui-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: pageContent }) })
    if (res.ok) { setPageSettings(prev => ({ ...prev, [key]: pageContent })); setToast({ msg: 'Page saved!', type: 'ok' }) }
    else setToast({ msg: 'Error saving page', type: 'err' })
    setPageSaving(false)
  }

  async function uploadPageImage(file: File): Promise<string> {
    const form = new FormData(); form.append('file', file)
    const res = await fetch('/api/member/upload', { method: 'POST', body: form })
    const j = await res.json(); return j.url || ''
  }

  // ── Tab data ──────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'logos',   label: 'Logos',         icon: Key         },
    { id: 'banners', label: 'Banners',        icon: Image       },
    { id: 'icons',   label: 'Icons',          icon: SlidersHorizontal },
    { id: 'pages',   label: 'Pages',          icon: FileText    },
    { id: 'landing', label: 'Landing Page',   icon: Layers      },
  ] as const

  const memberSlots = LOGO_SLOTS.filter(s => s.section === 'member')
  const adminSlots  = LOGO_SLOTS.filter(s => s.section === 'admin')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0D1117]">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="UI Settings" subtitle="Logos, banners, icons, pages & landing page"/>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${tab===t.id?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  <Icon size={12}/>{t.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : (
            <>
              {/* ══ LOGOS ══ */}
              {tab === 'logos' && (
                <div className="max-w-2xl space-y-6">

                  {/* Member Portal Logos */}
                  <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Key size={14} className="text-blue-400"/>
                      <h2 className="font-bold text-sm text-gray-900 dark:text-white">Member Portal Logos</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">General logo is the fallback for any slot without a dedicated logo.</p>
                    {memberSlots.map(s => <LogoSlot key={s.key} slot={s} urls={urls} setUrls={setUrls} uploadingSlot={uploadingSlot} uploadLogo={uploadLogo} fileRefs={fileRefs}/>)}
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Logo Width (px)</label>
                        <input type="number" value={logoWidth} onChange={e => setLogoWidth(e.target.value)} className={inp}/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Logo Height (px)</label>
                        <input type="number" value={logoHeight} onChange={e => setLogoHeight(e.target.value)} className={inp}/>
                      </div>
                    </div>
                  </div>

                  {/* Admin Logos */}
                  <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <SlidersHorizontal size={14} className="text-purple-400"/>
                      <h2 className="font-bold text-sm text-gray-900 dark:text-white">Admin Dashboard Logos</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Dark mode is the current default. Light is ready for when light mode is enabled.</p>
                    {adminSlots.map(s => <LogoSlot key={s.key} slot={s} urls={urls} setUrls={setUrls} uploadingSlot={uploadingSlot} uploadLogo={uploadLogo} fileRefs={fileRefs}/>)}
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Admin Logo Width (px)</label>
                        <input type="number" value={adminLogoW} onChange={e => setAdminLogoW(e.target.value)} className={inp}/>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Admin Logo Height (px)</label>
                        <input type="number" value={adminLogoH} onChange={e => setAdminLogoH(e.target.value)} className={inp}/>
                      </div>
                    </div>
                  </div>

                  {/* Live Chat FAB */}
                  <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle size={14} className="text-amber-400"/>
                      <h2 className="font-bold text-sm text-gray-900 dark:text-white">Live Chat Button</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Controls the floating chat button icon shown to members</p>
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">FAB Icon (Emoji)</label>
                    <div className="flex items-center gap-3">
                      <input value={fabIcon} onChange={e => setFabIcon(e.target.value)} placeholder="e.g. 💬 or 🎧 — leave empty for default" className={inp} maxLength={4}/>
                      {fabIcon && (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 shadow" style={{ background: '#d99401' }}>
                          {fabIcon}
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Site / Business Name</label>
                      <input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="Pro Keys" className={inp}/>
                    </div>
                  </div>

                  <button onClick={saveLogos} disabled={logoSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                    {logoSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Check size={15}/>}
                    Save Logo Settings
                  </button>
                </div>
              )}

              {/* ══ BANNERS ══ */}
              {tab === 'banners' && (
                <div className="max-w-2xl space-y-5">

                  {/* Dashboard Banner */}
                  <BannerSection
                    title="Dashboard Banner Slider"
                    hint="Upload multiple images — they auto-rotate in the member dashboard. 1200×280px recommended."
                    list={dashBanners}
                    uploading={bannerUploading}
                    onUpload={f => uploadBanner(f, 'dashboard-banner', 'dashboard_banners', dashBanners, setDashBanners, setBannerUploading)}
                    onRemove={url => removeBanner('dashboard_banners', url, dashBanners, setDashBanners)}
                    onLinkChange={(url, link) => updateBannerLink('dashboard_banners', url, link, dashBanners, setDashBanners)}
                  />

                  {/* Section Banners */}
                  {([
                    { label:'Shared Store',  key:'shared_store_banners',  slot:'shared-banner',  list:sharedBanners,  setList:setSharedBanners,  upl:sharedUploading,  setUpl:setSharedUploading  },
                    { label:'Private Store', key:'private_store_banners', slot:'private-banner', list:privateBanners, setList:setPrivateBanners, upl:privateUploading, setUpl:setPrivateUploading },
                    { label:'My Orders',     key:'orders_banners',        slot:'orders-banner',  list:ordersBanners,  setList:setOrdersBanners,  upl:ordersUploading,  setUpl:setOrdersUploading  },
                  ]).map(({ label, key, slot, list, setList, upl, setUpl }) => (
                    <BannerSection
                      key={key}
                      title={`${label} Banner Slider`}
                      hint={`Upload images for the ${label} section. Add a link per slide (optional).`}
                      list={list}
                      uploading={upl}
                      onUpload={f => uploadBanner(f, slot, key, list, setList, setUpl)}
                      onRemove={url => removeBanner(key, url, list, setList)}
                      onLinkChange={(url, link) => updateBannerLink(key, url, link, list, setList)}
                    />
                  ))}
                </div>
              )}

              {/* ══ ICONS ══ */}
              {tab === 'icons' && (
                <div className="max-w-2xl space-y-6">
                  <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <SlidersHorizontal size={14} className="text-emerald-400"/>
                      <h2 className="font-bold text-sm text-gray-900 dark:text-white">User-Facing Icons</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-5">Upload custom icons for member portal UI elements and landing page sections.</p>
                    <div className="space-y-1">
                      {ICON_SLOTS.map(ic => (
                        <IconSlot
                          key={ic.key}
                          ic={ic}
                          iconSettings={iconSettings}
                          setIconSettings={setIconSettings}
                          iconUploading={iconUploading}
                          uploadIcon={uploadIcon}
                          iconFileRefs={iconFileRefs}
                        />
                      ))}
                    </div>
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                      <button onClick={saveIconSizes} disabled={iconSaving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                        {iconSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Check size={15}/>}
                        Save Icon Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ PAGES ══ */}
              {tab === 'pages' && (
                <div className="max-w-3xl">
                  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={14} className="text-teal-400"/>
                      <h2 className="font-bold text-sm text-gray-900 dark:text-white">Quick Link Pages</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Edit content for the public-facing policy and information pages.</p>

                    {/* Page selector */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {PAGE_SLUGS.map(slug => (
                        <button key={slug} onClick={() => setActivePageSlug(slug)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activePageSlug===slug?'bg-teal-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}>
                          {PAGE_LABELS[slug].en}
                        </button>
                      ))}
                    </div>

                    {/* Lang selector */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs text-gray-500">Language:</span>
                      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {(['en','ar'] as const).map(l => (
                          <button key={l} onClick={() => setPageLang(l)}
                            className={`px-3 py-1 text-xs font-medium transition-colors ${pageLang===l?'bg-teal-500 text-white':'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            {l==='en'?'English':'عربي'}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">Editing: <strong>{PAGE_LABELS[activePageSlug]?.[pageLang]}</strong></span>
                    </div>

                    <RichEditor value={pageContent} onChange={setPageContent} placeholder="Write page content…" minHeight={350} onImageUpload={uploadPageImage}/>

                    <div className="flex justify-end mt-4">
                      <button onClick={savePage} disabled={pageSaving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                        {pageSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={14}/>}
                        Save Page
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ LANDING PAGE ══ */}
              {tab === 'landing' && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center shadow-sm">
                    <Layers size={24} className="text-gray-300 dark:text-gray-700"/>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Landing Page Editor</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 text-center max-w-xs">
                    The full landing page editor is at its dedicated page. Click below to open it.
                  </p>
                  <a href="/landing-page"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
                    <Globe size={14}/> Open Landing Page Editor
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function LogoSlot({
  slot, urls, setUrls, uploadingSlot, uploadLogo, fileRefs,
}: {
  slot: typeof LOGO_SLOTS[number]
  urls: Record<string,string>
  setUrls: (fn: (p: Record<string,string>) => Record<string,string>) => void
  uploadingSlot: string|null
  uploadLogo: (slot: string, file: File) => void
  fileRefs: React.MutableRefObject<Record<string,HTMLInputElement|null>>
}) {
  const url  = urls[slot.key] || ''
  const busy = uploadingSlot === slot.key
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
        {url ? <img src={url} alt={slot.label} className="w-full h-full object-contain p-1"/> : <ImageIcon size={18} className="text-gray-400"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5">{slot.label}</div>
        <div className="text-xs text-gray-500 mb-2">{slot.hint}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fileRefs.current[slot.key]?.click()} disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors">
            {busy ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Upload size={11}/>}
            {busy ? 'Uploading…' : 'Upload'}
          </button>
          {url && (
            <button onClick={() => setUrls(prev => ({ ...prev, [slot.key]: '' }))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-bold transition-colors">
              <Trash2 size={11}/>Remove
            </button>
          )}
          <input ref={el => { fileRefs.current[slot.key] = el }} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && uploadLogo(slot.key, e.target.files[0])}/>
        </div>
        {url && (
          <input value={url} onChange={e => setUrls(prev => ({ ...prev, [slot.key]: e.target.value }))}
            placeholder="https://…" dir="ltr"
            className="mt-2 w-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 focus:border-blue-400 outline-none transition-colors"/>
        )}
      </div>
    </div>
  )
}

function BannerSection({
  title, hint, list, uploading, onUpload, onRemove, onLinkChange,
}: {
  title: string; hint: string
  list: {url:string;link?:string}[]
  uploading: boolean
  onUpload: (f: File) => void
  onRemove: (url: string) => void
  onLinkChange: (url: string, link: string) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
      <div className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-0.5">{title}</div>
      <div className="text-xs text-gray-400 mb-4">{hint}</div>
      {list.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {list.map((b, i) => (
            <div key={b.url} className="flex items-center gap-2 group">
              <div className="relative flex-shrink-0">
                <img src={b.url} alt={`Slide ${i+1}`} className="w-20 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"/>
                <button onClick={() => onRemove(b.url)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold">✕</button>
                <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/50 text-white rounded px-1">{i+1}</span>
              </div>
              <input defaultValue={b.link || ''} onBlur={e => onLinkChange(b.url, e.target.value)}
                placeholder="Link URL (optional)"
                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-red-400"/>
            </div>
          ))}
        </div>
      )}
      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        {uploading
          ? <div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"/>
          : <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">📁 Add Slide</span>
        }
        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}/>
      </label>
    </div>
  )
}

// ── Icon slots config ──────────────────────────────────────────────────────────
const ICON_SLOTS = [
  { key: 'icon_shop',       label: 'Shop',           hint: 'Icon for the shop/store section' },
  { key: 'icon_orders',     label: 'My Orders',      hint: 'Icon for the orders page'        },
  { key: 'icon_tickets',    label: 'Support',        hint: 'Icon for help desk / tickets'    },
  { key: 'icon_profile',    label: 'Profile',        hint: 'Icon for member profile'         },
  { key: 'icon_chat',       label: 'Live Chat',      hint: 'Icon for live chat section'      },
  { key: 'icon_blogs',      label: 'Blogs',          hint: 'Icon for blog articles section'  },
  { key: 'icon_landing_hero',    label: 'Landing – Hero',     hint: 'Hero section icon/graphic for landing page' },
  { key: 'icon_landing_features',label: 'Landing – Features', hint: 'Features section icon for landing page'    },
]

function IconSlot({
  ic, iconSettings, setIconSettings, iconUploading, uploadIcon, iconFileRefs,
}: {
  ic: typeof ICON_SLOTS[number]
  iconSettings: Record<string,string>
  setIconSettings: (fn: (p: Record<string,string>) => Record<string,string>) => void
  iconUploading: string|null
  uploadIcon: (key: string, file: File) => void
  iconFileRefs: React.MutableRefObject<Record<string,HTMLInputElement|null>>
}) {
  const url  = iconSettings[ic.key] || ''
  const busy = iconUploading === ic.key
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
        {url ? <img src={url} alt={ic.label} className="w-full h-full object-contain p-1"/> : <ImageIcon size={14} className="text-gray-400"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{ic.label}</div>
        <div className="text-[11px] text-gray-400">{ic.hint}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => iconFileRefs.current[ic.key]?.click()} disabled={busy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-300 text-xs font-semibold transition-colors">
          {busy ? <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"/> : <Upload size={11}/>}
          {busy ? 'Uploading' : 'Upload'}
        </button>
        {url && (
          <button onClick={() => setIconSettings(prev => ({ ...prev, [ic.key]: '' }))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={12}/>
          </button>
        )}
        <input ref={el => { iconFileRefs.current[ic.key] = el }} type="file" accept="image/*,image/svg+xml" className="hidden"
          onChange={e => e.target.files?.[0] && uploadIcon(ic.key, e.target.files[0])}/>
      </div>
    </div>
  )
}
