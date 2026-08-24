'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { useCart } from '@/lib/cart-context'
import { useMember } from '@/lib/member-context'
import { ShoppingCart, Heart, Plus, Check, Star, Zap, ChevronLeft, ChevronRight, Info, Shield, TrendingDown } from 'lucide-react'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'

interface Tool {
  id: string; name: string; description: string; description_ar?: string
  image_url?: string; price_egp: number; price_usd?: number; retail_price_egp?: number
  duration_label: string; category_slug: string; category_id?: string
  is_out_of_stock: boolean; landing_blocks?: any[]
  rating: number; review_count: number; sales_count?: number
  delivery_label?: string; details_slug?: string; warranty_label?: string
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

function StoreCard({ tool, lang, formatPrice }: {
  tool: Tool; lang: string; formatPrice: (egp:number,usdRate?:number)=>string
}) {
  const router = useRouter()
  const isRtl  = lang === 'ar'
  const t = (ar: string, en: string) => isRtl ? ar : en
  const accent = tool.category_slug === 'private' ? '#8b5cf6' : tool.category_slug === 'bundle' ? '#f59e0b' : '#d99401'
  const price  = formatPrice(tool.price_egp)
  const { addToCart, removeFromCart, inCart, toggleFav, isFav } = useCart()
  const { member, requireAuth } = useMember()
  const [toast, setToast] = useState('')
  const faved   = isFav(tool.id)
  const cartted = inCart(tool.id)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const handleCart = async () => {
    if (!member) { requireAuth(); return }
    if (cartted) { removeFromCart(tool.id); showToast(t('تمت الإزالة','Removed')) }
    else { await addToCart(tool.id, 1, tool as any); showToast(t('أضيف للسلة ✓','Added ✓')) }
  }
  const handleFav = () => {
    if (!member) { requireAuth(); return }
    toggleFav(tool.id, tool as any)
  }
  const handleBuy = (e: React.MouseEvent) => {
    if (!member) { e.preventDefault(); requireAuth() }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col relative">
      {toast && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-xl text-xs font-bold text-white pointer-events-none whitespace-nowrap"
          style={{background: accent}}>{toast}</div>
      )}
      <div className="h-0.5 w-full flex-shrink-0" style={{background:`linear-gradient(90deg,${accent},${accent}88)`}}/>

      <div className="p-5 pb-3">
        {/* Top badges: delivery + discount only */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap justify-end">
          {(() => {
            const retail = tool.retail_price_egp || 0
            const mine   = tool.price_egp || 0
            if (retail > 0 && mine > 0 && mine < retail) {
              const pct = Math.round((1 - mine / retail) * 100)
              return (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-white"
                  style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}>
                  <TrendingDown size={10} strokeWidth={2.5}/>{pct}% {t('خصم','OFF')}
                </span>
              )
            }
            return null
          })()}
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
            <Zap size={10} fill="white"/>{t('فوري', tool.delivery_label||'INSTANT')}
          </span>
        </div>
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center mb-3 overflow-hidden shadow-sm">
          {tool.image_url
            ? <img src={tool.image_url} alt={tool.name} className="w-10 h-10 object-contain"/>
            : <span className="text-xl font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>}
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5 leading-tight">{tool.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 min-h-[2.75rem]"
          dir={isRtl ? 'rtl' : 'ltr'} style={isRtl ? {unicodeBidi:'plaintext'} : {}}>
          {(isRtl && tool.description_ar) ? tool.description_ar : tool.description}
        </p>
      </div>

      {/* Stars + secondary badges row */}
      <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
        <Stars rating={tool.rating} count={tool.review_count}/>
        {(tool.sales_count || 0) > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{background:`linear-gradient(135deg,${accent},${accent}bb)`}}>
            <ShoppingCart size={9} strokeWidth={2.5} color="white"/>
            {(tool.sales_count||0).toLocaleString()} {t('مبيعة','sold')}
          </span>
        )}
        {tool.warranty_label && tool.warranty_label !== 'no_warranty' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{background:'linear-gradient(135deg,#6366f1,#4f46e5)'}}>
            <Shield size={9} strokeWidth={2.5} color="white"/>
            {tool.warranty_label}
          </span>
        )}
      </div>

      <div className="mx-5 border-t border-gray-100 dark:border-gray-800"/>

      <div className="px-5 py-3 mt-auto space-y-2" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-bold" style={{color:accent}}>{price}</span>
          {(tool.retail_price_egp||0) > tool.price_egp && tool.price_egp > 0 && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(tool.retail_price_egp!)}</span>
          )}
          <span className="text-sm text-gray-400 whitespace-nowrap">/ {tool.duration_label}</span>
        </div>

        <button
          onClick={() => tool.details_slug && router.push(`/u/tool/${tool.details_slug}`)}
          className="w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
          style={tool.details_slug
            ? {background:`${accent}18`,color:accent,border:`1.5px solid ${accent}60`}
            : {background:'transparent',color:'transparent',border:'1.5px solid transparent',pointerEvents:'none'}}>
          <Info size={12}/>{t('التفاصيل','Details')}
        </button>

        {tool.is_out_of_stock ? (
          <button disabled className="w-full py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-400 text-sm font-bold cursor-default">
            {t('نفذت الكمية','Out of Stock')}
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button onClick={handleFav}
              className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors"
              style={faved?{background:'#fee2e2',borderColor:'#fca5a5',color:'#ef4444'}:{borderColor:'#e5e7eb',color:'#9ca3af'}}>
              <Heart size={13} fill={faved?'currentColor':'none'}/>
            </button>
            <a href={`/u/checkout?tool_id=${tool.id}`} onClick={handleBuy}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{background:accent}}>
              <ShoppingCart size={13} color="white"/>{t('شراء الآن','Buy Now')}
            </a>
            <button onClick={handleCart}
              className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-all relative"
              title={cartted ? t('إزالة من السلة','Remove from cart') : t('إضافة للسلة','Add to cart')}
              style={cartted
                ? {background:'#10b98120',borderColor:'#10b981',color:'#10b981'}
                : {borderColor:'#e5e7eb',color:'#6b7280'}}>
              {cartted ? <Check size={13}/> : <ShoppingCart size={13}/>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolCarousel({ tools, lang, formatPrice }: { tools: Tool[]; lang: string; formatPrice: (egp:number,usdRate?:number)=>string }) {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const posRef   = useRef(tools.length) // index in tripled array; start at middle copy
  const stepRef  = useRef(0) // px per card (cardWidth + gap)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const N   = tools.length
  const GAP = 16
  // triple items: [copy0, copy1(real), copy2] — start at copy1
  const items = [...tools, ...tools, ...tools]

  const measure = () => {
    if (!wrapRef.current || !trackRef.current) return
    const cw = (wrapRef.current.clientWidth - GAP * 2) / 3
    stepRef.current = cw + GAP
    // re-position without animation
    trackRef.current.style.transition = 'none'
    trackRef.current.style.transform  = `translateX(-${posRef.current * stepRef.current}px)`
    // set card widths
    Array.from(trackRef.current.children).forEach(c => { (c as HTMLElement).style.width = cw + 'px' })
  }

  const animTo = (idx: number, instant = false) => {
    if (!trackRef.current || stepRef.current === 0) return
    trackRef.current.style.transition = instant ? 'none' : 'transform 0.65s cubic-bezier(0.4,0,0.2,1)'
    trackRef.current.style.transform  = `translateX(-${idx * stepRef.current}px)`
  }

  const advance = (dir: number) => {
    const next = posRef.current + dir
    animTo(next)
    posRef.current = next
    // after animation, snap back to middle copy for seamless loop
    if (next >= N * 2) {
      setTimeout(() => { posRef.current = N; animTo(N, true) }, 700)
    } else if (next < N) {
      setTimeout(() => { posRef.current = N * 2 - 1; animTo(N * 2 - 1, true) }, 700)
    }
  }

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (localStorage.getItem('pk_carousel_auto') !== '1') return
    timerRef.current = setInterval(() => advance(1), 3500)
  }

  useEffect(() => {
    measure()
    startTimer()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    const onToggle = (e: Event) => {
      if ((e as CustomEvent).detail) {
        startTimer()
      } else {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      }
    }
    window.addEventListener('pk-carousel-auto', onToggle)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      ro.disconnect()
      window.removeEventListener('pk-carousel-auto', onToggle)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N])

  const btnCls = "absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border transition-all hover:scale-105 active:scale-95"
  const btnSty = { background:'#d99401', borderColor:'#b37a00', color:'#fff' }

  return (
    <div className="relative" dir="ltr" style={{paddingInline: '20px'}}>
      <button onClick={() => { advance(-1); startTimer() }} className={`${btnCls} left-0`} style={btnSty}><ChevronLeft size={16}/></button>
      <div ref={wrapRef} className="overflow-hidden">
        <div ref={trackRef} style={{ display:'flex', gap:GAP, willChange:'transform' }}>
          {items.map((t, i) => (
            <div key={`${t.id}-${i}`} style={{ flexShrink:0 }}>
              <StoreCard tool={t} lang={lang} formatPrice={formatPrice}/>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => { advance(1); startTimer() }} className={`${btnCls} right-0`} style={btnSty}><ChevronRight size={16}/></button>
    </div>
  )
}

export default function StorePage() {
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
  const [loading,     setLoading]     = useState(true)
  const catScrollRef = useRef<HTMLDivElement>(null)

  const scrollCats = (dir: 'left' | 'right') => {
    const el = catScrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/member/shop').then(r => r.json()),
      fetch('/api/ui-settings').then(r => r.json()).catch(() => ({ settings: {} })),
      fetch('/api/member/categories').then(r => r.json()).catch(() => ({ categories: [] })),
    ]).then(([shopData, uiData, catData]) => {
      const allTools: Tool[] = shopData.tools || []
      setTools(allTools)

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
  const featuredTools = featuredIds.map(id => toolById(id)).filter(Boolean) as Tool[]

  return (
    <div className="p-3 md:p-5" dir={isRtl ? 'rtl' : 'ltr'}>
      <style>{`.cat-scroll::-webkit-scrollbar{display:none}`}</style>

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
          <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100 mb-4">
            {isRtl ? 'نفسك في ايه؟ 🤔' : "What are you looking for? 🤔"}
          </h2>
          <div className="relative">
            <button onClick={() => scrollCats('left')}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#d99401] transition-colors">
              <ChevronLeft size={18}/>
            </button>
            <div ref={catScrollRef} className="cat-scroll flex gap-5 overflow-x-auto px-2 pb-2 scroll-smooth" style={{scrollbarWidth:'none'}}>
              {categories.map(cat => (
                <button key={cat.id}
                  onClick={() => router.push(`/u/store/${cat.slug}`)}
                  className="flex-shrink-0 flex flex-col items-center gap-2.5 group">
                  <img src={(isRtl && cat.image_url_ar) ? cat.image_url_ar : cat.image_url!}
                    alt={isRtl && cat.name_ar ? cat.name_ar : cat.name}
                    className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl object-cover group-hover:scale-110 transition-transform duration-300"/>
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight max-w-[128px] truncate">
                    {isRtl && cat.name_ar ? cat.name_ar : cat.name}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => scrollCats('right')}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-[#d99401] transition-colors">
              <ChevronRight size={18}/>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
        </div>
      )}

      {/* ── Best Sellers ── */}
      {featuredTools.length > 0 && (
        <div className="mb-8">
          <div className="relative rounded-2xl overflow-hidden mb-5 px-5 py-4 flex items-center justify-between"
            style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
            <div className="absolute inset-0 pointer-events-none opacity-40"
              style={{backgroundImage:'radial-gradient(ellipse at 20% 50%,#d9940150,transparent 55%),radial-gradient(ellipse at 80% 50%,#3b82f630,transparent 55%)'}}/>
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{background:'linear-gradient(135deg,#d99401,#f59e0b)'}}>🔥</div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{color:'#d99401'}}>
                  {isRtl ? 'الأكثر مبيعاً' : 'Best Sellers'}
                </div>
                <h2 className="text-lg font-extrabold text-white leading-tight">
                  {isRtl ? 'الأكثر مبيعاً هذا الشهر 🏆' : 'Best Sellers This Month 🏆'}
                </h2>
              </div>
            </div>
          </div>
          {featuredTools.length > 3
            ? <ToolCarousel tools={featuredTools} lang={lang} formatPrice={formatPrice}/>
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredTools.map(t => (
                  <StoreCard key={t.id} tool={t} lang={lang} formatPrice={formatPrice}/>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Custom Sections ── */}
      {sections.map((sec, i) => {
        const sectionTools = sec.tool_ids.map(id => toolById(id)).filter(Boolean) as Tool[]
        if (!sectionTools.length) return null
        const emoji = sec.emoji || '🔖'
        const title = isRtl ? sec.title_ar : sec.title_en
        const sub   = isRtl ? (sec.subtitle_ar || '') : (sec.subtitle_en || '')
        return (
          <div key={i} className="mb-8">
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
                  {sub && <div className="text-xs font-bold uppercase tracking-widest mb-0.5 text-blue-300">{sub}</div>}
                  <h2 className="text-lg font-extrabold text-white leading-tight">{title}</h2>
                </div>
              </div>
            </div>
            {sectionTools.length > 3
              ? <ToolCarousel tools={sectionTools} lang={lang} formatPrice={formatPrice}/>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectionTools.map(t => (
                    <StoreCard key={t.id} tool={t} lang={lang} formatPrice={formatPrice}/>
                  ))}
                </div>
            }
          </div>
        )
      })}

      {!loading && featuredTools.length === 0 && sections.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">
            {isRtl ? 'لا توجد منتجات مميزة — أضفها من لوحة الإدارة' : 'No featured products yet — add them from the admin panel'}
          </p>
        </div>
      )}
    </div>
  )
}
