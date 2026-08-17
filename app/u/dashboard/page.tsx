'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { useCart } from '@/lib/cart-context'
import {
  Star, Zap, Lock, Users, ArrowRight, ArrowLeft,
  ShoppingCart, Search, Plus, Minus, Check,
  ChevronLeft, X, ExternalLink, ChevronDown,
} from 'lucide-react'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'
import Link from 'next/link'

interface Tool {
  id: string; name: string; description: string; image_url?: string
  price_egp: number; price_usd?: number; duration_label: string
  rating: number; review_count: number; category_slug: string
  category_id?: string; is_out_of_stock: boolean
  delivery_label?: string; is_active: boolean; created_at?: string
  features?: string[]; details_url?: string
}
interface Category {
  id: string; name: string; name_ar?: string; slug: string
  color: string; icon: string; image_url?: string; sort_order: number
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
const SORTS: { key: SortKey; en: string; ar: string }[] = [
  { key: 'best',      en: 'Top Rated',    ar: 'الأعلى تقييماً' },
  { key: 'cheapest',  en: 'Lowest Price', ar: 'الأقل سعراً'    },
  { key: 'expensive', en: 'Highest Price',ar: 'الأعلى سعراً'   },
  { key: 'newest',    en: 'Newest',       ar: 'الأحدث'         },
]

/* ── Detail Drawer ───────────────────────────────────────────────────────────── */
function ToolDrawer({ tool, onClose, isRtl, t, formatPrice, usdRate, addToCart, removeFromCart, inCart, getQty }:
  { tool: Tool; onClose: () => void; isRtl: boolean
    t: (en: string, ar: string) => string; formatPrice: (p: number, r: number) => string
    usdRate: number; addToCart: any; removeFromCart: any; inCart: (id: string) => boolean; getQty: (id: string) => number }) {

  const isPrivate = tool.category_slug === 'private'
  const accent    = isPrivate ? '#8b5cf6' : '#d99401'
  const added     = inCart(tool.id)
  const [busy, setBusy] = useState(false)

  const handleCart = async () => {
    setBusy(true)
    added ? await removeFromCart(tool.id) : await addToCart(tool.id, 1, tool as any)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>

      {/* panel */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 md:rounded-2xl rounded-t-2xl shadow-2xl">
        {/* close */}
        <button onClick={onClose}
          className="absolute top-3 end-3 z-10 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          <X size={14}/>
        </button>

        {/* Hero */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }}/>
        <div className="p-6">
          {/* header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {tool.image_url
                ? <img src={tool.image_url} alt={tool.name} className="w-12 h-12 object-contain"/>
                : <span className="text-lg font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{tool.name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isPrivate ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'
                }`}>
                  {isPrivate ? <Lock size={9}/> : <Users size={9}/>}
                  {isPrivate ? (isRtl ? 'خاص' : 'Private') : (isRtl ? 'مشترك' : 'Shared')}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                  <Zap size={9} fill="currentColor"/>
                  {tool.delivery_label || (isRtl ? 'فوري' : 'Instant')}
                </span>
              </div>
            </div>
          </div>

          {/* Stars */}
          <div className="mb-4"><Stars rating={tool.rating} count={tool.review_count}/></div>

          {/* Description */}
          {tool.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">{tool.description}</p>
          )}

          {/* Features */}
          {tool.features && tool.features.length > 0 && (
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{t('Features','المميزات')}</h4>
              <ul className="space-y-1.5">
                {tool.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: accent + '20' }}>
                      <Check size={9} style={{ color: accent }}/>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* External link */}
          {tool.details_url && (
            <a href={tool.details_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors hover:opacity-80"
              style={{ borderColor: accent + '40', color: accent, background: accent + '08' }}>
              <ExternalLink size={13}/>
              {isRtl ? 'زيارة الموقع الرسمي' : 'Visit Official Site'}
            </a>
          )}

          {/* Price + actions */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-2xl font-bold" style={{ color: accent }}>{formatPrice(tool.price_egp, usdRate)}</span>
                <span className="text-sm text-gray-400 ms-1">/ {tool.duration_label}</span>
              </div>
            </div>

            {tool.is_out_of_stock ? (
              <div className="text-center text-sm font-bold text-gray-400 py-3 rounded-xl bg-gray-100 dark:bg-gray-800">
                {isRtl ? 'نفد المخزون' : 'Out of Stock'}
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCart} disabled={busy}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl border flex-shrink-0 transition-all ${
                    added ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#d99401]/50 hover:text-[#d99401]'
                  }`}>
                  {busy ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                        : added ? <Check size={15}/> : <ShoppingCart size={15}/>}
                </button>
                <Link href={`/u/checkout?tool_id=${tool.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
                  style={{ background: accent }}>
                  {isRtl ? <ArrowLeft size={14}/> : <ArrowRight size={14}/>}
                  {t('Buy Now', 'اشتري الآن')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const { t, lang, formatPrice } = useLang()
  const settings      = useSiteSettings()
  const { addToCart, removeFromCart, inCart, getQty, updateQty } = useCart()
  const isRtl  = lang === 'ar'
  const usdRate = parseFloat(settings.usd_to_egp_rate || '50')

  const [tools,      setTools]     = useState<Tool[]>([])
  const [loading,    setLoading]   = useState(true)
  const [banners,    setBanners]   = useState<BannerSlide[]>([])
  const [categories, setCategories]= useState<Category[]>([])
  const [activeCat,  setActiveCat] = useState<Category|null>(null)
  const [activeTab,  setActiveTab] = useState<'all'|'shared'|'private'>('all')
  const [q,          setQ]         = useState('')
  const [sort,       setSort]      = useState<SortKey>('best')
  const [qtys,       setQtys]      = useState<Record<string,number>>({})
  const [addingId,   setAddingId]  = useState<string|null>(null)
  const [toast,      setToast]     = useState('')
  const [selected,   setSelected]  = useState<Tool|null>(null)

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
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          setBanners(parsed.map((s: any) => typeof s === 'string' ? { url: s } : s))
        } catch {}
      } else if (ui?.dashboard_banner_url) {
        setBanners([{ url: ui.dashboard_banner_url }])
      }

      const toolCatIds = new Set(allTools.map(tt => tt.category_id).filter(Boolean))
      const cats: Category[] = (catData.categories || [])
        .filter((c: Category) => toolCatIds.has(c.id) && c.image_url)
        .sort((a: Category, b: Category) => a.sort_order - b.sort_order)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  // Open tool from URL param ?tool=id
  useEffect(() => {
    const toolId = searchParams?.get('tool')
    if (toolId && tools.length > 0) {
      const found = tools.find(t => t.id === toolId)
      if (found) setSelected(found)
    }
  }, [searchParams, tools])

  const openDetail = (tool: Tool) => {
    setSelected(tool)
    router.push(`/u/dashboard?tool=${tool.id}`, { scroll: false })
  }
  const closeDetail = () => {
    setSelected(null)
    router.push('/u/dashboard', { scroll: false })
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
    .filter(tt => !activeCat || tt.category_id === activeCat.id)
    .filter(tt => !q || tt.name.toLowerCase().includes(q.toLowerCase()) || tt.description.toLowerCase().includes(q.toLowerCase()))

  const sorted = [...baseList].sort((a, b) => {
    if (sort === 'cheapest')  return a.price_egp - b.price_egp
    if (sort === 'expensive') return b.price_egp - a.price_egp
    if (sort === 'newest')    return new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime()
    return b.rating - a.rating
  })

  const sharedCount  = tools.filter(tt => tt.category_slug === 'shared').length
  const privateCount = tools.filter(tt => tt.category_slug === 'private').length

  return (
    <div className="p-3 md:p-5" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Marquee CSS ── */}
      <style>{`
        @keyframes marquee-ltr { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes marquee-rtl { 0%{transform:translateX(0)} 100%{transform:translateX(50%)} }
        .marquee-track { display:flex; width:max-content; animation: marquee-ltr 22s linear infinite; }
        .marquee-track-rtl { display:flex; width:max-content; animation: marquee-rtl 22s linear infinite; }
        .marquee-wrap { overflow:hidden; }
        .marquee-wrap:hover .marquee-track,
        .marquee-wrap:hover .marquee-track-rtl { animation-play-state:paused; }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ── Banner ── */}
      {banners.length > 0
        ? <BannerSlider slides={banners} isRtl={isRtl} className="mb-5" maxHeight={260}/>
        : !loading && (
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
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">
            {isRtl ? 'نفسك في ايه؟ 🤔' : "What are you looking for? 🤔"}
          </p>
          <div className="marquee-wrap">
            <div className={isRtl ? 'marquee-track-rtl' : 'marquee-track'}>
              {[...categories, ...categories].map((cat, i) => (
                <button key={`${cat.id}-${i}`}
                  onClick={() => { setActiveCat(cat); setQ('') }}
                  className="flex-shrink-0 flex flex-col items-center gap-2 mx-2.5 group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-[#d99401] transition-all shadow-sm">
                    <img src={cat.image_url!} alt={isRtl && cat.name_ar ? cat.name_ar : cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"/>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[96px] truncate">
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

      {/* ── Compact filter row ── */}
      {!loading && (
        <div className="flex items-center gap-2 mb-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5">

          {/* Search */}
          <div className="relative flex-shrink-0" style={{ width: 160 }}>
            <Search size={13} className="absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              style={{ [isRtl ? 'right' : 'left']: 9 }}/>
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder={t('Search…','بحث…')}
              className="w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#d99401]"
              style={{ padding: '6px 8px', [isRtl ? 'paddingRight' : 'paddingLeft']: 28 }}/>
            {q && (
              <button onClick={() => setQ('')}
                className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                style={{ [isRtl ? 'left' : 'right']: 7 }}>
                <X size={11}/>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 flex-shrink-0"/>

          {/* Type tabs — hidden when inside a category */}
          {!activeCat && ([
            { key: 'all',     en: 'All',     ar: 'الكل',   count: tools.length },
            { key: 'shared',  en: 'Shared',  ar: 'مشتركة', count: sharedCount,  Icon: Users },
            { key: 'private', en: 'Private', ar: 'خاصة',   count: privateCount, Icon: Lock  },
          ] as const).map(tab => {
            const Icon   = 'Icon' in tab ? tab.Icon : null
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                  active ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                style={active ? { background: '#d99401' } : {}}>
                {Icon && <Icon size={10}/>}
                {isRtl ? tab.ar : tab.en}
                <span className={`text-[10px] px-1 py-0.5 rounded font-bold ms-0.5 ${active ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                  {tab.count}
                </span>
              </button>
            )
          })}

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 flex-shrink-0"/>

          {/* Sort select */}
          <div className="relative flex-shrink-0 ms-auto flex items-center">
            <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
              className="appearance-none text-xs font-semibold text-gray-600 dark:text-gray-300 bg-transparent outline-none cursor-pointer pe-5 py-1">
              {SORTS.map(s => (
                <option key={s.key} value={s.key}>{isRtl ? s.ar : s.en}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute end-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
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

            return (
              <div key={tool.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">

                <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg,${accent},${accent}88)` }}/>

                <div className="p-4">
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
                  <p className="text-xs text-gray-400 leading-relaxed mb-2 line-clamp-2">{tool.description}</p>
                  <Stars rating={tool.rating} count={tool.review_count}/>
                </div>

                <div className="mx-4 border-t border-gray-100 dark:border-gray-800"/>

                <div className="p-4 pt-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold" style={{ color: accent }}>{formatPrice(tool.price_egp, usdRate)}</span>
                    <span className="text-xs text-gray-400">/ {tool.duration_label}</span>
                  </div>

                  {tool.is_out_of_stock ? (
                    <div className="text-center text-xs font-bold text-gray-400 py-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                      {isRtl ? 'نفد المخزون' : 'Out of Stock'}
                    </div>
                  ) : (<>
                    {/* Qty control — private only */}
                    {isPrivate && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{t('Qty','الكمية')}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setLocalQty(tool.id, qty-1)} disabled={qty<=1}
                            className="w-6 h-6 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">
                            <Minus size={10}/>
                          </button>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-5 text-center">{qty}</span>
                          <button onClick={() => setLocalQty(tool.id, qty+1)}
                            className="w-6 h-6 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                            <Plus size={10}/>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      {/* Details opens drawer */}
                      <button onClick={() => openDetail(tool)}
                        className="flex-shrink-0 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 hover:border-[#d99401]/40 hover:text-[#d99401] transition-all">
                        {t('Details','التفاصيل')}
                      </button>

                      <Link href={`/u/checkout?tool_id=${tool.id}`}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 shadow-sm transition-opacity"
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

      {/* Detail Drawer */}
      {selected && (
        <ToolDrawer
          tool={selected} onClose={closeDetail} isRtl={isRtl} t={t}
          formatPrice={formatPrice} usdRate={usdRate}
          addToCart={addToCart} removeFromCart={removeFromCart}
          inCart={inCart} getQty={getQty}
        />
      )}
    </div>
  )
}
