'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { ArrowLeft, Star, Zap, Send, CheckCircle, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react'

type FeaturesLayout = 'grid' | 'list' | 'cards'
type FeaturesPreset = 'grid_center' | 'grid_hover' | 'row_left' | 'row_flat' | 'big_icon' | 'minimal'

interface Block {
  id: string
  layout: 'image_left' | 'image_right' | 'text_only' | 'image_only' | 'features_grid' | 'video' | 'faq' | 'cards_grid'
  image_url?: string
  video_url?: string
  title_en?: string; title_ar?: string
  body_en?: string;  body_ar?: string
  features?: { icon: string; icon_url?: string; en: string; ar: string; subtitle_en?: string; subtitle_ar?: string }[]
  features_layout?: FeaturesLayout
  features_preset?: FeaturesPreset
  faqs?: { q_en: string; q_ar: string; a_en: string; a_ar: string }[]
  cards?: { image_url?: string; title_en?: string; title_ar?: string; subtitle_en?: string; subtitle_ar?: string }[]
}

interface Review {
  id: string; member_name: string; stars: number; comment?: string; created_at: string
  members?: { avatar_url: string | null } | null
}

interface Tool {
  id: string; name: string; description: string; image_url?: string
  price_egp: number; price_usd?: number; duration_label: string; retail_price_egp?: number
  delivery_label: string; rating: number; review_count: number
  sales_count?: number; video_url?: string; features: string[]
  is_out_of_stock: boolean; landing_blocks: Block[]
}

