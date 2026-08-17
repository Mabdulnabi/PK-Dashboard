'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { useCart } from '@/lib/cart-context'
import {
  Star, Zap, Lock, Users, ArrowRight, ArrowLeft,
  ShoppingCart, Search, Plus, Minus, Check, Heart,
  ChevronLeft, X, Globe, TrendingUp, TrendingDown, Clock,
  Info, ChevronDown,
} from 'lucide-react'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'
import ToolLandingPage from '@/app/u/shop/ToolLandingPage'
import Link from 'next/link'

interface Tool {
  id: string; name: string; name_ar?: string; description: string; description_ar?: string; image_url?: string
  price_egp: number; price_usd?: number; duration_label: string
  rating: number; review_count: number; category_slug: string
  category_id?: string; is_out_of_stock: boolean
  delivery_label?: string; is_active: boolean; created_at?: string
  features?: string[]; details_url?: string; details_slug?: string
  video_url?: string; landing_blocks?: any[]
}
interface Category {
  id: string; name: string; name_ar?: string; slug: string
  color: string; icon: string; image_url?: string; image_url_ar?: string; sort_order: number
}

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11}
          fill={i <= Math.round(rating) ? '#F59E0B' : 'none'}
          stroke={i <= Math.round(rating) ? '#F59E0B' : '#9CA3AF'}/>
      ))}
      <span className="text-[11px] text-gray-400 ms-0.5">
        {rating.toFixed(1)} ({count >= 1000 ? `${(count/1000).toFixed(1)}k` : count})
      </span>
    </div>
  )
}

type SortKey = 'best' | 'cheapest' | 'expensive' | 'newest'
const SORTS: { key: SortKey; en: string; ar: string; Icon: React.FC<any> }[] = [
  { key: 'best',      en: 'Top Rated',  ar: 'الأعلى تقييماً', Icon: Star        },
  { key: 'cheapest',  en: 'Cheapest',   ar: 'الأقل سعراً',    Icon: TrendingDown},
  { key: 'expensive', en: 'Priciest',   ar: 'الأعلى سعراً',   Icon: TrendingUp  },
  { key: 'newest',    en: 'Newest',     ar: 'الأحدث',         Icon: Clock       },
]

