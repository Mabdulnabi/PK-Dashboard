'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { Star, Zap, Info, X, Search, MessageCircle, ShoppingCart, Heart, Plus, Minus, Check } from 'lucide-react'
import ToolLandingPage from './ToolLandingPage'
import { useCart } from '@/lib/cart-context'

interface Tool {
  id:string; name:string; description:string; image_url?:string
  price_egp:number; price_usd?:number; duration_label:string
  delivery_label:string; rating:number; review_count:number
  video_url?:string; features:string[]; is_out_of_stock:boolean
  category_slug:string; sort_order:number
  landing_blocks?: any[]
}
interface DbCategory { id:string; name:string; slug:string; color:string; icon:string }
interface Props { category: 'shared'|'private'|'bundle' }

function Stars({ rating, count }: { rating:number; count:number }) {
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

export default function ShopPage({ category }: Props) {
  const { t, lang, dir, currency, formatPrice } = useLang()
  const settings = useSiteSettings()
  const { addToCart, removeFromCart, inCart, getQty, toggleFav, isFav } = useCart()
  const [tools,     setTools]     = useState<Tool[]>([])
  const [loading,   setLoading]   = useState(true)
  const [q,         setQ]         = useState('')
  const [sort,      setSort]      = useState<'best'|'recent'>('best')
  const [popup,     setPopup]     = useState<Tool|null>(null)
  const [landing,   setLanding]   = useState<Tool|null>(null)
  const [catFilter, setCatFilter] = useState('all')
  const [categories,setCategories]= useState<DbCategory[]>([])
  const [qtys,      setQtys]      = useState<Record<string,number>>({})
  const [toast,     setToast]     = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const localQty = (id: string) => qtys[id] ?? (inCart(id) ? getQty(id) : 1)
  const setLocalQty = (id: string, v: number) => setQtys(p => ({ ...p, [id]: Math.max(1, v) }))

  const CATEGORY_META = {
    shared:  {
      badge: t('Shared Tools','أدوات مشتركة'), badgeColor:'#3b82f6',
      title: t('Access Premium ','الوصول إلى '), accent: t('Shared Tools','الأدوات المشتركة'),
      sub: t('Browse and activate shared premium tools instantly.','تصفح وفعّل الأدوات المميزة المشتركة فوراً.'),
    },
    private: {
      badge: t('Private Store','المتجر الشخصي'), badgeColor:'#8b5cf6',
      title: t('Exclusive ','حسابات '), accent: t('Private Accounts','خاصة حصرية'),
      sub: t('Private accounts and licenses just for you.','حسابات وتراخيص خاصة حصرية لك.'),
    },
    bundle:  {
      badge: t('Bundle Tools','حزم الأدوات'), badgeColor:'#f59e0b',
      title: t('Best Value ','أفضل قيمة '), accent: t('Tool Bundles','في حزم الأدوات'),
      sub: t('Curated bundles of top tools at unbeatable prices.','حزم مجمّعة من أفضل الأدوات بأسعار لا تُقارن.'),
    },
  }
  const meta = CATEGORY_META[category]

  useEffect(()=>{
    fetch(`/api/member/shop?category=${category}`)
      .then(r=>r.json())
      .then(d=>{
        setTools(d.tools||[])
        const catIds=[...new Set((d.tools||[]).filter((x:any)=>x.category_id).map((x:any)=>x.category_id))]
        if(catIds.length>0) fetch('/api/member/categories').then(r=>r.json()).then(cd=>setCategories(cd.categories||[]))
        setLoading(false)
      })
  },[category])

  const price = (tool:Tool) =>
    formatPrice(tool.price_egp, parseFloat(settings.usd_to_egp_rate)||50)

  const filtered = tools
    .filter(tool=>(!q||tool.name.toLowerCase().includes(q.toLowerCase()))&&(catFilter==='all'||(tool as any).category_id===catFilter))
    .sort((a,b)=>sort==='best'?b.rating-a.rating:b.sort_order-a.sort_order)

  const buy = (tool:Tool) => { window.location.href=`/u/checkout?tool_id=${tool.id}` }

  const handleAddToCart = async (tool: Tool) => {
    const qty = category === 'private' ? localQty(tool.id) : 1
    if (inCart(tool.id) && category !== 'private') {
      removeFromCart(tool.id)
      showToast(t('Removed from cart','تمت الإزالة من السلة'))
    } else {
      await addToCart(tool.id, qty)
      showToast(t('Added to cart ✓','تمت الإضافة للسلة ✓'))
    }
  }

  const openDetails = (tool: Tool) => {
    const hasBlocks = Array.isArray(tool.landing_blocks) && tool.landing_blocks.length > 0
    if (hasBlocks) setLanding(tool)
    else setPopup(tool)
  }

  if (landing) return <ToolLandingPage tool={landing as any} onBack={()=>setLanding(null)}/>

  return (
    <div className="p-3 md:p-6" dir={dir}>
      {/* Banner */}
      <div className="rounded-2xl mb-5 p-5 md:p-8" style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
              style={{border:`1px solid ${meta.badgeColor}50`,background:`${meta.badgeColor}18`}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{background:meta.badgeColor}}/>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{color:meta.badgeColor}}>{meta.badge}</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {meta.title}<span style={{color:'#d99401'}}>{meta.accent}</span>
            </h1>
            <p className="text-sm text-gray-300">{meta.sub}</p>
          </div>
          <a href={`https://wa.me/${(settings.whatsapp_number||'').replace(/\D/g,'')}`} target="_blank"
            className="bg-green-500/20 border border-green-500/30 rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-green-500/30 transition-colors flex-shrink-0">
            <MessageCircle size={20} className="text-green-400"/>
            <div className="text-end">
              <p className="text-xs text-gray-400">{t('WhatsApp Support','دعم واتساب')}</p>
              <p className="text-sm font-bold text-white" dir="ltr">{settings.whatsapp_number||'+20 100 000 0000'}</p>
            </div>
          </a>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 mb-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
        {/* Search — full width */}
        <div className="relative w-full">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('Search tools...','ابحث عن أداة...')}
            className="w-full ps-9 pe-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#d99401] transition-all"/>
        </div>
        {/* Filters — one row */}
        <div className="flex items-center gap-2">
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300 outline-none cursor-pointer">
            <option value="all">{t('All','الكل')} ({tools.length})</option>
            {categories.filter(c=>tools.some((tool:any)=>tool.category_id===c.id)).map(c=>(
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <button onClick={()=>setSort('best')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 border ${sort==='best'?'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200':'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            ⭐ {t('Top Rated','الأعلى تقييماً')}
          </button>
          <button onClick={()=>setSort('recent')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 border ${sort==='recent'?'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200':'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            🕐 {t('New','الأحدث')}
          </button>
        </div>
      </div>

      {/* Section label */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{background:category==='shared'?'#3B82F6':category==='private'?'#8B5CF6':'#F59E0B'}}>
          {category==='shared'?'🔗':category==='private'?'🔒':'📦'}
        </div>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{meta.title}</h2>
        <span className="text-sm text-gray-400">({filtered.length})</span>
      </div>

      {loading&&<div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/></div>}

      {/* Tool cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {filtered.map(tool=>(
          <div key={tool.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            {/* Card body - always LTR for layout, content direction handled per element */}
            <div className="p-5 pb-3 relative">
              {/* Badge */}
              <span className="absolute top-4 end-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white">
                <Zap size={10} fill="white"/>{lang==='ar'?'فوري':(tool.delivery_label||'INSTANT')}
              </span>
              {/* Logo - always LTR */}
              <div className="w-14 h-14 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center mb-4 overflow-hidden shadow-sm">
                {tool.image_url
                  ? <img src={tool.image_url} alt={tool.name} className="w-10 h-10 object-contain"/>
                  : <span className="text-xl font-bold text-gray-300">{tool.name.slice(0,2).toUpperCase()}</span>
                }
              </div>
              {/* Name & description - always LTR */}
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5 pe-16 leading-tight">{tool.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">{tool.description}</p>
              {/* Price - RTL in Arabic, LTR in English */}
              <div className="mb-1" dir={lang==='ar'?'rtl':'ltr'}>
                <span className="text-2xl font-bold" style={{color:'#d99401'}}>{price(tool)}</span>
                <span className="text-sm text-gray-400 mx-1">/</span>
                <span className="text-sm text-gray-400">{lang==='ar'?tool.duration_label.replace('Days','يوم').replace('Day','يوم').replace('Month','شهر').replace('Months','شهر').replace('Year','سنة').replace('Years','سنة'):tool.duration_label}</span>
              </div>
            </div>
            <div className="mx-5 border-t border-gray-100 dark:border-gray-800"/>
            <div className="px-5 py-3 flex items-center justify-between" dir={lang==='ar'?'rtl':'ltr'}>
              <button onClick={()=>openDetails(tool)}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors">
                <Info size={15}/>{t('Details','التفاصيل')}
              </button>
              <Stars rating={tool.rating} count={tool.review_count}/>
            </div>
            <div className="px-4 pb-4 space-y-2" dir={lang==='ar'?'rtl':'ltr'}>
              {tool.is_out_of_stock ? (
                <button disabled className="w-full py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-400 text-sm font-bold cursor-default">
                  {t('Out of Stock','نفذت الكمية')}
                </button>
              ) : (
                <>
                  {/* Private: qty controls above buttons */}
                  {category === 'private' && (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('Qty','الكمية')}</span>
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
                  )}
                  {/* Action row: [Fav] [Buy Now (large)] [Cart (small)] */}
                  <div className="flex items-center gap-2">
                    {/* Fav — small icon */}
                    <button onClick={()=>toggleFav(tool.id)}
                      className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors"
                      style={isFav(tool.id)
                        ? {background:'#fee2e2',borderColor:'#fca5a5',color:'#ef4444'}
                        : {borderColor:'#e5e7eb',color:'#9ca3af'}}>
                      <Heart size={13} fill={isFav(tool.id)?'currentColor':'none'}/>
                    </button>
                    {/* Buy Now — large gold */}
                    <button onClick={()=>buy(tool)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                      style={{background:'#d99401'}}>
                      <ShoppingCart size={13}/>{t('Buy Now','شراء الآن')}
                    </button>
                    {/* Add to Cart — small */}
                    <button onClick={()=>handleAddToCart(tool)}
                      className="w-9 h-9 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors relative"
                      style={inCart(tool.id)
                        ? {background:'#d9940120',borderColor:'#d9940170',color:'#d99401'}
                        : {borderColor:'#e5e7eb',color:'#6b7280'}}>
                      {inCart(tool.id)
                        ? <Check size={13}/>
                        : <Plus size={13}/>}
                      {inCart(tool.id) && category === 'private' && getQty(tool.id) > 0 && (
                        <span className="absolute -top-1.5 -end-1.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5" style={{background:'#d99401'}}>
                          {getQty(tool.id)}
                        </span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white pointer-events-none" style={{background:'#d99401'}}>
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
                    : <div className="w-24 h-24 rounded-2xl bg-gray-800 flex items-center justify-center text-4xl font-bold text-gray-500">{popup.name.slice(0,2).toUpperCase()}</div>
                  }
                  <p className="text-sm text-gray-600">{t('No preview available','لا يوجد معاينة')}</p>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
                <span className="text-xs font-bold uppercase tracking-widest" style={{color:'#d99401'}}>{t('Premium Tool','أداة مميزة')}</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                    <Zap size={9} fill="white"/>{popup.delivery_label||t('INSTANT','فوري')}
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
                  <span className="text-base text-gray-400 ms-2">/ {lang==='ar'?popup.duration_label.replace('Days','يوم').replace('Day','يوم').replace('Month','شهر').replace('Months','شهر'):popup.duration_label}</span>
                </div>
                {popup.is_out_of_stock
                  ? <button disabled className="w-full py-3.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-400 font-bold text-base cursor-default mb-5">{t('Out of Stock','نفذت الكمية')}</button>
                  : <div className="flex gap-2 mb-5">
                      <button onClick={()=>toggleFav(popup.id)}
                        className="w-12 h-12 rounded-xl border flex items-center justify-center transition-colors flex-shrink-0"
                        style={isFav(popup.id)
                          ? {background:'#fee2e2',borderColor:'#fca5a5',color:'#ef4444'}
                          : {borderColor:'#e5e7eb',color:'#9ca3af'}}>
                        <Heart size={16} fill={isFav(popup.id)?'currentColor':'none'}/>
                      </button>
                      <button onClick={()=>{ handleAddToCart(popup); setPopup(null) }}
                        className="flex-1 py-3.5 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2"
                        style={inCart(popup.id) && category !== 'private'
                          ? {background:'#d9940120',color:'#d99401',border:'1.5px solid #d9940150'}
                          : {background:'#d99401',color:'white'}}>
                        {inCart(popup.id) && category !== 'private'
                          ? <><Check size={15}/>{t('In Cart','في السلة')}</>
                          : <><ShoppingCart size={15}/>{t('Add to Cart','أضف للسلة')}</>}
                      </button>
                      <button onClick={()=>{ setPopup(null); buy(popup) }}
                        className="flex-1 py-3.5 rounded-xl text-white font-bold text-base transition-colors shadow-lg flex items-center justify-center gap-2" style={{background:'#111827'}}>
                        {t('Buy Now','اشتري الآن')}
                      </button>
                    </div>
                }
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{popup.description}</p>
                  {popup.features?.length>0 && (
                    <div className="flex flex-col gap-2">
                      {popup.features.map((f,i)=>(
                        <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                          <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>{f}
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
