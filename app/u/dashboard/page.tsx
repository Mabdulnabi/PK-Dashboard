'use client'
import { useEffect, useState, useRef } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { useUISettings } from '@/lib/use-ui-settings'
import { Star, Zap, Lock, Users, ArrowRight, ArrowLeft, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Tool {
  id: string; name: string; description: string; image_url?: string
  price_egp: number; price_usd?: number; duration_label: string
  rating: number; review_count: number; category_slug: string
  is_out_of_stock: boolean; delivery_label?: string; is_active: boolean
}

function ToolRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11}
          fill={i <= Math.round(rating) ? '#F59E0B' : 'none'}
          stroke={i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB'}/>
      ))}
      <span className="text-[11px] text-gray-400 ms-0.5">
        {rating.toFixed(1)} ({count >= 1000 ? `${(count/1000).toFixed(1)}k` : count})
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const { t, lang, currency, formatPrice } = useLang()
  const settings  = useSiteSettings()
  const ui        = useUISettings()
  const isRtl     = lang === 'ar'
  const usdRate   = parseFloat(settings.usd_to_egp_rate || '50')

  const [tools,    setTools]    = useState<Tool[]>([])
  const [loading,  setLoading]  = useState(true)
  const [banners,  setBanners]  = useState<string[]>([])
  const [slide,    setSlide]    = useState(0)
  const [activeTab,setActiveTab]= useState<'all'|'shared'|'private'>('all')
  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/member/shop').then(r => r.json()),
      fetch('/api/admin/ui-settings').then(r => r.json()).catch(() => ({ settings: {} })),
    ]).then(([shopData, uiData]) => {
      setTools(shopData.tools || [])
      const ui = uiData.settings as Record<string,string>
      const raw = ui?.dashboard_banners
      if (raw) {
        try { setBanners(JSON.parse(raw)) } catch { /* */ }
      } else if (ui?.dashboard_banner_url) {
        setBanners([ui.dashboard_banner_url])
      }
      setLoading(false)
    })
  }, [])

  // Auto-advance slider
  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setInterval(() => setSlide(s => (s+1) % banners.length), 4500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [banners.length])

  const goSlide = (i: number) => {
    setSlide(i)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    timerRef.current = setInterval(() => setSlide(s => (s+1) % banners.length), 4500)
  }

  const price = (tool: Tool) => formatPrice(tool.price_egp, usdRate)

  const filtered = tools.filter(t => {
    if (activeTab === 'shared')  return t.category_slug === 'shared'
    if (activeTab === 'private') return t.category_slug === 'private'
    return true
  })

  const sharedCount  = tools.filter(t => t.category_slug === 'shared').length
  const privateCount = tools.filter(t => t.category_slug === 'private').length

  return (
    <div className="p-3 md:p-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Banner Slider ── */}
      {banners.length > 0 ? (
        <div className="relative rounded-2xl overflow-hidden mb-6 w-full group" style={{ maxHeight: 280 }}>
          {/* Slides */}
          {banners.map((url, i) => (
            <div key={url} className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: i === slide ? 1 : 0, zIndex: i === slide ? 1 : 0 }}>
              <img src={url} alt={`Banner ${i+1}`} className="w-full h-full object-cover" style={{ maxHeight: 280 }}/>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4))' }}/>
            </div>
          ))}
          {/* Spacer to keep height */}
          <img src={banners[0]} alt="" className="w-full object-cover invisible" style={{ maxHeight: 280 }}/>

          {/* Arrows — only when multiple */}
          {banners.length > 1 && (<>
            <button onClick={()=>goSlide((slide-1+banners.length)%banners.length)}
              className="absolute start-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {isRtl ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
            </button>
            <button onClick={()=>goSlide((slide+1)%banners.length)}
              className="absolute end-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {isRtl ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {banners.map((_,i)=>(
                <button key={i} onClick={()=>goSlide(i)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: i===slide ? 20 : 6, background: i===slide ? '#fff' : 'rgba(255,255,255,0.5)' }}/>
              ))}
            </div>
          </>)}
        </div>
      ) : !loading && (
        <div className="rounded-2xl mb-6 p-8 md:p-12 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#0d0f14 0%,#1a1200 50%,#0f3460 100%)' }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #d9940140, transparent 60%)' }}/>
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
              style={{ border: '1px solid #d9940150', background: '#d9940118' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#d99401]"/>
              <span className="text-xs font-semibold text-[#d99401] uppercase tracking-wide">
                {isRtl ? 'Pro Keys' : 'Pro Keys'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {isRtl ? 'أدوات احترافية بأسعار مناسبة' : 'Professional Tools at Affordable Prices'}
            </h1>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              {isRtl
                ? 'اشتراكات مشتركة وحسابات خاصة لأشهر الأدوات'
                : 'Shared subscriptions and private accounts for top-tier tools'}
            </p>
          </div>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      {!loading && (
        <div className="flex items-center gap-2 mb-5">
          {([
            { key: 'all',     labelEn: 'All Tools',       labelAr: 'جميع الأدوات',   count: tools.length },
            { key: 'shared',  labelEn: 'Shared Tools',    labelAr: 'أدوات مشتركة',   count: sharedCount, icon: Users  },
            { key: 'private', labelEn: 'Private Accounts', labelAr: 'حسابات خاصة',   count: privateCount, icon: Lock  },
          ] as const).map(tab => {
            const Icon = 'icon' in tab ? tab.icon : null
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  active
                    ? 'text-white border-transparent shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-[#d99401]/50'
                }`}
                style={active ? { background: '#d99401', borderColor: 'transparent' } : {}}>
                {Icon && <Icon size={12}/>}
                {isRtl ? tab.labelAr : tab.labelEn}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center py-24">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#d99401', borderTopColor: 'transparent' }}/>
        </div>
      )}

      {/* ── Tools Grid ── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(tool => {
            const isPrivate = tool.category_slug === 'private'
            const href = isPrivate ? '/u/shop/private-store' : `/u/shop/shared`

            return (
              <div key={tool.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">

                {/* Category stripe */}
                <div className="h-0.5 w-full"
                  style={{ background: isPrivate ? 'linear-gradient(90deg,#8b5cf6,#a78bfa)' : 'linear-gradient(90deg,#d99401,#f5b800)' }}/>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {tool.image_url
                        ? <img src={tool.image_url} alt={tool.name} className="w-8 h-8 object-contain"/>
                        : <span className="text-xs font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {/* Category badge */}
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPrivate
                          ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600'
                          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'
                      }`}>
                        {isPrivate ? <Lock size={9}/> : <Users size={9}/>}
                        {isPrivate ? (isRtl ? 'خاص' : 'Private') : (isRtl ? 'مشترك' : 'Shared')}
                      </span>
                      {/* Delivery badge */}
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                        <Zap size={9} fill="currentColor"/>
                        {tool.delivery_label || (isRtl ? 'فوري' : 'Instant')}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
                    {tool.description}
                  </p>

                  <ToolRating rating={tool.rating} count={tool.review_count}/>
                </div>

                <div className="mx-4 border-t border-gray-100 dark:border-gray-800"/>

                <div className="p-4 pt-3 flex items-center justify-between gap-2">
                  <div dir="ltr">
                    <span className="text-base font-bold" style={{ color: isPrivate ? '#8b5cf6' : '#d99401' }}>
                      {price(tool)}
                    </span>
                    <span className="text-xs text-gray-400 ms-1">/ {tool.duration_label}</span>
                  </div>

                  {tool.is_out_of_stock ? (
                    <span className="text-xs font-bold text-gray-400 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800">
                      {isRtl ? 'نفد المخزون' : 'Out of Stock'}
                    </span>
                  ) : (
                    <Link href={`/u/checkout?tool_id=${tool.id}`}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-opacity hover:opacity-90 shadow-sm"
                      style={{ background: isPrivate ? '#8b5cf6' : '#d99401' }}>
                      <ShoppingCart size={11}/>
                      {isRtl ? 'اشتري' : 'Buy'}
                      {isRtl ? <ArrowLeft size={11}/> : <ArrowRight size={11}/>}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400 text-sm">
          {isRtl ? 'لا توجد أدوات في هذا القسم' : 'No tools in this category'}
        </div>
      )}
    </div>
  )
}
