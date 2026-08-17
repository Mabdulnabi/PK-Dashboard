'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { ShoppingCart, Zap } from 'lucide-react'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'
import Link from 'next/link'

interface Tool {
  id: string; name: string; description: string; description_ar?: string
  image_url?: string; price_egp: number; price_usd?: number
  duration_label: string; category_slug: string; category_id?: string
  is_out_of_stock: boolean; landing_blocks?: any[]
}
interface Category {
  id: string; name: string; name_ar?: string; slug: string
  color: string; icon: string; image_url?: string; image_url_ar?: string; sort_order: number
}
interface Section { title_en: string; title_ar: string; tool_ids: string[] }

/* ── small product card (horizontal scroll) ─────────────────────── */
function MiniCard({ tool, lang, formatPrice, usdRate }: {
  tool: Tool; lang: string; formatPrice: (n:number,r:number)=>string; usdRate: number
}) {
  const isRtl = lang === 'ar'
  const accent = tool.category_slug === 'private' ? '#8b5cf6' : '#d99401'
  const price  = formatPrice(tool.price_egp, usdRate)
  return (
    <div className="flex-shrink-0 w-44 sm:w-52 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="h-0.5 w-full" style={{background:`linear-gradient(90deg,${accent},${accent}88)`}}/>
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start gap-2.5 mb-2">
          <div className="w-10 h-10 flex-shrink-0 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            {tool.image_url
              ? <img src={tool.image_url} alt={tool.name} className="w-8 h-8 object-contain"/>
              : <span className="text-xs font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">{tool.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs font-bold" style={{color:accent}}>{price}</span>
              <span className="text-[10px] text-gray-400">/ {tool.duration_label}</span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 flex-1">
          {(isRtl && tool.description_ar) ? tool.description_ar : tool.description}
        </p>
        <Link href={`/u/checkout?tool_id=${tool.id}`}
          className="mt-2.5 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-90"
          style={{background: tool.is_out_of_stock ? '#9ca3af' : accent}}
          onClick={e => tool.is_out_of_stock && e.preventDefault()}>
          {tool.is_out_of_stock
            ? (isRtl ? 'نفذت الكمية' : 'Out of Stock')
            : <><ShoppingCart size={11}/>{isRtl ? 'اشتري الآن' : 'Buy Now'}</>}
        </Link>
      </div>
    </div>
  )
}

/* ── horizontal product row ─────────────────────────────────────── */
function ProductRow({ tools, lang, formatPrice, usdRate }: {
  tools: Tool[]; lang: string; formatPrice: (n:number,r:number)=>string; usdRate: number
}) {
  if (!tools.length) return null
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{scrollbarWidth:'none'}}>
      {tools.map(t => (
        <MiniCard key={t.id} tool={t} lang={lang} formatPrice={formatPrice} usdRate={usdRate}/>
      ))}
    </div>
  )
}

