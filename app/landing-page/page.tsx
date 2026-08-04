'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import {
  Save, Upload, Plus, Trash2, ChevronUp, ChevronDown, Image as ImageIcon,
  Check, Globe, Star, MessageSquare, BarChart3, Map, HelpCircle, Mail,
  Layers, Eye, GripVertical, AlertTriangle,
} from 'lucide-react'

// ─── types ───────────────────────────────────────────────────────────────────
interface ToolLogo  { id: string; url: string; name: string }
interface Feature   { id: string; icon: string; title_ar: string; title_en: string; desc_ar: string; desc_en: string }
interface Stat      { id: string; number: string; suffix: string; label_ar: string; label_en: string }
interface FaqItem   { id: string; q_ar: string; q_en: string; a_ar: string; a_en: string }
interface Review    { id: string; name: string; location: string; source: string; photo: string; stars: number; text_ar: string; text_en: string }

const uid = () => Math.random().toString(36).slice(2, 8)

const DEFAULT_FEATURES: Feature[] = [
  { id: uid(), icon: '⚡', title_ar: 'تفعيل فوري', title_en: 'Instant Activation', desc_ar: 'الطلب بيوصلك خلال دقائق', desc_en: 'Your order arrives in minutes' },
  { id: uid(), icon: '🎧', title_ar: 'دعم سريع', title_en: 'Fast Support', desc_ar: 'فريق جاهز لخدمتك بأي وقت', desc_en: 'Team ready to serve you anytime' },
  { id: uid(), icon: '✅', title_ar: 'منتجات أصلية', title_en: 'Genuine Products', desc_ar: 'كل الاشتراكات مفعلة رسمياً', desc_en: 'All subscriptions officially activated' },
  { id: uid(), icon: '💳', title_ar: 'دفع آمن وسهل', title_en: 'Safe & Easy Payment', desc_ar: 'خيارات دفع متعددة وآمنة', desc_en: 'Multiple safe payment options' },
]
const DEFAULT_STATS: Stat[] = [
  { id: uid(), number: '1500', suffix: '+', label_ar: 'طلب ناجح', label_en: 'Successful Orders' },
  { id: uid(), number: '500', suffix:  '+', label_ar: 'تقييم إيجابي', label_en: 'Positive Reviews' },
  { id: uid(), number: '1000', suffix: '+', label_ar: 'عميل راضي', label_en: 'Happy Customers' },
]
const DEFAULT_FAQ: FaqItem[] = [
  { id: uid(), q_ar: 'إزاي أطلب من متجر Pro Keys؟', q_en: 'How do I order from Pro Keys?', a_ar: 'أنشئ حساب، اختار المنتج المناسب، وأتم عملية الدفع.', a_en: 'Create an account, choose the right product, and complete payment.' },
  { id: uid(), q_ar: 'إيه هي طرق الدفع المتاحة؟', q_en: 'What payment methods are available?', a_ar: 'نقبل InstaPay، Vodafone Cash، Binance Pay، USDT وغيرها.', a_en: 'We accept InstaPay, Vodafone Cash, Binance Pay, USDT and more.' },
  { id: uid(), q_ar: 'هل الدفع من خلال Pro Keys آمن 100%؟', q_en: 'Is payment through Pro Keys 100% safe?', a_ar: 'نعم، جميع معاملاتنا مؤمّنة بالكامل.', a_en: 'Yes, all our transactions are fully secured.' },
  { id: uid(), q_ar: 'إمتي هيتم تفعيل الطلب بعد الدفع؟', q_en: 'When will my order be activated after payment?', a_ar: 'يتم التفعيل فور تأكيد الدفع، في الغالب خلال دقائق.', a_en: 'Activation happens as soon as payment is confirmed, usually within minutes.' },
]
const DEFAULT_REVIEWS: Review[] = [
  { id: uid(), name: 'Dr. Marwa Helmy', location: 'Egypt', source: 'facebook', photo: '', stars: 5, text_ar: 'اتعاملت مع الصفحة وفعلاً ناس محترمة وبيتابعوا لو في مشكلة بعد الإشتراك', text_en: 'I dealt with the page and they are really professional and follow up on any issues after subscription.' },
  { id: uid(), name: 'Dr. Nada Muhammad Kamel', location: 'Egypt', source: 'facebook', photo: '', stars: 5, text_ar: 'انا اتعاملت معاهم و محترمين جداً و خدوا حسابهم بعد ما عمولي الخدمة و يردوا على اي سؤال', text_en: 'I dealt with them and they are very professional and took their time after doing me the service and answer any question.' },
]

// ─── TABS ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'general',    label: 'عام',         icon: Globe },
  { id: 'hero',       label: 'الهيرو',       icon: Layers },
  { id: 'features',   label: 'المميزات',     icon: Star },
  { id: 'stats',      label: 'الأرقام',      icon: BarChart3 },
  { id: 'map',        label: 'الخريطة',      icon: Map },
  { id: 'faq',        label: 'الأسئلة',      icon: HelpCircle },
  { id: 'reviews',    label: 'التقييمات',    icon: MessageSquare },
  { id: 'newsletter', label: 'النشرة',       icon: Mail },
  { id: 'footer',     label: 'الفوتر',       icon: Globe },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────
