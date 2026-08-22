'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import RichEditor from '@/components/ui/RichEditor'
import {
  Upload, Check, Image as ImageIcon, Trash2, Key,
  Image, FileText, Layers, Globe, SlidersHorizontal, AlertCircle,
  Minus, Plus, GripVertical, Timer,
} from 'lucide-react'

// ── Logo slots ────────────────────────────────────────────────────────────────
const LOGO_SLOTS = [
  { key: 'favicon_url',            label: 'Favicon بوابة الأعضاء',        hint: 'أيقونة تاب المتصفح لصفحات الأعضاء (.png / .ico / .svg)',                   section: 'member' },
  { key: 'admin_favicon_url',      label: 'Favicon لوحة الأدمن',           hint: 'أيقونة تاب المتصفح للوحة الإدارة (.png / .ico / .svg)',                     section: 'admin'  },
  { key: 'logo_url',              label: 'اللوجو العام (احتياطي)',        hint: 'يُستخدم fallback في كل المواضع',                                             section: 'member' },
  { key: 'logo_light_url',        label: 'بورتال الأعضاء – وضع نهاري',    hint: 'يظهر في السايدبار في الوضع النهاري',                                        section: 'member' },
  { key: 'logo_dark_url',         label: 'بورتال الأعضاء – وضع ليلي',     hint: 'يظهر في السايدبار في الوضع الليلي',                                         section: 'member' },
  { key: 'member_login_logo_url', label: 'صفحة تسجيل دخول الأعضاء',       hint: 'اللوجو اللي بيظهر في صفحة /u/login',                                        section: 'member' },
  { key: 'invoice_logo',          label: 'لوجو الفاتورة (Invoice)',         hint: 'يظهر على الفاتورة المرسلة للعملاء',                                         section: 'member' },
  { key: 'admin_logo_dark_url',   label: 'لوحة الأدمن – وضع ليلي',         hint: 'يظهر في السايدبار في الوضع الليلي (الافتراضي حالياً)',                      section: 'admin'  },
  { key: 'admin_logo_light_url',  label: 'لوحة الأدمن – وضع نهاري',        hint: 'يظهر في السايدبار في الوضع النهاري',                                        section: 'admin'  },
  { key: 'admin_login_logo_url',  label: 'صفحة تسجيل دخول الأدمن',         hint: 'اللوجو اللي بيظهر في صفحة /auth/login',                                    section: 'admin'  },
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

// ── Icon slots config ──────────────────────────────────────────────────────────
const ICON_SLOTS = [
  // ── Nav icons ──
  { key: 'icon_shop',              group: 'nav', label: 'متجر Pro Keys',        hint: 'أيقونة قسم المتجر في السايدبار'         },
  { key: 'icon_orders',            group: 'nav', label: 'طلباتي',               hint: 'أيقونة صفحة الطلبات'                   },
  { key: 'icon_tickets',           group: 'nav', label: 'تذاكر الدعم',          hint: 'أيقونة صفحة الدعم'                     },
  { key: 'icon_profile',           group: 'nav', label: 'حسابي',                hint: 'أيقونة صفحة الملف الشخصي'              },
  { key: 'icon_chat',              group: 'nav', label: 'Live Chat FAB',        hint: 'أيقونة زرار الدردشة المباشرة العائم'    },
  { key: 'icon_blogs',             group: 'nav', label: 'مقالات',               hint: 'أيقونة قسم المقالات'                   },
  { key: 'icon_wallet',            group: 'nav', label: 'محفظتي',               hint: 'أيقونة صفحة المحفظة'                   },
  { key: 'icon_focus',             group: 'nav', label: 'وضع التركيز',          hint: 'أيقونة وضع التركيز'                    },
  { key: 'icon_tutorials',         group: 'nav', label: 'فيديوهات تعليمية',     hint: 'أيقونة الفيديوهات التعليمية'           },
  { key: 'icon_quick_links',       group: 'nav', label: 'روابط سريعة',          hint: 'أيقونة صفحة الروابط السريعة'           },
  // ── Shop category icons ──
  { key: 'icon_cat_shared',        group: 'shop', label: 'Shared Store',        hint: 'أيقونة تاب الاشتراكات المشتركة (🔗 افتراضي)'  },
  { key: 'icon_cat_private',       group: 'shop', label: 'Private Store',       hint: 'أيقونة تاب الاشتراكات الخاصة (🔒 افتراضي)'  },
  { key: 'icon_cat_bundles',       group: 'shop', label: 'Bundles',             hint: 'أيقونة تاب الباقات (📦 افتراضي)'             },
  // ── Landing page icons ──
  { key: 'icon_landing_hero',      group: 'landing', label: 'Landing – Hero Section',     hint: 'أيقونة/جرافيك قسم الهيرو في الصفحة الرئيسية' },
  { key: 'icon_landing_features',  group: 'landing', label: 'Landing – Features Section', hint: 'أيقونة قسم المميزات في الصفحة الرئيسية'      },
  { key: 'icon_landing_badge',     group: 'landing', label: 'Landing – Hero Badge',       hint: 'الأيقونة بجانب نص الـ badge في الهيرو (🔑 افتراضي)' },
]

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
  const [logoWidth,   setLogoWidth]  = useState(40)
  const [logoHeight,  setLogoHeight] = useState(40)
  const [adminLogoW,  setAdminLogoW] = useState(36)
  const [adminLogoH,  setAdminLogoH] = useState(36)
  const [logoSaving,  setLogoSaving] = useState(false)
  const [uploadingSlot, setUpSlot]   = useState<string|null>(null)
  const fileRefs = useRef<Record<string,HTMLInputElement|null>>({})

  // ── Banners state ──
  const [dashBanners,     setDashBanners]     = useState<{url:string;link?:string}[]>([])
  const [bannerUploading, setBannerUploading] = useState(false)
  const [sharedBanners,   setSharedBanners]   = useState<{url:string;link?:string}[]>([])
  const [sharedUploading, setSharedUploading] = useState(false)
  const [dashInterval,    setDashInterval]    = useState(4)
  const [sharedInterval,  setSharedInterval]  = useState(4)

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

      const u: Record<string,string> = {}
      LOGO_SLOTS.forEach(sl => { u[sl.key] = s[sl.key] || '' })
      setUrls(u)
      setLogoWidth(Number(s.logo_width) || 40)
      setLogoHeight(Number(s.logo_height) || 40)
      setAdminLogoW(Number(s.admin_logo_width) || 36)
      setAdminLogoH(Number(s.admin_logo_height) || 36)

      const parseBanners = (raw: string, fallback: string) => {
        if (!raw && !fallback) return []
        try { const p = JSON.parse(raw || '[]'); return p.map((x: any) => typeof x === 'string' ? { url: x } : x) } catch {}
        return fallback ? [{ url: fallback }] : []
      }
      try {
        const p = JSON.parse(s.dashboard_banners || '[]')
        setDashBanners(p.map((x: any) => typeof x === 'string' ? { url: x } : x))
      } catch { if (s.dashboard_banner_url) setDashBanners([{ url: s.dashboard_banner_url }]) }
      setSharedBanners(parseBanners(s.shared_store_banners, s.shared_store_banner_url))
      setDashInterval(Number(s.dash_banner_interval) || 4)
      setSharedInterval(Number(s.shared_banner_interval) || 4)

      const icons: Record<string,string> = {}
      ICON_SLOTS.forEach(ic => { icons[ic.key] = s[ic.key] || '' })
      setIconSettings(icons)

      setPageSettings(s)
      setPageContent(s[`page_about-us_en`] || '')
      setLoading(false)
    })
  }, [])

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
    const body: Record<string,string|number> = {
      logo_width: logoWidth, logo_height: logoHeight,
      admin_logo_width: adminLogoW, admin_logo_height: adminLogoH,
      ...urls,
    }
    const res = await fetch('/api/ui-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setLogoSaving(false)
    setToast({ msg: res.ok ? 'تم حفظ اللوجوهات ✓' : 'حصل خطأ في الحفظ', type: res.ok ? 'ok' : 'err' })
  }

  // ── Banner helpers ────────────────────────────────────────────────────────
  const saveBanners = useCallback(async (key: string, list: {url:string;link?:string}[], intervalKey?: string, intervalVal?: number) => {
    const body: Record<string,string> = { [key]: JSON.stringify(list) }
    if (intervalKey && intervalVal !== undefined) body[intervalKey] = String(intervalVal)
    await fetch('/api/admin/ui-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
  }, [])

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

  const reorderBanners = (key: string, newList: {url:string;link?:string}[], setList: (v:{url:string;link?:string}[])=>void) => {
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
    const updated = { ...iconSettings, [key]: data.url }
    setIconSettings(updated)
    await fetch('/api/admin/ui-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: data.url }) })
    setToast({ msg: 'تم رفع الأيقونة ✓', type: 'ok' })
  }

  async function removeIcon(key: string) {
    const updated = { ...iconSettings, [key]: '' }
    setIconSettings(updated)
    await fetch('/api/admin/ui-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: '' }) })
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

  // ── Tab config ─────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'logos',   label: 'Logos',       icon: Key               },
    { id: 'banners', label: 'Banners',      icon: Image             },
    { id: 'icons',   label: 'Icons',        icon: SlidersHorizontal },
    { id: 'pages',   label: 'Pages',        icon: FileText          },
    { id: 'landing', label: 'Landing Page', icon: Layers            },
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
                  <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Key size={14} className="text-blue-400"/>
                      <h2 className="font-bold text-sm text-gray-900 dark:text-white">Member Portal Logos</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">اللوجو العام fallback لأي مكان ملوش لوجو خاص.</p>
                    {memberSlots.map(s => (
                      <LogoSlot key={s.key} slot={s} urls={urls} setUrls={setUrls} uploadingSlot={uploadingSlot} uploadLogo={uploadLogo} fileRefs={fileRefs}/>
                    ))}
                    <SizeControls
                      label="Member Logo"
                      width={logoWidth} height={logoHeight}
                      setWidth={setLogoWidth} setHeight={setLogoHeight}
                    />
                  </div>

                  <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <SlidersHorizontal size={14} className="text-purple-400"/>
                      <h2 className="font-bold text-sm text-gray-900 dark:text-white">Admin Dashboard Logos</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">الوضع الليلي هو الافتراضي حالياً.</p>
                    {adminSlots.map(s => (
                      <LogoSlot key={s.key} slot={s} urls={urls} setUrls={setUrls} uploadingSlot={uploadingSlot} uploadLogo={uploadLogo} fileRefs={fileRefs}/>
                    ))}
                    <SizeControls
                      label="Admin Logo"
                      width={adminLogoW} height={adminLogoH}
                      setWidth={setAdminLogoW} setHeight={setAdminLogoH}
                    />
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
                <div className="max-w-5xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <BannerSection
                      title="Dashboard Banner"
                      hint="يظهر في صفحة الداشبورد الرئيسية. 1200×280px."
                      list={dashBanners}
                      uploading={bannerUploading}
                      interval={dashInterval}
                      onIntervalChange={v => { setDashInterval(v); saveBanners('dashboard_banners', dashBanners, 'dash_banner_interval', v) }}
                      onUpload={f => uploadBanner(f, 'dashboard-banner', 'dashboard_banners', dashBanners, setDashBanners, setBannerUploading)}
                      onRemove={url => removeBanner('dashboard_banners', url, dashBanners, setDashBanners)}
                      onLinkChange={(url, link) => updateBannerLink('dashboard_banners', url, link, dashBanners, setDashBanners)}
                      onReorder={newList => reorderBanners('dashboard_banners', newList, setDashBanners)}
                    />
                    <BannerSection
                      title="Shared Store Banner"
                      hint="يظهر في متجر الاشتراكات المشتركة."
                      list={sharedBanners}
                      uploading={sharedUploading}
                      interval={sharedInterval}
                      onIntervalChange={v => { setSharedInterval(v); saveBanners('shared_store_banners', sharedBanners, 'shared_banner_interval', v) }}
                      onUpload={f => uploadBanner(f, 'shared-banner', 'shared_store_banners', sharedBanners, setSharedBanners, setSharedUploading)}
                      onRemove={url => removeBanner('shared_store_banners', url, sharedBanners, setSharedBanners)}
                      onLinkChange={(url, link) => updateBannerLink('shared_store_banners', url, link, sharedBanners, setSharedBanners)}
                      onReorder={newList => reorderBanners('shared_store_banners', newList, setSharedBanners)}
                    />
                  </div>
                </div>
              )}

              {/* ══ ICONS ══ */}
              {tab === 'icons' && (
                <div className="max-w-2xl">
                  <div className="rounded-2xl p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <SlidersHorizontal size={14} className="text-emerald-400"/>
                      <h2 className="font-bold text-sm text-gray-900 dark:text-white">أيقونات بورتال الأعضاء</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-5">ارفع أيقونة مخصصة لكل قسم — تتعرض بدل الأيقونة الافتراضية فوراً للأعضاء.</p>
                    {(['nav','shop','landing'] as const).map(grp => {
                      const slots = ICON_SLOTS.filter(ic => ic.group === grp)
                      const groupLabel = grp === 'nav' ? 'أيقونات السايدبار' : grp === 'shop' ? 'أيقونات المتجر (الفئات)' : 'أيقونات الصفحة الرئيسية'
                      return (
                        <div key={grp} className="mb-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{groupLabel}</p>
                          <div className="space-y-1 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                            {slots.map(ic => (
                              <IconSlot
                                key={ic.key}
                                ic={ic}
                                iconSettings={iconSettings}
                                iconUploading={iconUploading}
                                uploadIcon={uploadIcon}
                                removeIcon={removeIcon}
                                iconFileRefs={iconFileRefs}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
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
                    <p className="text-xs text-gray-500 mb-4">محتوى صفحات السياسات والمعلومات.</p>
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {PAGE_SLUGS.map(slug => (
                        <button key={slug} onClick={() => setActivePageSlug(slug)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activePageSlug===slug?'bg-teal-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`}>
                          {PAGE_LABELS[slug].en}
                        </button>
                      ))}
                    </div>
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
                <div className="-m-6 h-[calc(100vh-110px)]">
                  <iframe
                    src="/landing-page?embedded=1"
                    className="w-full h-full border-0"
                    title="Landing Page Editor"
                  />
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

// ── SizeControls ──────────────────────────────────────────────────────────────
function SizeControls({ label, width, height, setWidth, setHeight }: {
  label: string; width: number; height: number
  setWidth: (v: number) => void; setHeight: (v: number) => void
}) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">{label} Size (px)</p>
      <div className="grid grid-cols-2 gap-4">
        {[{ label: 'Width', val: width, set: setWidth }, { label: 'Height', val: height, set: setHeight }].map(({ label: l, val, set }) => (
          <div key={l}>
            <p className="text-[11px] text-gray-400 mb-1.5">{l}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => set(Math.max(8, val - 2))}
                className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Minus size={11}/>
              </button>
              <span className="w-10 text-center text-sm font-bold text-gray-700 dark:text-gray-200">{val}</span>
              <button onClick={() => set(Math.min(200, val + 2))}
                className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Plus size={11}/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── LogoSlot ──────────────────────────────────────────────────────────────────
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
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
        {url
          ? <img src={url} alt={slot.label} className="w-full h-full object-contain p-1.5"/>
          : <ImageIcon size={18} className="text-gray-400"/>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5">{slot.label}</div>
        <div className="text-xs text-gray-400">{slot.hint}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => fileRefs.current[slot.key]?.click()} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors">
          {busy ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Upload size={11}/>}
          {busy ? 'جاري…' : 'رفع'}
        </button>
        {url && (
          <button onClick={() => setUrls(prev => ({ ...prev, [slot.key]: '' }))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={12}/>
          </button>
        )}
        <input ref={el => { fileRefs.current[slot.key] = el }} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && uploadLogo(slot.key, e.target.files[0])}/>
      </div>
    </div>
  )
}

// ── BannerSection ─────────────────────────────────────────────────────────────
function BannerSection({
  title, hint, list, uploading, interval, onIntervalChange, onUpload, onRemove, onLinkChange, onReorder,
}: {
  title: string; hint: string
  list: {url:string;link?:string}[]
  uploading: boolean
  interval: number
  onIntervalChange: (v: number) => void
  onUpload: (f: File) => void
  onRemove: (url: string) => void
  onLinkChange: (url: string, link: string) => void
  onReorder: (list: {url:string;link?:string}[]) => void
}) {
  const [dragIdx, setDragIdx] = useState<number|null>(null)
  const [overIdx, setOverIdx] = useState<number|null>(null)

  const handleDrop = (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setOverIdx(null); return }
    const next = [...list]
    const [item] = next.splice(dragIdx, 1)
    next.splice(toIdx, 0, item)
    onReorder(next)
    setDragIdx(null); setOverIdx(null)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
      <div className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-0.5">{title}</div>
      <div className="text-xs text-gray-400 mb-3">{hint}</div>

      {/* Slide interval */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <Timer size={12} className="text-gray-400"/>
        <span className="text-xs text-gray-500">Slide interval:</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onIntervalChange(Math.max(1, interval - 1))}
            className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Minus size={10}/>
          </button>
          <span className="w-7 text-center text-xs font-bold text-gray-700 dark:text-gray-200">{interval}s</span>
          <button onClick={() => onIntervalChange(Math.min(30, interval + 1))}
            className="w-6 h-6 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Plus size={10}/>
          </button>
        </div>
      </div>

      {list.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {list.map((b, i) => (
            <div key={b.url}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => { e.preventDefault(); setOverIdx(i) }}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
              className={`flex items-center gap-2 group rounded-lg transition-all ${overIdx===i && dragIdx!==i ? 'ring-2 ring-blue-400 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
              <GripVertical size={14} className="text-gray-300 dark:text-gray-600 cursor-grab flex-shrink-0"/>
              <div className="relative flex-shrink-0">
                <img src={b.url} alt={`Slide ${i+1}`} className="w-20 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"/>
                <button onClick={() => onRemove(b.url)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold">✕</button>
                <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/50 text-white rounded px-1">{i+1}</span>
              </div>
              <input defaultValue={b.link || ''} onBlur={e => onLinkChange(b.url, e.target.value)}
                placeholder="رابط الصورة (اختياري)"
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

// ── IconSlot ──────────────────────────────────────────────────────────────────
function IconSlot({
  ic, iconSettings, iconUploading, uploadIcon, removeIcon, iconFileRefs,
}: {
  ic: typeof ICON_SLOTS[number]
  iconSettings: Record<string,string>
  iconUploading: string|null
  uploadIcon: (key: string, file: File) => void
  removeIcon: (key: string) => void
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
          {busy ? 'جاري' : 'رفع'}
        </button>
        {url && (
          <button onClick={() => removeIcon(ic.key)}
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