/* ── main page ──────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router              = useRouter()
  const { lang, formatPrice } = useLang()
  const settings            = useSiteSettings()
  const isRtl               = lang === 'ar'
  const usdRate             = parseFloat(settings.usd_to_egp_rate || '50')

  const [banners,     setBanners]     = useState<BannerSlide[] | null>(null)
  const [categories,  setCategories]  = useState<Category[]>([])
  const [tools,       setTools]       = useState<Tool[]>([])
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [sections,    setSections]    = useState<Section[]>([])
  const [catSlugs,    setCatSlugs]    = useState<Record<string,string>>({}) // categoryId → 'shared'|'private'|'bundle'
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/member/shop').then(r => r.json()),
      fetch('/api/admin/ui-settings').then(r => r.json()).catch(() => ({ settings: {} })),
      fetch('/api/member/categories').then(r => r.json()).catch(() => ({ categories: [] })),
    ]).then(([shopData, uiData, catData]) => {
      const allTools: Tool[] = shopData.tools || []
      setTools(allTools)

      // build categoryId → category_slug map
      const slugMap: Record<string, string> = {}
      allTools.forEach(t => { if (t.category_id) slugMap[t.category_id] = t.category_slug })
      setCatSlugs(slugMap)

      const ui = uiData.settings as Record<string, string>

      // banners
      let parsedBanners: BannerSlide[] = []
      try {
        const raw = JSON.parse(ui?.dashboard_banners || '[]')
        parsedBanners = raw.map((s: any) => typeof s === 'string' ? { url: s } : s)
      } catch {}
      if (!parsedBanners.length && ui?.dashboard_banner_url) parsedBanners = [{ url: ui.dashboard_banner_url }]
      setBanners(parsedBanners)

      // featured IDs
      try { setFeaturedIds(JSON.parse(ui?.dashboard_featured_ids || '[]')) } catch {}

      // announcement sections
      try { setSections(JSON.parse(ui?.dashboard_sections || '[]')) } catch {}

      // categories marquee (only those with images)
      const usedCatIds = new Set(allTools.map(t => t.category_id).filter(Boolean))
      const cats: Category[] = (catData.categories || [])
        .filter((c: Category) => usedCatIds.has(c.id) && c.image_url)
        .filter((c: Category, i: number, arr: Category[]) =>
          arr.findIndex(x => x.name.toLowerCase().trim() === c.name.toLowerCase().trim()) === i)
        .sort((a: Category, b: Category) => a.sort_order - b.sort_order)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  const toolById = (id: string) => tools.find(t => t.id === id)

  // category → store tab
  const catTab = (cat: Category) => {
    const slug = catSlugs[cat.id] || 'shared'
    return slug === 'private' ? 'private' : slug === 'bundle' ? 'bundle' : 'shared'
  }

  const featuredTools = featuredIds.map(id => toolById(id)).filter(Boolean) as Tool[]

  const marqueeCount = categories.length
    ? Math.max(2, Math.ceil(12 / categories.length)) % 2 === 0
      ? Math.max(2, Math.ceil(12 / categories.length))
      : Math.max(2, Math.ceil(12 / categories.length)) + 1
    : 0

  return (
    <div className="p-3 md:p-5" dir={isRtl ? 'rtl' : 'ltr'}>

      <style>{`
        @keyframes marquee-ltr { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes marquee-rtl { 0%{transform:translateX(0)} 100%{transform:translateX(50%)}  }
        .mq-track     { display:flex; width:max-content; animation: marquee-ltr var(--mq-dur,20s) linear infinite; }
        .mq-track-rtl { display:flex; width:max-content; animation: marquee-rtl var(--mq-dur,20s) linear infinite; }
        .mq-wrap { overflow:hidden; }
        .mq-wrap:hover .mq-track, .mq-wrap:hover .mq-track-rtl { animation-play-state:paused; }
        @media (max-width:639px)  { .mq-wrap { --mq-dur:8s;  } }
        @media (min-width:640px)  { .mq-wrap { --mq-dur:12s; } }
        @media (min-width:1024px) { .mq-wrap { --mq-dur:18s; } }
      `}</style>

      {/* ── Banner ── */}
      {banners === null ? null : banners.length > 0
        ? <BannerSlider slides={banners} isRtl={isRtl} className="mb-5" maxHeight={260}/>
        : (
          <div className="rounded-2xl mb-5 p-8 text-center relative overflow-hidden"
            style={{background:'linear-gradient(135deg,#0d0f14 0%,#1a1200 50%,#0f3460 100%)'}}>
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{backgroundImage:'radial-gradient(circle at 30% 50%, #d9940140, transparent 60%)'}}/>
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 border border-[#d9940140] bg-[#d9940118]">
                <Zap size={12} style={{color:'#d99401'}}/>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color:'#d99401'}}>Pro Keys</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {isRtl ? 'أدوات احترافية بأسعار مناسبة' : 'Professional Tools at Great Prices'}
              </h1>
              <p className="text-sm text-gray-400">
                {isRtl ? 'اشتراكات مشتركة وحسابات خاصة' : 'Shared subscriptions & private accounts'}
              </p>
            </div>
          </div>
        )
      }

      {/* ── Categories Marquee ── */}
      {!loading && categories.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 mb-4">
            {isRtl ? 'نفسك في ايه؟ 🤔' : "What are you looking for? 🤔"}
          </h2>
          <div className="mq-wrap">
            <div className={isRtl ? 'mq-track-rtl' : 'mq-track'}>
              {Array.from({ length: marqueeCount }, () => categories).flat().map((cat, i) => (
                <button key={`${cat.id}-${i}`}
                  onClick={() => router.push(`/u/store?tab=${catTab(cat)}`)}
                  className="flex-shrink-0 flex flex-col items-center gap-2.5 mx-3 group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-[#d99401] transition-all shadow-md group-hover:shadow-lg group-hover:shadow-[#d9940130]">
                    <img src={(isRtl && cat.image_url_ar) ? cat.image_url_ar : cat.image_url!}
                      alt={isRtl && cat.name_ar ? cat.name_ar : cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"/>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[128px] truncate">
                    {isRtl && cat.name_ar ? cat.name_ar : cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Featured Products ── */}
      {featuredTools.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-gray-800 dark:text-gray-100">
              {isRtl ? '⭐ الأكثر مبيعاً' : '⭐ Top Picks'}
            </h2>
            <Link href="/u/store" className="text-xs font-bold" style={{color:'#d99401'}}>
              {isRtl ? 'عرض الكل ←' : '→ View All'}
            </Link>
          </div>
          <ProductRow tools={featuredTools} lang={lang} formatPrice={formatPrice} usdRate={usdRate}/>
        </div>
      )}

      {/* ── Announcement Sections ── */}
      {sections.map((sec, i) => {
        const sectionTools = sec.tool_ids.map(id => toolById(id)).filter(Boolean) as Tool[]
        if (!sectionTools.length) return null
        return (
          <div key={i} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-gray-800 dark:text-gray-100">
                {isRtl ? sec.title_ar : sec.title_en}
              </h2>
              <Link href="/u/store" className="text-xs font-bold" style={{color:'#d99401'}}>
                {isRtl ? 'عرض الكل ←' : '→ View All'}
              </Link>
            </div>
            <ProductRow tools={sectionTools} lang={lang} formatPrice={formatPrice} usdRate={usdRate}/>
          </div>
        )
      })}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
        </div>
      )}

      {!loading && featuredTools.length === 0 && sections.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">
            {isRtl
              ? 'لا توجد منتجات مميزة حتى الآن — أضفها من لوحة الإدارة'
              : 'No featured products yet — add them from the admin panel'}
          </p>
          <Link href="/u/store" className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-bold" style={{background:'#d99401'}}>
            {isRtl ? 'تصفح المتجر' : 'Browse Store'}
          </Link>
        </div>
      )}
    </div>
  )
}
