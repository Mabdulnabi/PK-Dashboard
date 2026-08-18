'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { useCart } from '@/lib/cart-context'
import { ShoppingCart, Heart, Plus, Minus, Check, Star, Zap, ShoppingBag, Globe, Lock, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'
import Link from 'next/link'

interface Tool {
  id: string; name: string; description: string; description_ar?: string
  image_url?: string; price_egp: number; price_usd?: number
  duration_label: string; category_slug: string; category_id?: string
  is_out_of_stock: boolean; landing_blocks?: any[]
  rating: number; review_count: number; sales_count?: number
  delivery_label?: string
}
interface Category {
  id: string; name: string; name_ar?: string; slug: string
  color: string; icon: string; image_url?: string; image_url_ar?: string; sort_order: number
}
interface Section { title_en: string; title_ar: string; subtitle_en?: string; subtitle_ar?: string; emoji?: string; tool_ids: string[] }

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11}
          fill={i <= Math.round(rating) ? '#F59E0B' : 'none'}
          stroke={i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB'}/>
      ))}
      <span className="text-[10px] text-gray-400 ms-1 font-medium">
        {rating.toFixed(1)} ({count >= 1000 ? `${(count/1000).toFixed(1)}k` : count})
      </span>
    </div>
  )
}

/* ── Top Pick Card — large, no cart controls, Buy Now → checkout ─── */
function TopPickCard({ tool, lang, formatPrice, usdRate }: {
  tool: Tool; lang: string; formatPrice: (n:number,r:number)=>string; usdRate: number
}) {
  const isRtl  = lang === 'ar'
  const accent = tool.category_slug === 'private' ? '#8b5cf6' : tool.category_slug === 'bundle' ? '#f59e0b' : '#d99401'
  const price  = formatPrice(tool.price_egp, usdRate)
  const sales  = tool.sales_count || 0
  const typeLabel = tool.category_slug === 'private'
    ? (isRtl ? 'خاص' : 'Private')
    : tool.category_slug === 'bundle'
    ? (isRtl ? 'حزمة' : 'Bundle')
    : (isRtl ? 'مشترك' : 'Shared')
  return (
    <div className="relative glass-card rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="h-1 w-full" style={{background:`linear-gradient(90deg,${accent},${accent}88)`}}/>
      <div className="p-5 flex-1 flex flex-col">
        {/* Header row */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
            {tool.image_url
              ? <img src={tool.image_url} alt={tool.name} className="w-14 h-14 object-contain"/>
              : <span className="text-3xl font-bold text-gray-300">{tool.name.slice(0,2)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight mb-2 line-clamp-2">{tool.name}</h3>
            <Stars rating={tool.rating} count={tool.review_count}/>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full text-white"
                style={{background: accent}}>
                {tool.category_slug === 'private' ? <Lock size={9} strokeWidth={2.5}/> : tool.category_slug === 'bundle' ? <Package size={9} strokeWidth={2.5}/> : <Globe size={9} strokeWidth={2.5}/>}
                {typeLabel}
              </div>
              {sales > 0 && (
                <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <ShoppingCart size={9} strokeWidth={2.5}/>{sales.toLocaleString()} {isRtl ? 'مبيعة' : 'sold'}
                </div>
              )}
            </div>
          </div>
          <div className={`text-end flex-shrink-0`}>
            <div className="text-xl font-extrabold leading-tight" style={{color: accent}}>{price}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">/ {tool.duration_label}</div>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 flex-1 mb-5">
          {(isRtl && tool.description_ar) ? tool.description_ar : tool.description}
        </p>

        {tool.is_out_of_stock ? (
          <div className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm font-bold text-center">
            {isRtl ? 'نفذت الكمية' : 'Out of Stock'}
          </div>
        ) : (
          <Link href={`/u/checkout?tool_id=${tool.id}`}
            className="w-full py-3 rounded-xl text-white text-sm font-bold text-center flex items-center justify-center gap-2 transition-opacity hover:opacity-90 shadow-sm"
            style={{background: accent}}>
            <ShoppingBag size={14} className="text-white"/>{isRtl ? 'اشتري الآن' : 'Buy Now'}
          </Link>
        )}
      </div>
    </div>
  )
}

/* ── Section Card — same size but with qty / fav / cart controls ─── */
function SectionCard({ tool, lang, formatPrice, usdRate }: {
  tool: Tool; lang: string; formatPrice: (n:number,r:number)=>string; usdRate: number
}) {
  const isRtl  = lang === 'ar'
  const accent = tool.category_slug === 'private' ? '#8b5cf6' : tool.category_slug === 'bundle' ? '#f59e0b' : '#d99401'
  const price  = formatPrice(tool.price_egp, usdRate)
  const sales  = tool.sales_count || 0
  const typeLabel = tool.category_slug === 'private'
    ? (isRtl ? 'خاص' : 'Private')
    : tool.category_slug === 'bundle'
    ? (isRtl ? 'حزمة' : 'Bundle')
    : (isRtl ? 'مشترك' : 'Shared')
  const { addToCart, removeFromCart, inCart, getQty, toggleFav, isFav } = useCart()
  const [qty, setQty] = useState(1)
  const [toast, setToast] = useState('')

  const faved = isFav(tool.id)
  const cartted = inCart(tool.id)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const handleCart = async () => {
    if (cartted) { removeFromCart(tool.id); showToast(isRtl ? 'تمت الإزالة' : 'Removed') }
    else { await addToCart(tool.id, qty, tool as any); showToast(isRtl ? 'أضيف للسلة ✓' : 'Added ✓') }
  }

  return (
    <div className="relative glass-card rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {toast && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-xl text-xs font-bold text-white pointer-events-none whitespace-nowrap"
          style={{background: accent}}>{toast}</div>
      )}
      <div className="h-1 w-full" style={{background:`linear-gradient(90deg,${accent},${accent}88)`}}/>
      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
            {tool.image_url
              ? <img src={tool.image_url} alt={tool.name} className="w-14 h-14 object-contain"/>
              : <span className="text-3xl font-bold text-gray-300">{tool.name.slice(0,2)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight mb-2 line-clamp-2">{tool.name}</h3>
            <Stars rating={tool.rating} count={tool.review_count}/>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full text-white"
                style={{background: accent}}>
                {tool.category_slug === 'private' ? <Lock size={9} strokeWidth={2.5}/> : tool.category_slug === 'bundle' ? <Package size={9} strokeWidth={2.5}/> : <Globe size={9} strokeWidth={2.5}/>}
                {typeLabel}
              </div>
              {sales > 0 && (
                <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-white/40 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                  <ShoppingCart size={9} strokeWidth={2.5}/>{sales.toLocaleString()} {isRtl ? 'مبيعة' : 'sold'}
                </div>
              )}
            </div>
          </div>
          <div className="text-end flex-shrink-0">
            <div className="text-xl font-extrabold leading-tight" style={{color: accent}}>{price}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">/ {tool.duration_label}</div>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 flex-1 mb-5">
          {(isRtl && tool.description_ar) ? tool.description_ar : tool.description}
        </p>

        {tool.is_out_of_stock ? (
          <div className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm font-bold text-center">
            {isRtl ? 'نفذت الكمية' : 'Out of Stock'}
          </div>
        ) : (
          <div className="space-y-2" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Qty */}
            <div className="flex items-center justify-between bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl px-3 py-2">
              <span className="text-xs font-semibold text-gray-500">{isRtl ? 'الكمية' : 'Qty'}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => Math.max(1, q-1))} disabled={qty <= 1}
                  className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  <Minus size={10}/>
                </button>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 w-5 text-center">{qty}</span>
                <button onClick={() => setQty(q => q+1)}
                  className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  <Plus size={10}/>
                </button>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => toggleFav(tool.id, tool as any)}
                className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors"
                style={faved ? {background:'#fee2e2',borderColor:'#fca5a5',color:'#ef4444'} : {borderColor:'#e5e7eb',color:'#9ca3af'}}>
                <Heart size={13} fill={faved ? 'currentColor' : 'none'}/>
              </button>
              <Link href={`/u/checkout?tool_id=${tool.id}`}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                style={{background: accent}}>
                <ShoppingBag size={13} className="text-white"/>{isRtl ? 'اشتري الآن' : 'Buy Now'}
              </Link>
              <button onClick={handleCart}
                className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-all"
                style={cartted
                  ? {background:'#10b98120',borderColor:'#10b981',color:'#10b981'}
                  : {borderColor:'#e5e7eb',color:'#6b7280'}}>
                {cartted ? <Check size={13}/> : <Plus size={13}/>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
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
  const [catSlugs,    setCatSlugs]    = useState<Record<string,string>>({})
  const [loading,     setLoading]     = useState(true)
  const catScrollRef = useRef<HTMLDivElement>(null)

  const scrollCats = (dir: 'left' | 'right') => {
    const el = catScrollRef.current
    if (!el) return
    const amount = 300
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/member/shop').then(r => r.json()),
      fetch('/api/ui-settings').then(r => r.json()).catch(() => ({ settings: {} })),
      fetch('/api/member/categories').then(r => r.json()).catch(() => ({ categories: [] })),
    ]).then(([shopData, uiData, catData]) => {
      const allTools: Tool[] = shopData.tools || []
      setTools(allTools)

      const slugMap: Record<string, string> = {}
      allTools.forEach(t => { if (t.category_id) slugMap[t.category_id] = t.category_slug })
      setCatSlugs(slugMap)

      const ui = uiData.settings as Record<string, string>

      let parsedBanners: BannerSlide[] = []
      try {
        const raw = JSON.parse(ui?.dashboard_banners || '[]')
        parsedBanners = raw.map((s: any) => typeof s === 'string' ? { url: s } : s)
      } catch {}
      if (!parsedBanners.length && ui?.dashboard_banner_url) parsedBanners = [{ url: ui.dashboard_banner_url }]
      setBanners(parsedBanners)

      try { setFeaturedIds(JSON.parse(ui?.dashboard_featured_ids || '[]')) } catch {}
      try { setSections(JSON.parse(ui?.dashboard_sections || '[]')) } catch {}

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

  const catTab = (cat: Category) => {
    const slug = catSlugs[cat.id] || 'shared'
    return slug === 'private' ? 'private' : slug === 'bundle' ? 'bundle' : 'shared'
  }

  const featuredTools = featuredIds.map(id => toolById(id)).filter(Boolean) as Tool[]

  return (
    <div className="p-3 md:p-5" dir={isRtl ? 'rtl' : 'ltr'}>
      <style>{`
        .cat-scroll::-webkit-scrollbar { display: none; }
        .glass-card {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          will-change: transform;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .glass-card:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        .dark .glass-card {
          background: rgba(22,25,38,0.85);
          border-color: rgba(255,255,255,0.06);
          box-shadow: 0 2px 12px rgba(0,0,0,0.25);
        }
        .dark .glass-card:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.35);
        }
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

      {/* ── Categories Scroll ── */}
      {!loading && categories.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100">
              {isRtl ? 'نفسك في ايه؟ 🤔' : "What are you looking for? 🤔"}
            </h2>
            <div className="flex items-center gap-1.5">
              <button onClick={() => scrollCats('left')}
                className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 transition-colors">
                <ChevronLeft size={16}/>
              </button>
              <button onClick={() => scrollCats('right')}
                className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 transition-colors">
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
          <div ref={catScrollRef} className="cat-scroll flex gap-4 overflow-x-auto pb-2 scroll-smooth" style={{scrollbarWidth:'none'}}>
            {categories.map(cat => (
              <button key={cat.id}
                onClick={() => router.push(`/u/store?tab=${catTab(cat)}&cat=${cat.id}`)}
                className="flex-shrink-0 flex flex-col items-center gap-2.5 group">
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
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
        </div>
      )}

      {/* ── Top Picks — distinctive section ── */}
      {featuredTools.length > 0 && (
        <div className="mb-8">
          {/* Section header — eye-catching, matches store banner gradient */}
          <div className="relative rounded-2xl overflow-hidden mb-5 px-5 py-4 flex items-center justify-between"
            style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
            <div className="absolute inset-0 pointer-events-none opacity-40"
              style={{backgroundImage:'radial-gradient(ellipse at 20% 50%,#d9940150,transparent 55%),radial-gradient(ellipse at 80% 50%,#3b82f630,transparent 55%)'}}/>
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{background:'linear-gradient(135deg,#d99401,#f59e0b)'}}>
                🔥
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest mb-0.5"
                  style={{color:'#d99401'}}>
                  {isRtl ? 'الأكثر مبيعاً' : 'Best Sellers'}
                </div>
                <h2 className="text-lg font-extrabold text-white leading-tight">
                  {isRtl ? 'الأكثر مبيعاً هذا الشهر 🏆' : 'Best Sellers This Month 🏆'}
                </h2>
              </div>
            </div>
            <Link href="/u/store" className="relative flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>
              {isRtl ? 'عرض الكل ←' : '→ View All'}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredTools.map(t => (
              <TopPickCard key={t.id} tool={t} lang={lang} formatPrice={formatPrice} usdRate={usdRate}/>
            ))}
          </div>
        </div>
      )}

      {/* ── Announcement Sections ── */}
      {sections.map((sec, i) => {
        const sectionTools = sec.tool_ids.map(id => toolById(id)).filter(Boolean) as Tool[]
        if (!sectionTools.length) return null
        const emoji = sec.emoji || '🔖'
        const title = isRtl ? sec.title_ar : sec.title_en
        const sub   = isRtl ? (sec.subtitle_ar || '') : (sec.subtitle_en || '')
        return (
          <div key={i} className="mb-8">
            {/* Section banner header — same style as Best Sellers */}
            <div className="relative rounded-2xl overflow-hidden mb-5 px-5 py-4 flex items-center justify-between"
              style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
              <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{backgroundImage:'radial-gradient(ellipse at 20% 50%,#3b82f640,transparent 55%),radial-gradient(ellipse at 80% 50%,#d9940120,transparent 55%)'}}/>
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{background:'linear-gradient(135deg,#1e3a5f,#2d5a9e)'}}>
                  {emoji}
                </div>
                <div>
                  {sub && (
                    <div className="text-xs font-bold uppercase tracking-widest mb-0.5 text-blue-300">{sub}</div>
                  )}
                  <h2 className="text-lg font-extrabold text-white leading-tight">{title}</h2>
                </div>
              </div>
              <Link href="/u/store" className="relative flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{background:'#3b82f620',color:'#93c5fd',border:'1px solid #3b82f640'}}>
                {isRtl ? 'عرض الكل ←' : '→ View All'}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectionTools.map(t => (
                <SectionCard key={t.id} tool={t} lang={lang} formatPrice={formatPrice} usdRate={usdRate}/>
              ))}
            </div>
          </div>
        )
      })}

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