function safeParse<T>(val: string | undefined, fallback: T): T {
  if (!val) return fallback
  try { return JSON.parse(val) as T } catch { return fallback }
}

export default function LandingPageAdmin() {
  const [tab,   setTab]   = useState('general')
  const [saving, setSaving] = useState(false)
  const [msg,   setMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // ── General ──
  const [siteName,    setSiteName]    = useState('Pro Keys')
  const [signinUrl,   setSigninUrl]   = useState('/u/login')
  const [headerLogo,  setHeaderLogo]  = useState('')
  const [landingUrl,  setLandingUrl]  = useState('')

  // ── Hero ──
  const [heroBadge,      setHeroBadge]      = useState('🔑 اشتراكاتك الرقمية') // legacy fallback
  const [heroBadgeAr,    setHeroBadgeAr]    = useState('🔑 اشتراكاتك الرقمية')
  const [heroBadgeEn,    setHeroBadgeEn]    = useState('🔑 Your Digital Subscriptions')
  const [heroTitleAr,    setHeroTitleAr]    = useState('اشتراكاتك الرقمية\nبأفضل الأسعار')
  const [heroTitleEn,    setHeroTitleEn]    = useState('Your Digital Subscriptions\nat the Best Prices')
  const [heroSubAr,      setHeroSubAr]      = useState('منصة Pro Keys توفر لك أفضل الاشتراكات الرقمية بأسعار منافسة مع ضمان الجودة والدعم الفوري')
  const [heroSubEn,      setHeroSubEn]      = useState('Pro Keys platform provides you with the best digital subscriptions at competitive prices with quality guarantee and instant support')
  const [heroCtaAr,      setHeroCtaAr]      = useState('تسوق الآن')
  const [heroCtaEn,      setHeroCtaEn]      = useState('Shop Now')
  const [heroCtaUrl,     setHeroCtaUrl]     = useState('/u/shop')
  const [heroCtaSecAr,   setHeroCtaSecAr]   = useState('سجل حساب مجاناً')
  const [heroCtaSecEn,   setHeroCtaSecEn]   = useState('Sign up for free')
  const [heroCtaSecUrl,  setHeroCtaSecUrl]  = useState('/u/login')
  const [toolLogos,      setToolLogos]      = useState<ToolLogo[]>([])
  const [logoSize,       setLogoSize]       = useState(44)

  // ── Features ──
  const [features, setFeatures] = useState<Feature[]>(DEFAULT_FEATURES)
  const [featTitleAr, setFeatTitleAr] = useState('ليه تختار Pro Keys؟')
  const [featTitleEn, setFeatTitleEn] = useState('Why Choose Pro Keys?')

  // ── Stats ──
  const [stats, setStats] = useState<Stat[]>(DEFAULT_STATS)
  const [statsTitleAr, setStatsTitleAr] = useState('أرقامنا في Pro Keys')
  const [statsTitleEn, setStatsTitleEn] = useState('Our Numbers at Pro Keys')
  const [statsSubAr,   setStatsSubAr]   = useState('ثقتكم هي سر نجاحنا، وهذه بعض من إنجازاتنا')
  const [statsSubEn,   setStatsSubEn]   = useState('Your trust is the secret of our success, and these are some of our achievements')

  // ── Map ──
  const [mapImage,    setMapImage]    = useState('')
  const [mapTitleAr,  setMapTitleAr]  = useState('✈️ عملاؤنا وشركاؤنا حول العالم')
  const [mapTitleEn,  setMapTitleEn]  = useState('✈️ Our Clients & Partners Worldwide')
  const [mapSubAr,    setMapSubAr]    = useState('نفخر بتقديم خدماتنا لأكثر من 1000 عميل في مختلف مدن العالم .. ونسعى لغزو المزيد!!')
  const [mapSubEn,    setMapSubEn]    = useState('We are proud to serve over 1000 clients in different cities around the world.. and we aim for more!!')

  // ── FAQ ──
  const [faq,         setFaq]         = useState<FaqItem[]>(DEFAULT_FAQ)
  const [faqTitleAr,  setFaqTitleAr]  = useState('الأسئلة الشائعة')
  const [faqTitleEn,  setFaqTitleEn]  = useState('Frequently Asked Questions')
  const [faqSubAr,    setFaqSubAr]    = useState('مترددد؟ .. كل أسئلتك إجاباتها هنا')
  const [faqSubEn,    setFaqSubEn]    = useState('Hesitant? .. All your questions answered here')

  // ── Reviews ──
  const [reviews,       setReviews]       = useState<Review[]>(DEFAULT_REVIEWS)
  const [revTitleAr,    setRevTitleAr]    = useState('ليه عملاؤنا اختاروا Pro Keys؟')
  const [revTitleEn,    setRevTitleEn]    = useState('Why Our Clients Chose Pro Keys?')

  // ── Newsletter ──
  const [nlTitleAr,     setNlTitleAr]     = useState('فاتك عرض ميتفوتش؟')
  const [nlTitleEn,     setNlTitleEn]     = useState('Missed a deal?')
  const [nlSubAr,       setNlSubAr]       = useState('سيب إيميلك وهيوصلك أحدث العروض وكوبونات الخصم أول بأول 📩')
  const [nlSubEn,       setNlSubEn]       = useState('Leave your email and get the latest offers and discount coupons first 📩')
  const [nlBtnAr,       setNlBtnAr]       = useState('اشترك في نشرتنا الإخبارية')
  const [nlBtnEn,       setNlBtnEn]       = useState('Subscribe to our newsletter')
  const [nlNameAr,      setNlNameAr]      = useState('الاسم')
  const [nlNameEn,      setNlNameEn]      = useState('Name')
  const [nlEmailAr,     setNlEmailAr]     = useState('البريد الالكتروني')
  const [nlEmailEn,     setNlEmailEn]     = useState('Email address')

  // ── Footer ──
  const [footerHtml,    setFooterHtml]    = useState('')

  // ── Upload state ──
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/ui-settings').then(r => r.json()).then(({ settings: s }) => {
      if (!s) return
      setSiteName(s.lp_site_name || 'Pro Keys')
      setSigninUrl(s.lp_signin_url || '/u/login')
      setHeaderLogo(s.lp_header_logo || s.logo_url || '')
      setLandingUrl(s.lp_url || '')

      setHeroBadge(s.lp_hero_badge || '🔑 اشتراكاتك الرقمية')
      setHeroBadgeAr(s.lp_hero_badge_ar || s.lp_hero_badge || '🔑 اشتراكاتك الرقمية')
      setHeroBadgeEn(s.lp_hero_badge_en || '🔑 Your Digital Subscriptions')
      setHeroTitleAr(s.lp_hero_title_ar || 'اشتراكاتك الرقمية\nبأفضل الأسعار')
      setHeroTitleEn(s.lp_hero_title_en || 'Your Digital Subscriptions\nat the Best Prices')
      setHeroSubAr(s.lp_hero_sub_ar || '')
      setHeroSubEn(s.lp_hero_sub_en || '')
      setHeroCtaAr(s.lp_hero_cta_ar || 'تسوق الآن')
      setHeroCtaEn(s.lp_hero_cta_en || 'Shop Now')
      setHeroCtaUrl(s.lp_hero_cta_url || '/u/shop')
      setHeroCtaSecAr(s.lp_hero_cta2_ar || 'سجل حساب مجاناً')
      setHeroCtaSecEn(s.lp_hero_cta2_en || 'Sign up for free')
      setHeroCtaSecUrl(s.lp_hero_cta2_url || '/u/login')
      setToolLogos(safeParse(s.lp_tool_logos, []))
      setLogoSize(Number(s.lp_logo_size) || 44)

      setFeatTitleAr(s.lp_feat_title_ar || 'ليه تختار Pro Keys؟')
      setFeatTitleEn(s.lp_feat_title_en || 'Why Choose Pro Keys?')
      setFeatures(safeParse(s.lp_features, DEFAULT_FEATURES))

      setStatsTitleAr(s.lp_stats_title_ar || 'أرقامنا في Pro Keys')
      setStatsTitleEn(s.lp_stats_title_en || 'Our Numbers at Pro Keys')
      setStatsSubAr(s.lp_stats_sub_ar || '')
      setStatsSubEn(s.lp_stats_sub_en || '')
      setStats(safeParse(s.lp_stats, DEFAULT_STATS))

      setMapImage(s.lp_map_image || '')
      setMapTitleAr(s.lp_map_title_ar || '✈️ عملاؤنا وشركاؤنا حول العالم')
      setMapTitleEn(s.lp_map_title_en || '✈️ Our Clients & Partners Worldwide')
      setMapSubAr(s.lp_map_sub_ar || '')
      setMapSubEn(s.lp_map_sub_en || '')

      setFaqTitleAr(s.lp_faq_title_ar || 'الأسئلة الشائعة')
      setFaqTitleEn(s.lp_faq_title_en || 'FAQ')
      setFaqSubAr(s.lp_faq_sub_ar || 'مترددد؟ .. كل أسئلتك إجاباتها هنا')
      setFaqSubEn(s.lp_faq_sub_en || '')
      setFaq(safeParse(s.lp_faq, DEFAULT_FAQ))

      setRevTitleAr(s.lp_rev_title_ar || 'ليه عملاؤنا اختاروا Pro Keys؟')
      setRevTitleEn(s.lp_rev_title_en || 'Why Our Clients Chose Pro Keys?')
      setReviews(safeParse(s.lp_reviews, DEFAULT_REVIEWS))

      setNlTitleAr(s.lp_nl_title_ar || 'فاتك عرض ميتفوتش؟')
      setNlTitleEn(s.lp_nl_title_en || 'Missed a deal?')
      setNlSubAr(s.lp_nl_sub_ar || '')
      setNlSubEn(s.lp_nl_sub_en || '')
      setNlBtnAr(s.lp_nl_btn_ar || 'اشترك في نشرتنا الإخبارية')
      setNlBtnEn(s.lp_nl_btn_en || 'Subscribe')
      setNlNameAr(s.lp_nl_name_ar || 'الاسم')
      setNlNameEn(s.lp_nl_name_en || 'Name')
      setNlEmailAr(s.lp_nl_email_ar || 'البريد الالكتروني')
      setNlEmailEn(s.lp_nl_email_en || 'Email address')

      setFooterHtml(s.lp_footer_html || '')
      setLoading(false)
    })
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    setSaving(true); setMsg(null)
    const body: Record<string, string> = {
      lp_site_name: siteName, lp_signin_url: signinUrl,
      lp_header_logo: headerLogo, lp_url: landingUrl,
      lp_hero_badge: heroBadge,
      lp_hero_badge_ar: heroBadgeAr,
      lp_hero_badge_en: heroBadgeEn,
      lp_hero_title_ar: heroTitleAr, lp_hero_title_en: heroTitleEn,
      lp_hero_sub_ar: heroSubAr, lp_hero_sub_en: heroSubEn,
      lp_hero_cta_ar: heroCtaAr, lp_hero_cta_en: heroCtaEn, lp_hero_cta_url: heroCtaUrl,
      lp_hero_cta2_ar: heroCtaSecAr, lp_hero_cta2_en: heroCtaSecEn, lp_hero_cta2_url: heroCtaSecUrl,
      lp_tool_logos: JSON.stringify(toolLogos),
      lp_logo_size: String(logoSize),
      lp_feat_title_ar: featTitleAr, lp_feat_title_en: featTitleEn,
      lp_features: JSON.stringify(features),
      lp_stats_title_ar: statsTitleAr, lp_stats_title_en: statsTitleEn,
      lp_stats_sub_ar: statsSubAr, lp_stats_sub_en: statsSubEn,
      lp_stats: JSON.stringify(stats),
      lp_map_image: mapImage, lp_map_title_ar: mapTitleAr, lp_map_title_en: mapTitleEn,
      lp_map_sub_ar: mapSubAr, lp_map_sub_en: mapSubEn,
      lp_faq_title_ar: faqTitleAr, lp_faq_title_en: faqTitleEn,
      lp_faq_sub_ar: faqSubAr, lp_faq_sub_en: faqSubEn,
      lp_faq: JSON.stringify(faq),
      lp_rev_title_ar: revTitleAr, lp_rev_title_en: revTitleEn,
      lp_reviews: JSON.stringify(reviews),
      lp_nl_title_ar: nlTitleAr, lp_nl_title_en: nlTitleEn,
      lp_nl_sub_ar: nlSubAr, lp_nl_sub_en: nlSubEn,
      lp_nl_btn_ar: nlBtnAr, lp_nl_btn_en: nlBtnEn,
      lp_nl_name_ar: nlNameAr, lp_nl_name_en: nlNameEn,
      lp_nl_email_ar: nlEmailAr, lp_nl_email_en: nlEmailEn,
      lp_footer_html: footerHtml,
    }
    const res = await fetch('/api/ui-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setSaving(false)
    setMsg(res.ok ? { type: 'success', text: 'تم الحفظ بنجاح ✓' } : { type: 'error', text: 'حصل خطأ في الحفظ' })
    setTimeout(() => setMsg(null), 3000)
  }

  // ── Upload helper ─────────────────────────────────────────────────────────
  async function uploadFile(slot: string, file: File): Promise<string> {
    setUploading(slot)
    const form = new FormData()
    form.append('file', file); form.append('slot', slot)
    const res  = await fetch('/api/admin/ui-settings/upload', { method: 'POST', body: form })
    const data = await res.json()
    setUploading(null)
    return data.url || ''
  }

  // ── Shared input classes ───────────────────────────────────────────────────
  const inp = "w-full bg-white dark:bg-[#1F2937] text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2.5 border border-gray-200 dark:border-[#374151] focus:border-yellow-500 outline-none transition-colors"
  const ta  = inp + " resize-none"
  const lbl = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5"
  const sec = "space-y-4"

  function BilingualField({ labelAr, labelEn, valueAr, valueEn, onAr, onEn, multiline = false }:
    { labelAr: string; labelEn: string; valueAr: string; valueEn: string; onAr: (v: string) => void; onEn: (v: string) => void; multiline?: boolean }) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>{labelAr} 🇸🇦</label>
          {multiline
            ? <textarea className={ta} rows={3} value={valueAr} onChange={e => onAr(e.target.value)}/>
            : <input className={inp} value={valueAr} onChange={e => onAr(e.target.value)}/>}
        </div>
        <div>
          <label className={lbl}>{labelEn} 🇺🇸</label>
          {multiline
            ? <textarea className={ta} rows={3} value={valueEn} onChange={e => onEn(e.target.value)}/>
            : <input className={inp} value={valueEn} onChange={e => onEn(e.target.value)}/>}
        </div>
      </div>
    )
  }

  function UploadBtn({ slot, onUrl }: { slot: string; onUrl: (url: string) => void }) {
    return (
      <>
        <button onClick={() => fileRefs.current[slot]?.click()}
          disabled={uploading === slot}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
          {uploading === slot ? <div className="w-3 h-3 border border-yellow-500 border-t-transparent rounded-full animate-spin"/> : <Upload size={12}/>}
          رفع صورة
        </button>
        <input type="file" accept="image/*" className="hidden" ref={el => { fileRefs.current[slot] = el }}
          onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFile(slot, f); if (url) onUrl(url); e.target.value = '' }}/>
      </>
    )
  }

  if (loading) return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0D1117]">
      <Sidebar/>
      <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"/></div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0D1117]">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-[#1F2937] flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Landing Page Editor</h1>
            <p className="text-xs text-gray-500 mt-0.5">تحكم في محتوى وتصميم الصفحة الرئيسية</p>
          </div>
          <div className="flex items-center gap-3">
            {msg && (
              <span className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${msg.type === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                {msg.type === 'success' ? <Check size={13}/> : <AlertTriangle size={13}/>} {msg.text}
              </span>
            )}
            <a href="/landing" target="_blank" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Eye size={14}/> معاينة
            </a>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60 transition-all"
              style={{ background: '#d99401' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Save size={14}/>}
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Tab sidebar */}
          <div className="w-44 flex-shrink-0 bg-white dark:bg-[#111827] border-r border-gray-200 dark:border-[#1F2937] overflow-y-auto py-3">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.id ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-r-2 border-yellow-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <Icon size={15}/> {t.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">

              {/* ── GENERAL ── */}
              {tab === 'general' && (
                <div className={sec}>
                  <SectionHeading>الإعدادات العامة</SectionHeading>
                  <Card>
                    <div>
                      <label className={lbl}>اسم الموقع</label>
                      <input className={inp} value={siteName} onChange={e => setSiteName(e.target.value)}/>
                    </div>
                    <div><label className={lbl}>رابط الصفحة (للمعاينة فقط)</label><input className={inp} placeholder="/landing" value={landingUrl} onChange={e => setLandingUrl(e.target.value)}/></div>
                  </Card>

                  <Card title="لوجو الهيدر">
                    <div className="flex items-center gap-4">
                      {headerLogo && <img src={headerLogo} alt="logo" className="h-12 object-contain rounded-lg border border-gray-200 dark:border-gray-700 p-1"/>}
                      <UploadBtn slot="lp_header_logo" onUrl={setHeaderLogo}/>
                      {headerLogo && <button onClick={() => setHeaderLogo('')} className="text-xs text-red-400 hover:text-red-600"><Trash2 size={13}/></button>}
                    </div>
                    {headerLogo && <input className={inp + ' mt-2'} value={headerLogo} onChange={e => setHeaderLogo(e.target.value)} placeholder="أو الصق رابط اللوجو"/>}
                    {!headerLogo && <input className={inp + ' mt-2'} value={headerLogo} onChange={e => setHeaderLogo(e.target.value)} placeholder="أو الصق رابط اللوجو"/>}
                  </Card>
                </div>
              )}

              {/* ── HERO ── */}
              {tab === 'hero' && (
                <div className={sec}>
                  <SectionHeading>قسم الهيرو</SectionHeading>
                  <Card>
                    <BilingualField labelAr="بادج الهيرو (عربي)" labelEn="Hero Badge (English)" valueAr={heroBadgeAr} valueEn={heroBadgeEn} onAr={setHeroBadgeAr} onEn={setHeroBadgeEn}/>
                    <BilingualField labelAr="العنوان الرئيسي" labelEn="Main Title" valueAr={heroTitleAr} valueEn={heroTitleEn} onAr={setHeroTitleAr} onEn={setHeroTitleEn} multiline/>
                    <BilingualField labelAr="النص الفرعي" labelEn="Subtitle" valueAr={heroSubAr} valueEn={heroSubEn} onAr={setHeroSubAr} onEn={setHeroSubEn} multiline/>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className={lbl}>CTA الأساسي عربي</label><input className={inp} value={heroCtaAr} onChange={e => setHeroCtaAr(e.target.value)}/></div>
                      <div><label className={lbl}>CTA الأساسي إنجليزي</label><input className={inp} value={heroCtaEn} onChange={e => setHeroCtaEn(e.target.value)}/></div>
                      <div><label className={lbl}>رابط الـ CTA</label><input className={inp} value={heroCtaUrl} onChange={e => setHeroCtaUrl(e.target.value)}/></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className={lbl}>CTA الثاني عربي</label><input className={inp} value={heroCtaSecAr} onChange={e => setHeroCtaSecAr(e.target.value)}/></div>
                      <div><label className={lbl}>CTA الثاني إنجليزي</label><input className={inp} value={heroCtaSecEn} onChange={e => setHeroCtaSecEn(e.target.value)}/></div>
                      <div><label className={lbl}>رابط الـ CTA الثاني</label><input className={inp} value={heroCtaSecUrl} onChange={e => setHeroCtaSecUrl(e.target.value)}/></div>
                    </div>
                  </Card>

                  <Card title="سلايدر لوجوهات الأدوات">
                    <p className="text-xs text-gray-500 mb-2">صور الأدوات تتحرك تلقائياً في شريط متحرك أسفل الهيرو</p>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-semibold text-gray-500">حجم الصور:</span>
                      <button onClick={() => setLogoSize(s => Math.max(20, s - 4))}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold transition-colors">−</button>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums w-10 text-center">{logoSize}px</span>
                      <button onClick={() => setLogoSize(s => Math.min(300, s + 4))}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold transition-colors">+</button>
                      <div className="flex gap-1 ml-2">
                        {[44,80,120,180,240].map(n=>(
                          <button key={n} onClick={()=>setLogoSize(n)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${logoSize===n?'text-white':'border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            style={logoSize===n?{background:'#d99401'}:{}}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {toolLogos.map((logo, i) => (
                        <div key={logo.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                          {logo.url && <img src={logo.url} alt={logo.name} className="w-10 h-10 object-contain rounded-md border border-gray-200 dark:border-gray-700"/>}
                          <input className={inp + ' flex-1'} placeholder="اسم الأداة" value={logo.name} onChange={e => setToolLogos(prev => prev.map((l, j) => j === i ? { ...l, name: e.target.value } : l))}/>
                          <input className={inp + ' flex-1'} placeholder="رابط الصورة" value={logo.url} onChange={e => setToolLogos(prev => prev.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}/>
                          <UploadBtn slot={`lp_tool_${logo.id}`} onUrl={url => setToolLogos(prev => prev.map((l, j) => j === i ? { ...l, url } : l))}/>
                          <button onClick={() => setToolLogos(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setToolLogos(prev => [...prev, { id: uid(), url: '', name: '' }])}
                      className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg text-sm font-semibold border border-dashed border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors">
                      <Plus size={14}/> إضافة أداة
                    </button>
                  </Card>
                </div>
              )}

              {/* ── FEATURES ── */}
              {tab === 'features' && (
                <div className={sec}>
                  <SectionHeading>قسم المميزات (ليه تختارنا)</SectionHeading>
                  <Card>
                    <BilingualField labelAr="عنوان القسم" labelEn="Section Title" valueAr={featTitleAr} valueEn={featTitleEn} onAr={setFeatTitleAr} onEn={setFeatTitleEn}/>
                  </Card>
                  {features.map((f, i) => (
                    <Card key={f.id}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{f.icon}</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">ميزة {i + 1}</span>
                        </div>
                        <button onClick={() => setFeatures(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div>
                          <label className={lbl}>أيقون (emoji)</label>
                          <input className={inp} value={f.icon} onChange={e => setFeatures(prev => prev.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))}/>
                        </div>
                        <div><label className={lbl}>العنوان عربي</label><input className={inp} value={f.title_ar} onChange={e => setFeatures(prev => prev.map((x, j) => j === i ? { ...x, title_ar: e.target.value } : x))}/></div>
                        <div><label className={lbl}>العنوان إنجليزي</label><input className={inp} value={f.title_en} onChange={e => setFeatures(prev => prev.map((x, j) => j === i ? { ...x, title_en: e.target.value } : x))}/></div>
                        <div className="col-span-4 grid grid-cols-2 gap-3">
                          <div><label className={lbl}>الوصف عربي</label><input className={inp} value={f.desc_ar} onChange={e => setFeatures(prev => prev.map((x, j) => j === i ? { ...x, desc_ar: e.target.value } : x))}/></div>
                          <div><label className={lbl}>الوصف إنجليزي</label><input className={inp} value={f.desc_en} onChange={e => setFeatures(prev => prev.map((x, j) => j === i ? { ...x, desc_en: e.target.value } : x))}/></div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <button onClick={() => setFeatures(prev => [...prev, { id: uid(), icon: '⭐', title_ar: '', title_en: '', desc_ar: '', desc_en: '' }])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-dashed border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors w-full justify-center">
                    <Plus size={14}/> إضافة ميزة
                  </button>
                </div>
              )}

              {/* ── STATS ── */}
              {tab === 'stats' && (
                <div className={sec}>
                  <SectionHeading>قسم الأرقام</SectionHeading>
                  <Card>
                    <BilingualField labelAr="عنوان القسم" labelEn="Section Title" valueAr={statsTitleAr} valueEn={statsTitleEn} onAr={setStatsTitleAr} onEn={setStatsTitleEn}/>
                    <BilingualField labelAr="النص الفرعي" labelEn="Subtitle" valueAr={statsSubAr} valueEn={statsSubEn} onAr={setStatsSubAr} onEn={setStatsSubEn}/>
                  </Card>
                  {stats.map((s, i) => (
                    <Card key={s.id}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">رقم {i + 1}</span>
                        <button onClick={() => setStats(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div><label className={lbl}>الرقم</label><input className={inp} value={s.number} onChange={e => setStats(prev => prev.map((x, j) => j === i ? { ...x, number: e.target.value } : x))}/></div>
                        <div><label className={lbl}>اللاحقة (+ أو %)</label><input className={inp} value={s.suffix} onChange={e => setStats(prev => prev.map((x, j) => j === i ? { ...x, suffix: e.target.value } : x))}/></div>
                        <div><label className={lbl}>التسمية عربي</label><input className={inp} value={s.label_ar} onChange={e => setStats(prev => prev.map((x, j) => j === i ? { ...x, label_ar: e.target.value } : x))}/></div>
                        <div><label className={lbl}>التسمية إنجليزي</label><input className={inp} value={s.label_en} onChange={e => setStats(prev => prev.map((x, j) => j === i ? { ...x, label_en: e.target.value } : x))}/></div>
                      </div>
                    </Card>
                  ))}
                  <button onClick={() => setStats(prev => [...prev, { id: uid(), number: '0', suffix: '+', label_ar: '', label_en: '' }])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-dashed border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors w-full justify-center">
                    <Plus size={14}/> إضافة رقم
                  </button>
                </div>
              )}

              {/* ── MAP ── */}
              {tab === 'map' && (
                <div className={sec}>
                  <SectionHeading>قسم الخريطة</SectionHeading>
                  <Card>
                    <BilingualField labelAr="عنوان القسم" labelEn="Section Title" valueAr={mapTitleAr} valueEn={mapTitleEn} onAr={setMapTitleAr} onEn={setMapTitleEn}/>
                    <BilingualField labelAr="النص الفرعي" labelEn="Subtitle" valueAr={mapSubAr} valueEn={mapSubEn} onAr={setMapSubAr} onEn={setMapSubEn} multiline/>
                  </Card>
                  <Card title="صورة الخريطة">
                    <div className="flex items-center gap-4 mb-3">
                      <UploadBtn slot="lp_map_image" onUrl={setMapImage}/>
                      {mapImage && <button onClick={() => setMapImage('')} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12}/> حذف</button>}
                    </div>
                    <input className={inp} value={mapImage} onChange={e => setMapImage(e.target.value)} placeholder="أو الصق رابط الصورة"/>
                    {mapImage && <img src={mapImage} alt="map" className="mt-3 w-full rounded-xl border border-gray-200 dark:border-gray-700 object-contain max-h-64"/>}
                  </Card>
                </div>
              )}

              {/* ── FAQ ── */}
              {tab === 'faq' && (
                <div className={sec}>
                  <SectionHeading>الأسئلة الشائعة</SectionHeading>
                  <Card>
                    <BilingualField labelAr="عنوان القسم" labelEn="Section Title" valueAr={faqTitleAr} valueEn={faqTitleEn} onAr={setFaqTitleAr} onEn={setFaqTitleEn}/>
                    <BilingualField labelAr="العنوان الفرعي" labelEn="Subtitle" valueAr={faqSubAr} valueEn={faqSubEn} onAr={setFaqSubAr} onEn={setFaqSubEn}/>
                  </Card>
                  {faq.map((item, i) => (
                    <Card key={item.id}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">سؤال {i + 1}</span>
                        <button onClick={() => setFaq(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                      <div className="space-y-3">
                        <BilingualField labelAr="السؤال عربي" labelEn="Question EN" valueAr={item.q_ar} valueEn={item.q_en}
                          onAr={v => setFaq(prev => prev.map((x, j) => j === i ? { ...x, q_ar: v } : x))}
                          onEn={v => setFaq(prev => prev.map((x, j) => j === i ? { ...x, q_en: v } : x))}/>
                        <BilingualField labelAr="الإجابة عربي" labelEn="Answer EN" valueAr={item.a_ar} valueEn={item.a_en} multiline
                          onAr={v => setFaq(prev => prev.map((x, j) => j === i ? { ...x, a_ar: v } : x))}
                          onEn={v => setFaq(prev => prev.map((x, j) => j === i ? { ...x, a_en: v } : x))}/>
                      </div>
                    </Card>
                  ))}
                  <button onClick={() => setFaq(prev => [...prev, { id: uid(), q_ar: '', q_en: '', a_ar: '', a_en: '' }])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-dashed border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors w-full justify-center">
                    <Plus size={14}/> إضافة سؤال
                  </button>
                </div>
              )}

              {/* ── REVIEWS ── */}
              {tab === 'reviews' && (
                <div className={sec}>
                  <SectionHeading>التقييمات</SectionHeading>
                  <Card>
                    <BilingualField labelAr="عنوان القسم" labelEn="Section Title" valueAr={revTitleAr} valueEn={revTitleEn} onAr={setRevTitleAr} onEn={setRevTitleEn}/>
                  </Card>
                  {reviews.map((rev, i) => (
                    <Card key={rev.id}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {rev.photo ? <img src={rev.photo} alt={rev.name} className="w-10 h-10 rounded-full object-cover border-2 border-yellow-400"/> : <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><ImageIcon size={14} className="text-gray-400"/></div>}
                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{rev.name || `تقييم ${i + 1}`}</span>
                        </div>
                        <button onClick={() => setReviews(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div><label className={lbl}>الاسم</label><input className={inp} value={rev.name} onChange={e => setReviews(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}/></div>
                        <div><label className={lbl}>الموقع / البلد</label><input className={inp} value={rev.location} onChange={e => setReviews(prev => prev.map((x, j) => j === i ? { ...x, location: e.target.value } : x))}/></div>
                        <div><label className={lbl}>المصدر (facebook...)</label><input className={inp} value={rev.source} onChange={e => setReviews(prev => prev.map((x, j) => j === i ? { ...x, source: e.target.value } : x))}/></div>
                        <div><label className={lbl}>التقييم (1-5)</label>
                          <select className={inp} value={rev.stars} onChange={e => setReviews(prev => prev.map((x, j) => j === i ? { ...x, stars: Number(e.target.value) } : x))}>
                            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} نجوم</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className={lbl}>صورة الشخص</label>
                          <div className="flex items-center gap-2">
                            <UploadBtn slot={`lp_rev_photo_${rev.id}`} onUrl={url => setReviews(prev => prev.map((x, j) => j === i ? { ...x, photo: url } : x))}/>
                            <input className={inp} placeholder="أو رابط الصورة" value={rev.photo} onChange={e => setReviews(prev => prev.map((x, j) => j === i ? { ...x, photo: e.target.value } : x))}/>
                          </div>
                        </div>
                      </div>
                      <BilingualField labelAr="نص التقييم عربي" labelEn="Review Text EN" valueAr={rev.text_ar} valueEn={rev.text_en} multiline
                        onAr={v => setReviews(prev => prev.map((x, j) => j === i ? { ...x, text_ar: v } : x))}
                        onEn={v => setReviews(prev => prev.map((x, j) => j === i ? { ...x, text_en: v } : x))}/>
                    </Card>
                  ))}
                  <button onClick={() => setReviews(prev => [...prev, { id: uid(), name: '', location: '', source: '', photo: '', stars: 5, text_ar: '', text_en: '' }])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-dashed border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors w-full justify-center">
                    <Plus size={14}/> إضافة تقييم
                  </button>
                </div>
              )}

              {/* ── NEWSLETTER ── */}
              {tab === 'newsletter' && (
                <div className={sec}>
                  <SectionHeading>النشرة الإخبارية (Letterbox)</SectionHeading>
                  <Card>
                    <BilingualField labelAr="العنوان الرئيسي" labelEn="Main Title" valueAr={nlTitleAr} valueEn={nlTitleEn} onAr={setNlTitleAr} onEn={setNlTitleEn}/>
                    <BilingualField labelAr="النص الفرعي" labelEn="Subtitle" valueAr={nlSubAr} valueEn={nlSubEn} onAr={setNlSubAr} onEn={setNlSubEn} multiline/>
                    <BilingualField labelAr="نص الزرار" labelEn="Button Text" valueAr={nlBtnAr} valueEn={nlBtnEn} onAr={setNlBtnAr} onEn={setNlBtnEn}/>
                    <BilingualField labelAr="Placeholder الاسم" labelEn="Name Placeholder" valueAr={nlNameAr} valueEn={nlNameEn} onAr={setNlNameAr} onEn={setNlNameEn}/>
                    <BilingualField labelAr="Placeholder الإيميل" labelEn="Email Placeholder" valueAr={nlEmailAr} valueEn={nlEmailEn} onAr={setNlEmailAr} onEn={setNlEmailEn}/>
                  </Card>
                </div>
              )}

              {/* ── FOOTER ── */}
              {tab === 'footer' && (
                <div className={sec}>
                  <SectionHeading>الفوتر</SectionHeading>
                  <Card>
                    <label className={lbl}>HTML code للفوتر (حقوق النشر + طرق الدفع)</label>
                    <p className="text-xs text-gray-400 mb-2">الكود دا بيتحط مباشرة في الفوتر — ضع هنا كود حقوق النشر وأيقونات طرق الدفع</p>
                    <textarea className={ta + ' font-mono text-xs'} rows={12} value={footerHtml} onChange={e => setFooterHtml(e.target.value)} placeholder={'<!-- ضع كودك هنا -->\n<p>Pro Keys © 2026 — All rights reserved</p>'}/>
                    {footerHtml && (
                      <div className="mt-3">
                        <label className={lbl}>معاينة الفوتر</label>
                        <div className="rounded-xl bg-gray-900 p-4 border border-gray-700" dangerouslySetInnerHTML={{ __html: footerHtml }}/>
                      </div>
                    )}
                  </Card>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">{children}</h2>
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-[#1F2937] p-5 space-y-4">
      {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>}
      {children}
    </div>
  )
}
