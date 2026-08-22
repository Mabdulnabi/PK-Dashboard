'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { useCart } from '@/lib/cart-context'
import { ShoppingCart, Heart, Plus, Minus, Check, Star, Search, SlidersHorizontal, ChevronLeft, Globe, Lock, Package, ShoppingBag, Zap, X } from 'lucide-react'

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
  color: string; icon: string; image_url?: string; sort_order: number
}

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

function ToolCard({ tool, lang, formatPrice, usdRate, onDetails }: {
  tool: Tool; lang: string; formatPrice: (n:number,r:number)=>string; usdRate: number; onDetails: (t: Tool) => void
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
  const { addToCart, removeFromCart, inCart, toggleFav, isFav } = useCart()
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
              <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{background: accent}}>
                {tool.category_slug === 'private' ? <Lock size={9}/> : tool.category_slug === 'bundle' ? <Package size={9}/> : <Globe size={9}/>}
                {typeLabel}
              </div>
              {sales > 0 && (
                <div className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <ShoppingCart size={9}/>{sales.toLocaleString()} {isRtl ? 'مبيعة' : 'sold'}
                </div>
              )}
            </div>
          </div>
          <div className="text-end flex-shrink-0">
            <div className="text-xl font-extrabold" style={{color: accent}}>{price}</div>
            <div className="text-[11px] text-gray-400">/ {tool.duration_label}</div>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white/50 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-xl px-3 py-2">
              <span className="text-xs font-semibold text-gray-500">{isRtl ? 'الكمية' : 'Qty'}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => Math.max(1, q-1))} disabled={qty <= 1}
                  className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center disabled:opacity-30">
                  <Minus size={10}/>
                </button>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 w-5 text-center">{qty}</span>
                <button onClick={() => setQty(q => q+1)}
                  className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Plus size={10}/>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => toggleFav(tool.id, tool as any)}
                className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center"
                style={faved ? {background:'#fee2e2',borderColor:'#fca5a5',color:'#ef4444'} : {borderColor:'#e5e7eb',color:'#9ca3af'}}>
                <Heart size={13} fill={faved ? 'currentColor' : 'none'}/>
              </button>
              <button onClick={() => onDetails(tool)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-1">
                {isRtl ? 'التفاصيل' : 'Details'}
              </button>
              <a href={`/u/checkout?tool_id=${tool.id}`}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5"
                style={{background: accent}}>
                <ShoppingBag size={13}/>{isRtl ? 'اشتري' : 'Buy'}
              </a>
              <button onClick={handleCart}
                className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center"
                style={cartted ? {background:'#10b98120',borderColor:'#10b981',color:'#10b981'} : {borderColor:'#e5e7eb',color:'#6b7280'}}>
                {cartted ? <Check size={13}/> : <Plus size={13}/>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Tool Landing Page inline drawer ── */
function ToolDrawer({ tool, lang, onClose }: { tool: Tool; lang: string; onClose: () => void }) {
  const isRtl = lang === 'ar'
  const accent = tool.category_slug === 'private' ? '#8b5cf6' : tool.category_slug === 'bundle' ? '#f59e0b' : '#d99401'
  const blocks: any[] = tool.landing_blocks || []

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <div className="relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-3xl shadow-2xl"
        style={{background:'var(--card-bg,#fff)'}}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            {tool.image_url && <img src={tool.image_url} alt={tool.name} className="w-10 h-10 object-contain rounded-xl"/>}
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{tool.name}</h2>
              <div className="flex items-center gap-1 mt-0.5">
                <Zap size={10} style={{color: accent}}/><span className="text-[10px] font-bold" style={{color: accent}}>{tool.delivery_label || 'INSTANT'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={14}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Price + buy */}
          <div className="flex items-center justify-between p-4 rounded-2xl" style={{background: accent+'12', border:`1px solid ${accent}30`}}>
            <div>
              <div className="text-2xl font-extrabold" style={{color: accent}}>
                {tool.price_egp.toLocaleString()} {isRtl ? 'ج.م' : 'EGP'}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">/ {tool.duration_label}</div>
            </div>
            {!tool.is_out_of_stock && (
              <a href={`/u/checkout?tool_id=${tool.id}`}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-bold"
                style={{background: accent}}>
                {isRtl ? 'اشتري الآن' : 'Buy Now'}
              </a>
            )}
          </div>

          {/* Description */}
          {(tool.description || tool.description_ar) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {(isRtl && tool.description_ar) ? tool.description_ar : tool.description}
            </p>
          )}

          {/* Landing blocks */}
          {blocks.map((block: any, i: number) => {
            const title = isRtl ? (block.title_ar || block.title_en) : (block.title_en || block.title_ar)
            const body  = isRtl ? (block.body_ar  || block.body_en)  : (block.body_en  || block.body_ar)
            return (
              <div key={i} className="rounded-2xl p-4 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                {title && <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>}
                {block.type === 'image' && block.image_url && (
                  <img src={block.image_url} alt={title} className="w-full rounded-xl object-cover max-h-60"/>
                )}
                {block.type === 'video' && block.video_url && (
                  <div className="aspect-video rounded-xl overflow-hidden">
                    <iframe src={block.video_url.replace('watch?v=','embed/').replace('youtu.be/','www.youtube.com/embed/')}
                      className="w-full h-full" allowFullScreen/>
                  </div>
                )}
                {body && <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-2 whitespace-pre-line">{body}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const router   = useRouter()
  const { lang, formatPrice } = useLang()
  const settings = useSiteSettings()
  const isRtl    = lang === 'ar'
  const usdRate  = parseFloat(settings.usd_to_egp_rate || '50')

  const [tools,    setTools]    = useState<Tool[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState<'default'|'price_asc'|'price_desc'|'rating'>('default')
  const [drawer,   setDrawer]   = useState<Tool | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/member/shop').then(r => r.json()),
      fetch('/api/member/categories').then(r => r.json()).catch(() => ({ categories: [] })),
    ]).then(([shopData, catData]) => {
      const cat = (catData.categories || []).find((c: Category) => c.slug === slug)
      setCategory(cat || null)
      const catTools = (shopData.tools || []).filter((t: Tool) => {
        if (!cat) return false
        return t.category_id === cat.id || t.category_slug === slug
      })
      setTools(catTools)
      setLoading(false)
    })
  }, [slug])

  const filtered = tools
    .filter(t => {
      if (!search) return true
      const q = search.toLowerCase()
      return t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sort === 'price_asc')  return a.price_egp - b.price_egp
      if (sort === 'price_desc') return b.price_egp - a.price_egp
      if (sort === 'rating')     return b.rating - a.rating
      return 0
    })

  const catName = isRtl && (category as any)?.name_ar ? (category as any).name_ar : category?.name || slug

  return (
    <div className="p-3 md:p-5" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-[#d99401] hover:border-[#d9940150] transition-colors">
          <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''}/>
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-tight">{catName}</h1>
          <p className="text-xs text-gray-400">{filtered.length} {isRtl ? 'منتج' : 'products'}</p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isRtl ? 'ابحث في المنتجات...' : 'Search products...'}
            className="w-full ps-9 pe-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-[#d99401] transition-colors"
          />
        </div>
        <div className="relative">
          <SlidersHorizontal size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="ps-9 pe-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-[#d99401] transition-colors appearance-none cursor-pointer">
            <option value="default">{isRtl ? 'الترتيب الافتراضي' : 'Default'}</option>
            <option value="price_asc">{isRtl ? 'السعر: الأقل' : 'Price: Low'}</option>
            <option value="price_desc">{isRtl ? 'السعر: الأعلى' : 'Price: High'}</option>
            <option value="rating">{isRtl ? 'الأعلى تقييماً' : 'Top Rated'}</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">{isRtl ? 'لا توجد منتجات' : 'No products found'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(t => (
          <ToolCard key={t.id} tool={t} lang={lang} formatPrice={formatPrice} usdRate={usdRate} onDetails={setDrawer}/>
        ))}
      </div>

      {drawer && <ToolDrawer tool={drawer} lang={lang} onClose={() => setDrawer(null)}/>}
    </div>
  )
}
