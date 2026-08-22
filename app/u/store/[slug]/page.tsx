'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { useCart } from '@/lib/cart-context'
import {
  ShoppingCart, Heart, Plus, Minus, Check, Star as StarIcon,
  Search, ChevronLeft, Zap, X, Info,
  TrendingUp, TrendingDown, Clock
} from 'lucide-react'
import ToolLandingPage from '@/app/u/shop/ToolLandingPage'
import { useMember } from '@/lib/member-context'

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
        <StarIcon key={i} size={11}
          fill={i <= Math.round(rating) ? '#F59E0B' : 'none'}
          stroke={i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB'}/>
      ))}
      <span className="text-[10px] text-gray-400 ms-1 font-medium">
        {rating.toFixed(1)} ({count >= 1000 ? `${(count/1000).toFixed(1)}k` : count})
      </span>
    </div>
  )
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const router   = useRouter()
  const { lang, formatPrice } = useLang()
  const settings = useSiteSettings()
  const { addToCart, removeFromCart, inCart, toggleFav, isFav } = useCart()
  const { member, requireAuth } = useMember()
  const isRtl    = lang === 'ar'
  const usdRate  = parseFloat(settings.usd_to_egp_rate || '50')
  const t = (ar: string, en: string) => isRtl ? ar : en

  const [tools,    setTools]    = useState<Tool[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [sort,     setSort]     = useState<'best'|'cheapest'|'expensive'|'recent'>('best')
  const [landing,  setLanding]  = useState<Tool | null>(null)
  const [qty,      setQty]      = useState<Record<string, number>>({})
  const [toast,    setToast]    = useState('')

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

  const getQty = (id: string) => qty[id] || 1
  const setLocalQty = (id: string, v: number) => setQty(q => ({ ...q, [id]: Math.max(1, v) }))

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const handleCart = async (tool: Tool) => {
    if (!member) { requireAuth(); return }
    const isPrivate = tool.category_slug === 'private' || tool.category_slug === 'bundle'
    const q = isPrivate ? getQty(tool.id) : 1
    if (inCart(tool.id) && !isPrivate) { removeFromCart(tool.id); showToast(t('تمت الإزالة','Removed')) }
    else { await addToCart(tool.id, q, tool as any); showToast(t('أضيف للسلة ✓','Added ✓')) }
  }
  const handleFav = (tool: Tool) => {
    if (!member) { requireAuth(); return }
    toggleFav(tool.id, tool as any)
  }
  const handleBuy = (e: React.MouseEvent) => {
    if (!member) { e.preventDefault(); requireAuth() }
  }

  const filtered = tools
    .filter(tool => {
      if (!search) return true
      const q = search.toLowerCase()
      return tool.name.toLowerCase().includes(q) || (tool.description || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sort === 'cheapest')  return a.price_egp - b.price_egp
      if (sort === 'expensive') return b.price_egp - a.price_egp
      if (sort === 'recent')    return 0
      return (b.rating || 0) - (a.rating || 0)
    })

  const catName = isRtl && (category as any)?.name_ar ? (category as any).name_ar : category?.name || slug

  const price = (tool: Tool) => formatPrice(tool.price_egp, usdRate)

  if (landing) return <ToolLandingPage tool={landing as any} onBack={() => setLanding(null)}/>

  return (
    <div className="p-3 md:p-5" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white pointer-events-none" style={{background:'#d99401'}}>
          {toast}
        </div>
      )}

      {/* Back + title */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-[#d99401] hover:border-[#d9940150] transition-colors">
          <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''}/>
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-tight">{catName}</h1>
          <p className="text-xs text-gray-400">{filtered.length} {t('منتج','products')}</p>
        </div>
      </div>

      {/* Filter bar — same style as ShopPage */}
      <style>{`.sp-scroll{overflow-x:auto;scrollbar-width:none;}.sp-scroll::-webkit-scrollbar{display:none;}`}</style>
      <div className="glass-filter-bar mb-5 rounded-xl p-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[120px]">
            <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('ابحث…','Search…')}
              className="w-full ps-8 pe-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#d99401] transition-all"/>
            {search && <button onClick={() => setSearch('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={11}/></button>}
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 flex-shrink-0"/>
          {([
            { key:'best',      en:'Top Rated', ar:'الأعلى تقييماً', Icon: StarIcon    },
            { key:'cheapest',  en:'Low Price', ar:'الأقل سعراً',    Icon: TrendingDown},
            { key:'expensive', en:'High Price',ar:'الأعلى سعراً',   Icon: TrendingUp  },
            { key:'recent',    en:'New',       ar:'الأحدث',         Icon: Clock       },
          ] as const).map(s => (
            <button key={s.key} onClick={() => setSort(s.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 whitespace-nowrap border ${sort===s.key?'border-[#6366f1] text-[#6366f1]':'border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              style={sort===s.key?{background:'#6366f110'}:{}}>
              <s.Icon size={12}/>
              {isRtl ? s.ar : s.en}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">{t('لا توجد منتجات','No products found')}</p>
        </div>
      )}

      {/* Tool cards — exact ShopPage card design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {filtered.map(tool => {
          const isShared = tool.category_slug === 'shared'
          const accent = tool.category_slug === 'private' ? '#8b5cf6' : tool.category_slug === 'bundle' ? '#f59e0b' : '#d99401'
          const faved  = isFav(tool.id)
          const hasLanding = Array.isArray(tool.landing_blocks) && tool.landing_blocks.length > 0
          return (
            <div key={tool.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
              <div className="h-0.5 w-full flex-shrink-0" style={{background:`linear-gradient(90deg,${accent},${accent}88)`}}/>

              <div className="p-5 pb-3">
                {/* Badges */}
                <div className={`flex items-center gap-1.5 mb-3 flex-wrap ${isRtl ? 'justify-start' : 'justify-end'}`}>
                  {(tool.sales_count || 0) > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                      style={{background: tool.category_slug==='private'?'#8b5cf6':tool.category_slug==='bundle'?'#f59e0b':'#d99401'}}>
                      <ShoppingCart size={10} strokeWidth={2.5} color="white"/>
                      {(tool.sales_count||0).toLocaleString()} {t('مبيعة','sold')}
                    </span>
                  )}
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white">
                    <Zap size={10} fill="white"/>{t('فوري',tool.delivery_label||'INSTANT')}
                  </span>
                </div>
                {/* Logo */}
                <div className="w-14 h-14 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center mb-3 overflow-hidden shadow-sm">
                  {tool.image_url
                    ? <img src={tool.image_url} alt={tool.name} className="w-10 h-10 object-contain"/>
                    : <span className="text-xl font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>
                  }
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5 leading-tight">{tool.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 min-h-[2.75rem]">
                  {(isRtl && tool.description_ar) ? tool.description_ar : tool.description}
                </p>
              </div>

              {/* Stars */}
              <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
                <Stars rating={tool.rating} count={tool.review_count}/>
              </div>

              <div className="mx-5 border-t border-gray-100 dark:border-gray-800"/>

              <div className="px-5 py-3 mt-auto space-y-2" dir={isRtl ? 'rtl' : 'ltr'}>
                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold" style={{color:accent}}>{price(tool)}</span>
                  <span className="text-sm text-gray-400 whitespace-nowrap">/ {tool.duration_label}</span>
                </div>

                {/* Details + qty row */}
                <div className="flex items-center gap-2">
                  {hasLanding && (
                    <button onClick={() => setLanding(tool)}
                      className="flex-1 text-xs font-bold py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-[#6366f1]/50 hover:text-[#6366f1] transition-all flex items-center justify-center gap-1.5">
                      <Info size={12}/>{t('التفاصيل','Details')}
                    </button>
                  )}
                  {!isShared && (
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1">
                      <button onClick={() => setLocalQty(tool.id, getQty(tool.id) - 1)} disabled={getQty(tool.id) <= 1}
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30">
                        <Minus size={9}/>
                      </button>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 w-4 text-center">{getQty(tool.id)}</span>
                      <button onClick={() => setLocalQty(tool.id, getQty(tool.id) + 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <Plus size={9}/>
                      </button>
                    </div>
                  )}
                </div>

                {tool.is_out_of_stock ? (
                  <button disabled className="w-full py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-400 text-sm font-bold cursor-default">
                    {t('نفذت الكمية','Out of Stock')}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleFav(tool)}
                      className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors"
                      style={faved?{background:'#fee2e2',borderColor:'#fca5a5',color:'#ef4444'}:{borderColor:'#e5e7eb',color:'#9ca3af'}}>
                      <Heart size={13} fill={faved?'currentColor':'none'}/>
                    </button>
                    <a href={`/u/checkout?tool_id=${tool.id}`} onClick={handleBuy}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                      style={{background:accent}}>
                      <ShoppingCart size={13} color="white"/>{t('شراء الآن','Buy Now')}
                    </a>
                    <button onClick={() => handleCart(tool)}
                      className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-all"
                      style={inCart(tool.id)
                        ? {background:'#10b98120',borderColor:'#10b981',color:'#10b981'}
                        : {borderColor:'#e5e7eb',color:'#6b7280'}}>
                      {inCart(tool.id) ? <Check size={13}/> : <Plus size={13}/>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