/* ── Tool Popup (details fallback) ──────────────────────────────────────── */
function ToolPopup({ tool, isRtl, formatPrice, usdRate, onClose, t }: {
  tool: Tool; isRtl: boolean; formatPrice: (n:number,r:number)=>string; usdRate:number
  onClose: ()=>void; t: (en:string,ar:string)=>string
}) {
  const accent = tool.category_slug === 'private' ? '#8b5cf6' : '#d99401'
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()} dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
              {tool.image_url
                ? <img src={tool.image_url} alt={tool.name} className="w-9 h-9 object-contain"/>
                : <span className="text-sm font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">{tool.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold" style={{ color: accent }}>{formatPrice(tool.price_egp, usdRate)}</span>
                <span className="text-xs text-gray-400">/ {tool.duration_label}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0">
            <X size={14}/>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <Stars rating={tool.rating} count={tool.review_count}/>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{tool.description}</p>
          {tool.features && tool.features.length > 0 && (
            <ul className="space-y-1.5">
              {tool.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
          )}
          {tool.details_url && (
            <a href={tool.details_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:underline">
              {t('Official Site →','الموقع الرسمي →')}
            </a>
          )}
        </div>
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
          <Link href={`/u/checkout?tool_id=${tool.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ background: accent }}>
            {isRtl ? <ArrowLeft size={13}/> : <ArrowRight size={13}/>}
            {t('Buy Now','اشتري الآن')}
          </Link>
          <button onClick={onClose}
            className="px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {t('Close','إغلاق')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router        = useRouter()
  const { t, lang, formatPrice } = useLang()
  const settings      = useSiteSettings()
  const { addToCart, removeFromCart, inCart, getQty, toggleFav, isFav } = useCart()
  const isRtl  = lang === 'ar'
  const usdRate = parseFloat(settings.usd_to_egp_rate || '50')

  const [tools,       setTools]      = useState<Tool[]>([])
  const [loading,     setLoading]    = useState(true)
  const [banners,     setBanners]    = useState<BannerSlide[] | null>(null)
  const [categories,  setCategories] = useState<Category[]>([])
  const [catSlugIds,  setCatSlugIds] = useState<Record<string, string[]>>({})
  const [activeCat,   setActiveCat]  = useState<Category|null>(null)
  const [activeTab,  setActiveTab] = useState<'all'|'shared'|'private'>('all')
  const [q,          setQ]         = useState('')
  const [sort,       setSort]      = useState<SortKey>('best')
  const [qtys,       setQtys]      = useState<Record<string,number>>({})
  const [addingId,   setAddingId]  = useState<string|null>(null)
  const [toast,      setToast]     = useState('')
  const [popup,       setPopup]      = useState<Tool|null>(null)
  const [landingTool, setLandingTool]= useState<Tool|null>(null)

  const localQty    = (id: string) => qtys[id] ?? (inCart(id) ? getQty(id) : 1)
  const setLocalQty = (id: string, v: number) => setQtys(p => ({ ...p, [id]: Math.max(1, v) }))
  const showToast   = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  useEffect(() => {
    Promise.all([
      fetch('/api/member/shop').then(r => r.json()),
      fetch('/api/admin/ui-settings').then(r => r.json()).catch(() => ({ settings: {} })),
      fetch('/api/member/categories').then(r => r.json()).catch(() => ({ categories: [] })),
    ]).then(([shopData, uiData, catData]) => {
      const allTools: Tool[] = shopData.tools || []
      setTools(allTools)

      const ui = uiData.settings as Record<string,string>
      const raw = ui?.dashboard_banners
      let parsedBanners: BannerSlide[] = []
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          parsedBanners = parsed.map((s: any) => typeof s === 'string' ? { url: s } : s)
        } catch {}
      } else if (ui?.dashboard_banner_url) {
        parsedBanners = [{ url: ui.dashboard_banner_url }]
      }
      setBanners(parsedBanners)

      const toolCatIds = new Set(allTools.map(tt => tt.category_id).filter(Boolean))

      // build slug → all IDs map for filtering (handles duplicate DB rows with same slug)
      const slugIds: Record<string, string[]> = {}
      ;(catData.categories || []).forEach((c: Category) => {
        if (toolCatIds.has(c.id)) {
          slugIds[c.slug] = [...(slugIds[c.slug] || []), c.id]
        }
      })
      setCatSlugIds(slugIds)

      const cats: Category[] = (catData.categories || [])
        // Step 1: only keep categories that have tools AND have an image
        .filter((c: Category) => toolCatIds.has(c.id) && c.image_url)
        // Step 2: dedup by normalized name (handles same category stored with different slug/ID)
        .filter((c: Category, idx: number, arr: Category[]) =>
          arr.findIndex(x => x.name.toLowerCase().trim() === c.name.toLowerCase().trim()) === idx)
        .sort((a: Category, b: Category) => a.sort_order - b.sort_order)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  const openDetail = (tool: Tool) => {
    if (tool.details_slug) {
      router.push(`/u/${tool.details_slug}`)
    } else if (Array.isArray(tool.landing_blocks) && tool.landing_blocks.length > 0) {
      setLandingTool(tool)
    } else {
      setPopup(tool)
    }
  }

  const handleCart = useCallback(async (tool: Tool) => {
    setAddingId(tool.id)
    if (inCart(tool.id) && tool.category_slug !== 'private') {
      await removeFromCart(tool.id)
      showToast(t('Removed from cart', 'تمت الإزالة'))
    } else {
      const qty = tool.category_slug === 'private' ? localQty(tool.id) : 1
      await addToCart(tool.id, qty, tool as any)
      showToast(t('Added ✓', 'تمت الإضافة ✓'))
    }
    setAddingId(null)
  }, [inCart, localQty, addToCart, removeFromCart, t])

  const baseList = tools
    .filter(tt => activeTab === 'shared' ? tt.category_slug === 'shared' : activeTab === 'private' ? tt.category_slug === 'private' : true)
    .filter(tt => !activeCat || (catSlugIds[activeCat.slug] || [activeCat.id]).includes(tt.category_id!))
    .filter(tt => !q || tt.name.toLowerCase().includes(q.toLowerCase()) || (tt.description||'').toLowerCase().includes(q.toLowerCase()))

  const sorted = [...baseList].sort((a, b) => {
    if (sort === 'cheapest')  return a.price_egp - b.price_egp
    if (sort === 'expensive') return b.price_egp - a.price_egp
    if (sort === 'newest')    return new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime()
    return b.rating - a.rating
  })

  const sharedCount  = tools.filter(tt => tt.category_slug === 'shared').length
  const privateCount = tools.filter(tt => tt.category_slug === 'private').length

  const TYPES = [
    { key: 'all'    , en: 'All'    , ar: 'الكل'  , Icon: Globe, count: tools.length  },
    { key: 'shared' , en: 'Shared' , ar: 'مشترك' , Icon: Users, count: sharedCount   },
    { key: 'private', en: 'Private', ar: 'خاص'   , Icon: Lock , count: privateCount  },
  ] as const

  const activeSortLabel = SORTS.find(s => s.key === sort)!

  if (landingTool) return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <ToolLandingPage tool={landingTool as any} onBack={() => setLandingTool(null)}/>
    </div>
  )

  return (
    <div className="p-3 md:p-5" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Marquee CSS ── */}
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
        .fs-scroll { overflow-x:auto; scrollbar-width:none; }
        .fs-scroll::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ── Banner ── */}
      {banners === null ? null : banners.length > 0
        ? <BannerSlider slides={banners} isRtl={isRtl} className="mb-5" maxHeight={260}/>
        : (
          <div className="rounded-2xl mb-5 p-8 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#0d0f14 0%,#1a1200 50%,#0f3460 100%)' }}>
            <div className="absolute inset-0 opacity-20 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #d9940140, transparent 60%)' }}/>
            <div className="relative">
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

      {/* ── Categories marquee ── */}
      {!loading && !activeCat && categories.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 mb-4">
            {isRtl ? 'نفسك في ايه؟ 🤔' : "What are you looking for? 🤔"}
          </h2>
          <div className="mq-wrap">
            <div className={isRtl ? 'mq-track-rtl' : 'mq-track'}>
              {(()=>{ const n=Math.max(2,Math.ceil(12/categories.length)); const even=n%2===0?n:n+1; return Array.from({length:even},()=>categories).flat() })().map((cat, i) => (
                <button key={`${cat.id}-${i}`}
                  onClick={() => { setActiveCat(cat); setQ('') }}
                  className="flex-shrink-0 flex flex-col items-center gap-2.5 mx-3 group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-[#d99401] transition-all shadow-md group-hover:shadow-lg group-hover:shadow-[#d9940130]">
                    <img src={(isRtl && cat.image_url_ar) ? cat.image_url_ar : cat.image_url!} alt={isRtl && cat.name_ar ? cat.name_ar : cat.name}
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

      {/* ── Active category header ── */}
      {activeCat && (
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => { setActiveCat(null); setQ('') }}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
            {isRtl ? <ArrowRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
          {activeCat.image_url && <img src={activeCat.image_url} alt="" className="w-8 h-8 rounded-xl object-cover"/>}
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {isRtl && activeCat.name_ar ? activeCat.name_ar : activeCat.name}
            </h2>
            <p className="text-[11px] text-gray-400">{sorted.length} {t('tools','أداة')}</p>
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      {!loading && (
        <div className="mb-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-2.5 space-y-2">

          {/* Mobile: search full width */}
          <div className="md:hidden relative">
            <Search size={13} className="absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              style={{ [isRtl ? 'right' : 'left']: 10 }}/>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder={t('Search tools…','ابحث عن أداة…')}
              className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#d99401] transition-all"
              style={{ padding: '7px 8px', [isRtl ? 'paddingRight' : 'paddingLeft']: 30 }}/>
            {q && (
              <button onClick={() => setQ('')}
                className="absolute top-1/2 -translate-y-1/2 text-gray-400"
                style={{ [isRtl ? 'left' : 'right']: 8 }}>
                <X size={11}/>
              </button>
            )}
          </div>

          {/* Mobile row: type buttons + sort dropdown */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Type buttons — text labels on mobile */}
            <div className="flex items-center gap-1 fs-scroll flex-1">
              <div className="flex gap-1 min-w-max">
                {TYPES.map(tab => {
                  const TIcon  = tab.Icon
                  const active = activeTab === tab.key
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 whitespace-nowrap ${
                        active ? 'text-white' : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                      }`}
                      style={active ? { background: '#d99401' } : {}}>
                      <TIcon size={11}/>
                      {isRtl ? tab.ar : tab.en}
                      <span className={`text-[10px] px-1 rounded font-bold ${active ? 'bg-white/25 text-white' : 'text-gray-400'}`}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Sort — dropdown on mobile */}
            <div className="relative flex-shrink-0">
              <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
                className="appearance-none text-xs font-semibold ps-2.5 pe-7 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none cursor-pointer">
                {SORTS.map(s => {
                  const icon = s.key==='best' ? '⭐' : s.key==='cheapest' ? '📉' : s.key==='expensive' ? '📈' : '🕐'
                  return <option key={s.key} value={s.key}>{icon} {isRtl ? s.ar : s.en}</option>
                })}
              </select>
              <ChevronDown size={11} className="absolute top-1/2 -translate-y-1/2 end-2 text-gray-400 pointer-events-none"/>
            </div>
          </div>

          {/* Desktop: single row */}
          <div className="hidden md:flex items-center gap-2">
            {/* Search — grows to fill space (expands further when activeCat hides type buttons) */}
            <div className="relative flex-1 min-w-[120px]">
              <Search size={13} className="absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                style={{ [isRtl ? 'right' : 'left']: 9 }}/>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder={t('Search…','بحث…')}
                className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#d99401] transition-all"
                style={{ padding: '6px 8px', [isRtl ? 'paddingRight' : 'paddingLeft']: 28 }}/>
              {q && (
                <button onClick={() => setQ('')}
                  className="absolute top-1/2 -translate-y-1/2 text-gray-400"
                  style={{ [isRtl ? 'left' : 'right']: 7 }}>
                  <X size={11}/>
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 flex-shrink-0"/>

            {/* Type buttons */}
            {!activeCat && TYPES.map(tab => {
              const Icon   = tab.Icon
              const active = activeTab === tab.key
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 whitespace-nowrap border ${
                    active ? 'border-[#d99401] text-[#b37a00]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={active ? { background: '#d9940118' } : {}}>
                  <Icon size={12}/>
                  {isRtl ? tab.ar : tab.en}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${active ? 'bg-[#d99401] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 flex-shrink-0"/>

            {/* Sort buttons */}
            {SORTS.map(s => {
              const SIcon  = s.Icon
              const active = sort === s.key
              return (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap border ${
                    active ? 'border-[#6366f1] text-[#6366f1]' : 'border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  style={active ? { background: '#6366f110' } : {}}>
                  <SIcon size={12}/>
                  {isRtl ? s.ar : s.en}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#d99401', borderTopColor: 'transparent' }}/>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map(tool => {
            const isPrivate = tool.category_slug === 'private'
            const accent    = isPrivate ? '#8b5cf6' : '#d99401'
            const added     = inCart(tool.id)
            const busy      = addingId === tool.id
            const qty       = localQty(tool.id)
            const faved     = isFav(tool.id)

            return (
              <div key={tool.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

                <div className="h-0.5 w-full flex-shrink-0" style={{ background: `linear-gradient(90deg,${accent},${accent}88)` }}/>

                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {tool.image_url
                        ? <img src={tool.image_url} alt={tool.name} className="w-8 h-8 object-contain"/>
                        : <span className="text-xs font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPrivate ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'
                      }`}>
                        {isPrivate ? <Lock size={9}/> : <Users size={9}/>}
                        {isPrivate ? (isRtl?'خاص':'Private') : (isRtl?'مشترك':'Shared')}
                      </span>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                        <Zap size={9} fill="currentColor"/>
                        {tool.delivery_label || (isRtl?'فوري':'Instant')}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">{tool.name}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 min-h-[2.5rem]">{(isRtl && tool.description_ar) ? tool.description_ar : tool.description}</p>
                </div>

                <div className="px-4 pb-3">
                  <Stars rating={tool.rating} count={tool.review_count}/>
                </div>

                <div className="mx-4 border-t border-gray-100 dark:border-gray-800"/>

                <div className="p-4 pt-3 mt-auto space-y-2">
                  {/* Price + duration — tight/adjacent */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold" style={{ color: accent }}>{formatPrice(tool.price_egp, usdRate)}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">/ {tool.duration_label}</span>
                  </div>

                  {tool.is_out_of_stock ? (
                    <div className="text-center text-xs font-bold text-gray-400 py-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                      {isRtl ? 'نفد المخزون' : 'Out of Stock'}
                    </div>
                  ) : (<>
                    {/* Private: Details + Qty row */}
                    {isPrivate && (
                      <div className="flex items-center justify-between gap-2">
                        <button onClick={() => openDetail(tool)}
                          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#8b5cf6]/50 hover:text-[#8b5cf6] transition-all flex-shrink-0">
                          <Info size={11}/>
                          {t('Details','التفاصيل')}
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setLocalQty(tool.id, qty-1)} disabled={qty<=1}
                            className="w-6 h-6 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                            <Minus size={10}/>
                          </button>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-5 text-center">{qty}</span>
                          <button onClick={() => setLocalQty(tool.id, qty+1)}
                            className="w-6 h-6 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Plus size={10}/>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Shared: Details button */}
                    {!isPrivate && (
                      <button onClick={() => openDetail(tool)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#d99401]/50 hover:text-[#d99401] transition-all">
                        <Info size={11}/>
                        {t('Details','التفاصيل')}
                      </button>
                    )}

                    {/* Action row: Fav | Buy Now | Cart */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleFav(tool.id, tool as any)}
                        className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors"
                        style={faved
                          ? { background: '#fee2e2', borderColor: '#fca5a5', color: '#ef4444' }
                          : { borderColor: '#e5e7eb', color: '#9ca3af' }}>
                        <Heart size={13} fill={faved ? 'currentColor' : 'none'}/>
                      </button>

                      <Link href={`/u/checkout?tool_id=${tool.id}`}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-white text-xs font-bold hover:opacity-90 shadow-sm transition-opacity"
                        style={{ background: accent }}>
                        {isRtl ? <ArrowLeft size={11}/> : <ArrowRight size={11}/>}
                        {t('Buy Now','اشتري الآن')}
                      </Link>

                      <button onClick={() => handleCart(tool)} disabled={busy}
                        className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border transition-all ${
                          added ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#d99401]/50 hover:text-[#d99401]'
                        }`}>
                        {busy ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                               : added ? <Check size={13}/> : <ShoppingCart size={13}/>}
                      </button>
                    </div>
                  </>)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="text-center py-20 text-gray-400 text-sm">
          {q ? (isRtl ? `لا نتائج لـ "${q}"` : `No results for "${q}"`) : (isRtl ? 'لا توجد أدوات' : 'No tools')}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white pointer-events-none"
          style={{ background: '#d99401' }}>
          {toast}
        </div>
      )}

      {/* Tool popup — simple (no landing_blocks) */}
      {popup && (
        <ToolPopup
          tool={popup}
          isRtl={isRtl}
          formatPrice={formatPrice}
          usdRate={usdRate}
          onClose={() => setPopup(null)}
          t={t}
        />
      )}

    </div>
  )
}