function StarPicker({ value, onChange }: { value: number; onChange:(v:number)=>void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i=>(
        <button key={i} type="button"
          onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(0)}
          onClick={()=>onChange(i)}>
          <Star size={28}
            fill={(hover||value)>=i ? '#F59E0B' : 'none'}
            stroke={(hover||value)>=i ? '#F59E0B' : '#D1D5DB'}
            className="transition-colors"/>
        </button>
      ))}
    </div>
  )
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count/total)*100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500 w-12 text-end flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`, background:'#d99401'}}/>
      </div>
      <span className="text-gray-400 w-6 text-start flex-shrink-0">{count}</span>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${open ? 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-500/5' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>
      <button onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-start">
        {/* Q badge */}
        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-colors"
          style={{ background: open ? '#d99401' : '#d9940120', color: open ? '#fff' : '#d99401' }}>
          Q
        </span>
        <span className={`flex-1 text-sm font-semibold leading-snug transition-colors ${open ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{q}</span>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${open ? 'rotate-180 bg-amber-400/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <ChevronDown size={13} className={open ? 'text-amber-600' : 'text-gray-400'}/>
        </span>
      </button>
      {open && (
        <div className="flex gap-3 px-5 pb-5 pt-1">
          <div className="w-6 flex-shrink-0 flex justify-center">
            <div className="w-px bg-amber-200 dark:bg-amber-700/40 rounded-full"/>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

// Features Grid renderers
function FeatureIcon({ icon, icon_url, size = 28 }: { icon: string; icon_url?: string; size?: number }) {
  if (icon_url) return <img src={icon_url} alt={icon} style={{ width: size, height: size }} className="object-contain"/>
  return <span style={{ fontSize: size }}>{icon}</span>
}

function FeaturesGridBlock({ block, isRtl }: { block: Block; isRtl: boolean }) {
  const title = isRtl ? (block.title_ar||block.title_en) : (block.title_en||block.title_ar)
  const body  = isRtl ? (block.body_ar||block.body_en)  : (block.body_en||block.body_ar)
  const preset = block.features_preset || 'grid_center'
  const features = block.features || []

  const itemTitle = (f: NonNullable<Block['features']>[number]) => isRtl ? (f.ar||f.en) : (f.en||f.ar)
  const itemSub   = (f: NonNullable<Block['features']>[number]) => isRtl ? (f.subtitle_ar||f.subtitle_en) : (f.subtitle_en||f.subtitle_ar)

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
      {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>}
      {body  && <p  className="text-gray-500 dark:text-gray-400 text-sm mb-7 leading-relaxed">{body}</p>}

      {/* grid_center — white cards, icon top-center, title below */}
      {preset === 'grid_center' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {features.map((f,i)=>(
            <div key={i} className="group flex flex-col items-center text-center gap-3 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 hover:border-amber-200 dark:hover:border-amber-700/50 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-all">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{background:'linear-gradient(135deg,#fef3c7,#fde68a)'}}>
                <FeatureIcon icon={f.icon} icon_url={f.icon_url} size={28}/>
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-snug">{itemTitle(f)}</span>
              {itemSub(f) && <span className="text-xs text-gray-400 leading-snug">{itemSub(f)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* grid_hover — cards flip to amber accent color on hover */}
      {preset === 'grid_hover' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {features.map((f,i)=>(
            <div key={i} className="group flex flex-col items-center text-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-amber-400 hover:bg-amber-500 dark:hover:bg-amber-500 transition-all cursor-default">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-500/20 group-hover:bg-white/20 transition-colors">
                <FeatureIcon icon={f.icon} icon_url={f.icon_url} size={26}/>
              </div>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-white transition-colors leading-snug">{itemTitle(f)}</span>
              {itemSub(f) && <span className="text-xs text-gray-400 group-hover:text-white/80 transition-colors leading-snug">{itemSub(f)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* row_left — horizontal rows: rounded icon left, title+subtitle right */}
      {preset === 'row_left' && (
        <div className="space-y-3">
          {features.map((f,i)=>(
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 hover:border-amber-200 dark:hover:border-amber-700/40 transition-colors">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm" style={{background:'linear-gradient(135deg,#fef3c7,#fde68a)'}}>
                <FeatureIcon icon={f.icon} icon_url={f.icon_url} size={24}/>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug">{itemTitle(f)}</p>
                {itemSub(f) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{itemSub(f)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* row_flat — horizontal flat bg rows with square icon box */}
      {preset === 'row_flat' && (
        <div className="space-y-2">
          {features.map((f,i)=>(
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:bg-amber-50 dark:hover:bg-amber-500/5 transition-colors">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                <FeatureIcon icon={f.icon} icon_url={f.icon_url} size={22}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{itemTitle(f)}</p>
                {itemSub(f) && <p className="text-xs text-gray-400 truncate">{itemSub(f)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* big_icon — large circle icon with heavy card border */}
      {preset === 'big_icon' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f,i)=>(
            <div key={i} className="flex flex-col items-center text-center gap-4 p-7 rounded-3xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-lg transition-all">
              <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-amber-200 dark:border-amber-600/40" style={{background:'linear-gradient(135deg,#fef9ee,#fef3c7)'}}>
                <FeatureIcon icon={f.icon} icon_url={f.icon_url} size={36}/>
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white leading-snug">{itemTitle(f)}</p>
                {itemSub(f) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{itemSub(f)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* minimal — no card background, just icon + text, clean & airy */}
      {preset === 'minimal' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {features.map((f,i)=>(
            <div key={i} className="flex flex-col items-center text-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-500/10">
                <FeatureIcon icon={f.icon} icon_url={f.icon_url} size={24}/>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{itemTitle(f)}</p>
              {itemSub(f) && <p className="text-xs text-gray-400 leading-snug">{itemSub(f)}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function ToolLandingPage({ tool, onBack }: { tool: Tool; onBack: ()=>void }) {
  const { t, lang, formatPrice } = useLang()
  const settings = useSiteSettings()
  const isRtl = lang === 'ar'

  const [reviews, setReviews]     = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [dist, setDist]           = useState<{stars:number;count:number}[]>([])
  const [totalReviews, setTotal]  = useState(0)

  const [myStars,   setMyStars]   = useState(0)
  const [myComment, setMyComment] = useState('')
  const [submitting, setSubmit]   = useState(false)
  const [submitted,  setSubmitted]= useState(false)
  const [submitErr,  setSubmitErr]= useState('')

  const price = formatPrice(tool.price_egp, parseFloat(settings.usd_to_egp_rate)||50)

  useEffect(()=>{
    fetch(`/api/tools/${tool.id}/reviews`)
      .then(r=>r.json())
      .then(d=>{ setReviews(d.reviews||[]); setAvgRating(d.avg||0); setTotal(d.total||0); setDist(d.dist||[]) })
  },[tool.id])

  const submitReview = async()=>{
    if (!myStars) return setSubmitErr(t('Please choose a star rating','اختر عدد النجوم أولاً'))
    setSubmit(true); setSubmitErr('')
    const res = await fetch(`/api/tools/${tool.id}/reviews`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ stars: myStars, comment: myComment })
    })
    setSubmit(false)
    if (res.ok) { setSubmitted(true) }
    else { const d = await res.json(); setSubmitErr(d.error||t('Error, try again','حدث خطأ')) }
  }

  const blocks: Block[] = Array.isArray(tool.landing_blocks) ? tool.landing_blocks : []

  const durLabel = lang==='ar'
    ? tool.duration_label.replace('Days','يوم').replace('Day','يوم').replace('Month','شهر').replace('Months','شهر').replace('Year','سنة').replace('Years','سنة')
    : tool.duration_label

  const displayRating = avgRating || tool.rating
  const displayCount  = totalReviews || tool.review_count

  const buyUrl = `/u/checkout?tool_id=${tool.id}`

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950" dir={isRtl?'rtl':'ltr'}>

      {/* ── Hero ── */}
      <div className="p-3 md:p-5 pb-0">
        <div className="relative overflow-hidden rounded-3xl"
          style={{background:'linear-gradient(135deg,#0a0a18 0%,#0d1424 40%,#0a1628 70%,#0d0f1e 100%)'}}>

          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
            <div className="absolute -top-20 left-1/3 w-72 h-72 rounded-full blur-3xl" style={{background:'#d9940118'}}/>
            <div className="absolute top-10 right-10 w-48 h-48 rounded-full blur-3xl" style={{background:'#3b82f610'}}/>
            <div className="absolute bottom-0 left-10 w-56 h-56 rounded-full blur-3xl" style={{background:'#8b5cf608'}}/>
          </div>

          <div className="absolute inset-0 opacity-[0.03] rounded-3xl"
            style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>

          <div className="relative px-5 md:px-10 pt-6 pb-8">
            <button onClick={onBack}
              className="flex items-center gap-2 mb-7 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 group w-fit"
              style={{background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.85)',border:'1px solid rgba(255,255,255,0.18)',backdropFilter:'blur(6px)'}}>
              <ArrowLeft size={14} className={`transition-transform group-hover:${isRtl?'translate-x-0.5':'-translate-x-0.5'} ${isRtl?'rotate-180':''}`}/>
              {t('Back to Store','رجوع للمتجر')}
            </button>

            <div className="flex flex-col md:flex-row items-start gap-7">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl"
                  style={{background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', backdropFilter:'blur(8px)'}}>
                  {tool.image_url
                    ? <img src={tool.image_url} alt={tool.name} className="w-14 h-14 md:w-16 md:h-16 object-contain"/>
                    : <span className="text-3xl font-bold" style={{color:'rgba(255,255,255,0.25)'}}>{tool.name.slice(0,2).toUpperCase()}</span>}
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-3 blur-lg rounded-full" style={{background:'#d99401', opacity:0.5}}/>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{background:'rgba(16,185,129,0.85)'}}>
                    <Zap size={9} fill="white"/>{tool.delivery_label||t('INSTANT','فوري')}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-gray-300"
                    style={{border:'1px solid rgba(255,255,255,0.12)'}}>
                    ⏱ {durLabel}
                  </span>
                  {(tool.sales_count||0) > 0 && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                      style={{background:'rgba(217,148,1,0.85)'}}>
                      <ShoppingCart size={9} strokeWidth={2.5}/>{(tool.sales_count||0).toLocaleString()} {t('sold','مبيعة')}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight tracking-tight">{tool.name}</h1>

                <div className="flex items-center gap-2 mb-5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i=>(
                      <Star key={i} size={14} fill={i<=Math.round(displayRating)?'#F59E0B':'none'} stroke={i<=Math.round(displayRating)?'#F59E0B':'#374151'}/>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-amber-400">{displayRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-600">·</span>
                  <span className="text-sm text-gray-500">{displayCount} {t('reviews','تقييم')}</span>
                </div>

                <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                  <span className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{color:'#d99401'}}>{price}</span>
                  {(tool.retail_price_egp||0) > tool.price_egp && tool.price_egp > 0 && (
                    <span className="text-lg md:text-2xl text-gray-400 line-through font-medium">
                      {formatPrice(tool.retail_price_egp!, parseFloat(settings.usd_to_egp_rate)||50)}
                    </span>
                  )}
                  <span className="text-base md:text-lg text-gray-500 font-medium">/ {durLabel}</span>
                </div>
                {(tool.retail_price_egp||0) > tool.price_egp && tool.price_egp > 0 && (
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-black text-white"
                      style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}>
                      {(() => { const pct = Math.round((1 - tool.price_egp / tool.retail_price_egp!) * 100); return `${pct}% ${t('خصم عن السعر الأصلي','OFF retail price')}` })()}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full md:w-52 flex-shrink-0 flex flex-col gap-3">
                {tool.is_out_of_stock
                  ? <button disabled className="w-full py-3.5 rounded-xl text-gray-400 font-bold cursor-default text-sm"
                      style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)'}}>
                      {t('Out of Stock','نفذت الكمية')}
                    </button>
                  : <button onClick={()=>{ window.location.href=buyUrl }}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{background:'#d99401', boxShadow:'0 6px 20px rgba(217,148,1,0.35)'}}>
                      🛒 {t('Buy Now','اشتري الآن')}
                    </button>
                }
                <div className="flex flex-col gap-1.5 pt-1">
                  {[
                    {icon:'⚡', en:'Instant activation', ar:'تفعيل فوري'},
                    {icon:'🔒', en:'Secure payment',    ar:'دفع آمن'},
                    {icon:'💬', en:'24/7 support',      ar:'دعم على مدار الساعة'},
                  ].map(b=>(
                    <div key={b.en} className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span>{b.icon}</span>{isRtl?b.ar:b.en}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-14">

        {tool.features?.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{t('What\'s included','ماذا يشمل الاشتراك')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tool.features.map((f,i)=>(
                <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-bold flex-shrink-0 mt-0.5" style={{color:'#d99401'}}>✓</span>{f}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Content Blocks ── */}
        {blocks.map((block)=>{
          const title = isRtl ? (block.title_ar||block.title_en) : (block.title_en||block.title_ar)
          const body  = isRtl ? (block.body_ar||block.body_en)  : (block.body_en||block.body_ar)

          /* Features Grid block */
          if (block.layout === 'features_grid') return (
            <FeaturesGridBlock key={block.id} block={block} isRtl={isRtl}/>
          )

          /* Cards Grid block */
          if (block.layout === 'cards_grid') return (
            <section key={block.id}>
              {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>}
              {body  && <p  className="text-gray-500 dark:text-gray-400 text-sm mb-7 leading-relaxed">{body}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                {(block.cards||[]).map((c,i)=>{
                  const cardTitle    = isRtl ? (c.title_ar||c.title_en) : (c.title_en||c.title_ar)
                  const cardSubtitle = isRtl ? (c.subtitle_ar||c.subtitle_en) : (c.subtitle_en||c.subtitle_ar)
                  return (
                    <div key={i} className="group rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-200 dark:hover:border-amber-700/50 hover:shadow-lg transition-all">
                      {c.image_url && (
                        <div className="aspect-square overflow-hidden bg-gray-50 dark:bg-gray-800">
                          <img src={c.image_url} alt={cardTitle||''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                        </div>
                      )}
                      {!c.image_url && (
                        <div className="aspect-square bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 flex items-center justify-center">
                          <span className="text-4xl opacity-30">🖼</span>
                        </div>
                      )}
                      <div className="p-4">
                        {cardTitle    && <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-snug">{cardTitle}</p>}
                        {cardSubtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{cardSubtitle}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )

          /* Video block */
          if (block.layout === 'video') {
            const vUrl = (block.video_url||'').replace('watch?v=','embed/').replace('youtu.be/','www.youtube.com/embed/')
            return (
              <section key={block.id}>
                {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">{title}</h2>}
                {body  && <p  className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">{body}</p>}
                {vUrl && (
                  <div className="relative rounded-3xl p-4 md:p-7"
                    style={{
                      background: 'linear-gradient(135deg, #fef9ee 0%, #fef3c7 40%, #fde68a 100%)',
                    }}>
                    {/* Decorative blobs */}
                    <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full blur-2xl opacity-60" style={{background:'#fde68a'}}/>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-40" style={{background:'#fed7aa'}}/>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video">
                      <iframe src={vUrl} className="w-full h-full" allowFullScreen frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"/>
                    </div>
                  </div>
                )}
              </section>
            )
          }

          /* FAQ block */
          if (block.layout === 'faq') return (
            <section key={block.id}>
              {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>}
              {body  && <p  className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">{body}</p>}
              <div className="space-y-3">
                {(block.faqs||[]).map((faq,i)=>(
                  <FaqItem key={i}
                    q={isRtl?(faq.q_ar||faq.q_en):(faq.q_en||faq.q_ar)}
                    a={isRtl?(faq.a_ar||faq.a_en):(faq.a_en||faq.a_ar)}/>
                ))}
              </div>
            </section>
          )

          /* Text only */
          if (block.layout === 'text_only') return (
            <section key={block.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-10">
              {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>}
              {body  && <p  className="text-gray-600 dark:text-gray-400 leading-relaxed text-base">{body}</p>}
            </section>
          )

          /* Image only */
          if (block.layout === 'image_only') return (
            <section key={block.id} className="rounded-2xl overflow-hidden shadow-lg">
              {block.image_url && <img src={block.image_url} alt={title||''} className="w-full object-cover max-h-[500px]"/>}
            </section>
          )

          /* Image + Text (left / right) */
          const imgRight = block.layout === 'image_right'
          return (
            <section key={block.id} className={`flex flex-col ${imgRight ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-12 items-center`}>
              {block.image_url && (
                <div className="w-full md:w-1/2 rounded-2xl overflow-hidden flex-shrink-0 shadow-xl">
                  <img src={block.image_url} alt={title||''} className="w-full object-cover"/>
                </div>
              )}
              <div className="flex-1 space-y-4">
                {title && <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>}
                {body  && <p  className="text-gray-500 dark:text-gray-400 leading-relaxed text-base">{body}</p>}
              </div>
            </section>
          )
        })}

        {/* ── Reviews ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('Customer Reviews','آراء العملاء')}</h2>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 mb-5">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center flex-shrink-0 w-32">
                <span className="text-6xl font-bold" style={{color:'#d99401'}}>{displayRating.toFixed(1)}</span>
                <div className="flex gap-0.5 my-2">
                  {[1,2,3,4,5].map(i=>(
                    <Star key={i} size={16} fill={i<=Math.round(displayRating)?'#F59E0B':'none'} stroke={i<=Math.round(displayRating)?'#F59E0B':'#D1D5DB'}/>
                  ))}
                </div>
                <span className="text-sm text-gray-400 text-center">{displayCount} {t('reviews','تقييم')}</span>
              </div>
              <div className="flex-1 space-y-2 w-full">
                {dist.map(d=>(
                  <RatingBar key={d.stars} label={`${d.stars} ★`} count={d.count} total={totalReviews}/>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 mb-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t('Write a Review','اكتب تقييمك')}</h3>
            {submitted ? (
              <div className="flex items-center gap-2 text-emerald-500 font-medium">
                <CheckCircle size={20}/>{t('Thank you! Your review is pending approval.','شكراً! تقييمك قيد المراجعة.')}
              </div>
            ) : (
              <div className="space-y-4">
                <StarPicker value={myStars} onChange={setMyStars}/>
                <textarea value={myComment} onChange={e=>setMyComment(e.target.value)}
                  rows={3} placeholder={t('Share your experience (optional)','شارك تجربتك (اختياري)')}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none resize-none transition-all"
                  onFocus={e=>e.currentTarget.style.borderColor='#d99401'}
                  onBlur={e=>e.currentTarget.style.borderColor=''}/>
                {submitErr && <p className="text-red-500 text-sm">{submitErr}</p>}
                <button onClick={submitReview} disabled={submitting||!myStars}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-opacity"
                  style={{background:'#d99401'}}>
                  <Send size={14}/>{submitting ? t('Sending...','جاري الإرسال...') : t('Submit Review','إرسال التقييم')}
                </button>
              </div>
            )}
          </div>

          {reviews.length > 0 && (
            <div className="space-y-3">
              {reviews.map(r=>(
                <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {r.members?.avatar_url ? (
                        <img src={r.members.avatar_url} alt={r.member_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 text-xs font-bold flex-shrink-0">
                          {r.member_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{r.member_name}</span>
                        <div className="flex gap-0.5 mt-1">
                          {[1,2,3,4,5].map(i=>(
                            <Star key={i} size={12} fill={i<=r.stars?'#F59E0B':'none'} stroke={i<=r.stars?'#F59E0B':'#D1D5DB'}/>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(r.created_at).toLocaleDateString(lang==='ar'?'ar-EG':'en-GB',{day:'numeric',month:'short',year:'numeric'})}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
          {reviews.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              {t('No reviews yet. Be the first!','لا توجد تقييمات بعد. كن الأول!')}
            </div>
          )}
        </section>

        <div className="text-center pb-8">
          {!tool.is_out_of_stock && (
            <button onClick={()=>{ window.location.href=buyUrl }}
              className="px-10 py-4 rounded-2xl text-white font-bold text-lg flex items-center gap-2 mx-auto transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{background:'#d99401', boxShadow:'0 8px 24px rgba(217,148,1,0.3)'}}>
              🛒 {t('Buy Now — ','اشتري الآن — ')}{price}
            </button>
          )}
        </div>
      </div>

      {!tool.is_out_of_stock && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{tool.name}</div>
              <div className="text-sm font-bold" style={{color:'#d99401'}}>{price} / {durLabel}</div>
            </div>
            <button onClick={()=>{ window.location.href=buyUrl }}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl text-white font-bold text-sm"
              style={{background:'#d99401'}}>
              🛒 {t('Buy Now','اشتري الآن')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
