'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { Star, Zap, Info, X, Search, ArrowLeft, ArrowRight, Store, MessageCircle, Heart, Plus, Minus, ShoppingCart, Check, Clock } from 'lucide-react'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'
import ToolLandingPage from '../ToolLandingPage'
import { useCart } from '@/lib/cart-context'

interface Category {
  id: string; name: string; name_ar?: string; slug: string
  color: string; icon: string; image_url?: string; sort_order: number
}
interface Tool {
  id: string; name: string; description: string; image_url?: string
  price_egp: number; price_usd?: number; duration_label: string
  delivery_label: string; rating: number; review_count: number
  video_url?: string; features: string[]; is_out_of_stock: boolean
  category_slug: string; category_id?: string; sort_order: number
  landing_blocks?: any[]
}

function Stars({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i=>(
        <Star key={i} size={13}
          fill={i<=Math.round(rating)?'#F59E0B':'none'}
          stroke={i<=Math.round(rating)?'#F59E0B':'#D1D5DB'}/>
      ))}
      <span className="text-xs text-gray-500 ms-0.5 font-medium">
        {rating.toFixed(1)} ({count>=1000?`${(count/1000).toFixed(1)}k+`:count})
      </span>
    </div>
  )
}

export default function PrivateStorePage() {
  const { t, lang, currency, formatPrice } = useLang()
  const settings = useSiteSettings()
  const isRtl = lang === 'ar'
  const { addToCart, removeFromCart, inCart, getQty, toggleFav, isFav } = useCart()

  const [categories,  setCategories]  = useState<Category[]>([])
  const [tools,       setTools]       = useState<Tool[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selectedCat, setSelectedCat] = useState<Category|null>(null)
  const [q,           setQ]           = useState('')
  const [sort,        setSort]        = useState<'best'|'recent'>('best')
  const [popup,       setPopup]       = useState<Tool|null>(null)
  const [landing,     setLanding]     = useState<Tool|null>(null)
  const [qtys,        setQtys]        = useState<Record<string,number>>({})
  const [toast,       setToast]       = useState('')
  const [secBanners, setSecBanners] = useState<BannerSlide[]>([])

  const localQty = (id: string) => qtys[id] ?? (inCart(id) ? getQty(id) : 1)
  const setLocalQty = (id: string, v: number) => setQtys(p => ({ ...p, [id]: Math.max(1, v) }))

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const handleAddToCart = async (tool: Tool) => {
    const qty = localQty(tool.id)
    if (inCart(tool.id)) {
      removeFromCart(tool.id)
      showToast(isRtl ? 'تمت الإزالة من السلة' : 'Removed from cart')
    } else {
      await addToCart(tool.id, qty, tool)
      showToast(isRtl ? 'تمت الإضافة للسلة ✓' : 'Added to cart ✓')
    }
  }

  useEffect(()=>{
    fetch('/api/admin/ui-settings').then(r=>r.json()).then(d=>{
      const ui = d.settings as Record<string,string>
      try {
        const parsed = JSON.parse(ui?.private_store_banners || '[]')
        if (parsed.length) { setSecBanners(parsed.map((s:any)=>typeof s==='string'?{url:s}:s)); return }
      } catch {}
      if (ui?.private_store_banner_url) setSecBanners([{ url: ui.private_store_banner_url }])
    }).catch(()=>{})

    Promise.all([
      fetch('/api/member/shop?category=private').then(r=>r.json()),
      fetch('/api/member/categories').then(r=>r.json()),
    ]).then(([shopData, catData]) => {
      const allTools: Tool[] = shopData.tools || []
      setTools(allTools)
      const usedCatIds = new Set(allTools.map((t: any) => t.category_id).filter(Boolean))
      const allCats: Category[] = catData.categories || []
      setCategories(allCats.filter(c => usedCatIds.has(c.id)))
      setLoading(false)
    })
  }, [])

  const price = (tool: Tool) =>
    formatPrice(tool.price_egp, parseFloat(settings.usd_to_egp_rate) || 50)

  const catTools = selectedCat
    ? tools.filter(t => t.category_id === selectedCat.id)
    : tools

  const filtered = catTools
    .filter(t => !q || t.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a,b) => sort==='best' ? b.rating-a.rating : b.sort_order-a.sort_order)

  const buy = (tool: Tool) => { window.location.href = `/u/checkout?tool_id=${tool.id}` }

  const openDetails = (tool: Tool) => {
    const hasBlocks = Array.isArray(tool.landing_blocks) && tool.landing_blocks.length > 0
    if (hasBlocks) setLanding(tool)
    else setPopup(tool)
  }

  if (landing) return <ToolLandingPage tool={landing as any} onBack={()=>setLanding(null)}/>

  return (
    <div className="p-3 md:p-6" dir={isRtl?'rtl':'ltr'}>

      {/* Section banner — replaces gradient hero when images uploaded */}
      {secBanners.length > 0 ? (
        <BannerSlider slides={secBanners} maxHeight={220} className="mb-5"/>
      ) : (
      <div className="rounded-2xl mb-5 p-5 md:p-8" style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
              style={{border:'1px solid #8b5cf650',background:'#8b5cf618'}}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"/>
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
                {isRtl?'المتجر الشخصي':'Private Store'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {isRtl?'حسابات ':'Exclusive '}<span style={{color:'#d99401'}}>{isRtl?'خاصة حصرية':'Private Accounts'}</span>
            </h1>
            <p className="text-sm text-gray-300">
              {isRtl?'حسابات وتراخيص خاصة حصرية لك':'Private accounts and licenses just for you'}
            </p>
          </div>
          <a href={`https://wa.me/${(settings.whatsapp_number||'').replace(/\D/g,'')}`} target="_blank"
            className="bg-green-500/20 border border-green-500/30 rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-green-500/30 transition-colors flex-shrink-0">
            <MessageCircle size={20} className="text-green-400"/>
            <div className="text-end">
              <p className="text-xs text-gray-400">{isRtl?'دعم واتساب':'WhatsApp Support'}</p>
              <p className="text-sm font-bold text-white" dir="ltr">{settings.whatsapp_number||'+20 100 000 0000'}</p>
            </div>
          </a>
        </div>
      </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#8b5cf6',borderTopColor:'transparent'}}/>
        </div>
      )}

      {/* Category grid — shown when no category selected */}
      {!loading && !selectedCat && (
        <>
          {categories.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Store size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">{isRtl?'لا توجد منتجات متاحة حالياً':'No products available yet'}</p>
            </div>
          ) : (
            <>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
                {isRtl?'اختر القسم':'Browse Categories'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {categories.map(cat => {
                  const toolCount = tools.filter(t => t.category_id === cat.id).length
                  return (
                    <button key={cat.id} onClick={()=>setSelectedCat(cat)}
                      className="group flex flex-col rounded-2xl overflow-hidden border-2 border-transparent hover:border-purple-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl text-start bg-white dark:bg-gray-900">
                      {/* Image area */}
                      <div className="aspect-square w-full relative overflow-hidden"
                        style={{background:`linear-gradient(145deg,${cat.color}28,${cat.color}10)`}}>
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name}
                            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300 drop-shadow-md"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">
                            {cat.icon}
                          </div>
                        )}
                      </div>
                      {/* Name + count — always below image, never overlapping */}
                      <div className="px-3 py-2.5 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight truncate">
                          {isRtl && cat.name_ar ? cat.name_ar : cat.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {toolCount} {isRtl?'منتج':'products'}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Product listing — shown when category selected */}
      {!loading && selectedCat && (
        <>
          {/* Back + category header */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={()=>{ setSelectedCat(null); setQ('') }}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
              {isRtl ? <ArrowRight size={16}/> : <ArrowLeft size={16}/>}
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 overflow-hidden"
                style={{background:`${selectedCat.color}20`}}>
                {selectedCat.image_url
                  ? <img src={selectedCat.image_url} className="w-full h-full object-cover" alt=""/>
                  : selectedCat.icon}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {isRtl && selectedCat.name_ar ? selectedCat.name_ar : selectedCat.name}
                </h2>
                <p className="text-xs text-gray-400">{filtered.length} {isRtl?'منتج':'products'}</p>
              </div>
            </div>
          </div>

          {/* Search + sort bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={q} onChange={e=>setQ(e.target.value)}
                placeholder={isRtl?'ابحث...':'Search...'}
                className="w-full ps-9 pe-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-purple-400 transition-all"/>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setSort('best')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors border ${sort==='best'?'border-[#6366f1] text-[#6366f1]':'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                style={sort==='best'?{background:'#6366f110'}:{}}>
                ⭐ {isRtl?'الأعلى تقييماً':'Top Rated'}
              </button>
              <button onClick={()=>setSort('recent')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors border ${sort==='recent'?'border-[#6366f1] text-[#6366f1]':'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                style={sort==='recent'?{background:'#6366f110'}:{}}>
                🕐 {isRtl?'الأحدث':'Newest'}
              </button>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400 text-sm">
              {isRtl?'لا توجد نتائج':'No results found'}
            </div>
          )}

          {/* Tool cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filtered.map(tool => (
              <div key={tool.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className="p-5 pb-3 relative">
                  <span className="absolute top-4 end-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white">
                    <Zap size={10} fill="white"/>{lang==='ar'?'فوري':(tool.delivery_label||'INSTANT')}
                  </span>
                  <div className="w-14 h-14 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center mb-4 overflow-hidden shadow-sm">
                    {tool.image_url
                      ? <img src={tool.image_url} alt={tool.name} className="w-10 h-10 object-contain"/>
                      : <span className="text-xl font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5 pe-16 leading-tight">{tool.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">{tool.description}</p>
                  <div className="mb-1" dir={isRtl?'rtl':'ltr'}>
                    <span className="text-2xl font-bold" style={{color:'#8b5cf6'}}>{price(tool)}</span>
                    <span className="text-sm text-gray-400 mx-1">/</span>
                    <span className="text-sm text-gray-400">{tool.duration_label}</span>
                  </div>
                </div>
                <div className="mx-5 border-t border-gray-100 dark:border-gray-800"/>
                <div className="px-5 py-3 flex items-center justify-between" dir={isRtl?'rtl':'ltr'}>
                  <button onClick={()=>openDetails(tool)}
                    className="flex items-center gap-1.5 text-sm font-medium text-purple-500 hover:text-purple-600 transition-colors">
                    <Info size={15}/>{isRtl?'التفاصيل':'Details'}
                  </button>
                  <Stars rating={tool.rating} count={tool.review_count}/>
                </div>
                <div className="px-4 pb-4 space-y-2" dir={isRtl?'rtl':'ltr'}>
                  {tool.is_out_of_stock ? (
                    <button disabled className="w-full py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-400 text-sm font-bold cursor-default">
                      {isRtl?'نفذت الكمية':'Out of Stock'}
                    </button>
                  ) : (
                    <>
                      {/* Qty controls */}
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{isRtl?'الكمية':'Qty'}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={()=>setLocalQty(tool.id, localQty(tool.id)-1)} disabled={localQty(tool.id)<=1}
                            className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <Minus size={10}/>
                          </button>
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200 w-6 text-center">{localQty(tool.id)}</span>
                          <button onClick={()=>setLocalQty(tool.id, localQty(tool.id)+1)}
                            className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <Plus size={10}/>
                          </button>
                        </div>
                      </div>
                      {/* Action row */}
                      <div className="flex items-center gap-2">
                        <button onClick={()=>toggleFav(tool.id, tool)}
                          className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors"
                          style={isFav(tool.id)
                            ? {background:'#fee2e2',borderColor:'#fca5a5',color:'#ef4444'}
                            : {borderColor:'#e5e7eb',color:'#9ca3af'}}>
                          <Heart size={13} fill={isFav(tool.id)?'currentColor':'none'}/>
                        </button>
                        <button onClick={()=>buy(tool)}
                          className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 shadow-sm"
                          style={{background:'#8b5cf6'}}>
                          🔑 {isRtl?'اشتري الآن':'Buy Now'}
                        </button>
                        <button onClick={()=>handleAddToCart(tool)}
                          className="flex-shrink-0 h-9 px-2.5 rounded-xl border flex items-center gap-1 transition-all text-xs font-bold"
                          style={inCart(tool.id)
                            ? {background:'#d9940118',borderColor:'#d99401',color:'#d99401'}
                            : {borderColor:'#e5e7eb',color:'#6b7280',background:'white'}}>
                          {inCart(tool.id) ? (
                            <><Check size={11}/><ShoppingCart size={12}/><span className="text-[10px] font-black">{getQty(tool.id)}</span></>
                          ) : (
                            <><Plus size={11}/><ShoppingCart size={12}/></>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white pointer-events-none" style={{background:'#8b5cf6'}}>
          {toast}
        </div>
      )}

      {/* Popup */}
      {popup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=>setPopup(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            onClick={e=>e.stopPropagation()}>
            <div className="w-full md:w-[52%] bg-gray-900 rounded-t-3xl md:rounded-t-none md:rounded-s-3xl overflow-hidden flex items-center justify-center flex-shrink-0" style={{minHeight:'260px'}}>
              {popup.video_url ? (
                <iframe src={popup.video_url.replace('watch?v=','embed/').replace('youtu.be/','www.youtube.com/embed/')}
                  className="w-full h-full min-h-[220px] md:min-h-[520px]" allowFullScreen frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-500 p-8 text-center">
                  {popup.image_url
                    ? <img src={popup.image_url} alt={popup.name} className="w-28 h-28 object-contain rounded-2xl"/>
                    : <div className="w-24 h-24 rounded-2xl bg-gray-800 flex items-center justify-center text-4xl font-bold text-gray-500">{popup.name.slice(0,2).toUpperCase()}</div>}
                  <p className="text-sm text-gray-600">{isRtl?'لا يوجد معاينة':'No preview available'}</p>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
                <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#8b5cf6'}}>{isRtl?'حساب خاص':'Private Account'}</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                    <Zap size={9} fill="white"/>{popup.delivery_label||'INSTANT'}
                  </span>
                  <button onClick={()=>setPopup(null)}
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <X size={16}/>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight">{popup.name}</h2>
                <div className="mb-4"><Stars rating={popup.rating} count={popup.review_count}/></div>
                <div className="mb-5">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{price(popup)}</span>
                  <span className="text-base text-gray-400 ms-2">/ {popup.duration_label}</span>
                </div>
                {popup.is_out_of_stock
                  ? <button disabled className="w-full py-3.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-400 font-bold text-base cursor-default mb-5">{isRtl?'نفذت الكمية':'Out of Stock'}</button>
                  : <button onClick={()=>{ setPopup(null); buy(popup) }}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 mb-5"
                      style={{background:'#8b5cf6'}}>
                      🔑 {isRtl?'اشتري الآن':'Buy Now'}
                    </button>
                }
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{popup.description}</p>
                  {popup.features?.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {popup.features.map((f,i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-purple-500 font-bold flex-shrink-0 mt-0.5">✓</span>{f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
