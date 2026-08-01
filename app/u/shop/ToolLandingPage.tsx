'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { ArrowLeft, Star, Zap, Send, CheckCircle } from 'lucide-react'

interface Block {
  id: string
  layout: 'image_left' | 'image_right' | 'text_only' | 'image_only'
  image_url?: string
  title_en?: string; title_ar?: string
  body_en?: string;  body_ar?: string
}

interface Review {
  id: string; member_name: string; stars: number; comment?: string; created_at: string
}

interface Tool {
  id: string; name: string; description: string; image_url?: string
  price_egp: number; price_usd?: number; duration_label: string
  delivery_label: string; rating: number; review_count: number
  video_url?: string; features: string[]; is_out_of_stock: boolean
  landing_blocks: Block[]
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
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`, background:'#F59E0B'}}/>
      </div>
      <span className="text-gray-400 w-6 text-start flex-shrink-0">{count}</span>
    </div>
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

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950" dir={isRtl?'rtl':'ltr'}>

      {/* ── Hero ── */}
      <div style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)'}}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          <button onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm">
            <ArrowLeft size={16} className={isRtl?'rotate-180':''}/>
            {t('Back to Shop','رجوع للمتجر')}
          </button>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {tool.image_url
                ? <img src={tool.image_url} alt={tool.name} className="w-14 h-14 object-contain"/>
                : <span className="text-3xl font-bold text-white/40">{tool.name.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                  <Zap size={9} fill="white"/>{tool.delivery_label||t('INSTANT','فوري')}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 leading-tight">{tool.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i=>(
                    <Star key={i} size={14} fill={i<=Math.round(avgRating||tool.rating)?'#F59E0B':'none'} stroke={i<=Math.round(avgRating||tool.rating)?'#F59E0B':'#6B7280'}/>
                  ))}
                </div>
                <span className="text-sm text-gray-300">{(avgRating||tool.rating).toFixed(1)}</span>
                <span className="text-sm text-gray-500">({totalReviews||tool.review_count} {t('reviews','تقييم')})</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{color:'#d99401'}}>{price}</span>
                <span className="text-gray-400">/ {lang==='ar'
                  ? tool.duration_label.replace('Days','يوم').replace('Day','يوم').replace('Month','شهر').replace('Months','شهر').replace('Year','سنة')
                  : tool.duration_label}</span>
              </div>
            </div>
            <div className="w-full md:w-auto flex-shrink-0">
              {tool.is_out_of_stock
                ? <button disabled className="w-full md:w-48 py-4 rounded-2xl bg-gray-600 text-gray-400 font-bold cursor-default">{t('Out of Stock','نفذت الكمية')}</button>
                : <button onClick={()=>{ window.location.href=`/u/checkout?tool_id=${tool.id}` }}
                    className="w-full md:w-48 py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-colors flex items-center justify-center gap-2" style={{background:'#d99401'}}>
                    🔒 {t('Buy Now','اشتري الآن')}
                  </button>
              }
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-16">

        {/* ── Description & features ── */}
        {(tool.description || tool.features?.length > 0) && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
            {tool.description && <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base mb-6">{tool.description}</p>}
            {tool.features?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tool.features.map((f,i)=>(
                  <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>{f}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Content Blocks ── */}
        {blocks.map((block, i)=>{
          const title = isRtl ? (block.title_ar||block.title_en) : (block.title_en||block.title_ar)
          const body  = isRtl ? (block.body_ar||block.body_en)  : (block.body_en||block.body_ar)
          const imgRight = block.layout === 'image_right'

          if (block.layout === 'text_only') return (
            <section key={block.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-10">
              {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>}
              {body  && <p  className="text-gray-600 dark:text-gray-400 leading-relaxed text-base">{body}</p>}
            </section>
          )

          if (block.layout === 'image_only') return (
            <section key={block.id} className="rounded-2xl overflow-hidden">
              {block.image_url && <img src={block.image_url} alt={title||''} className="w-full object-cover max-h-[480px]"/>}
            </section>
          )

          return (
            <section key={block.id} className={`flex flex-col ${imgRight ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center`}>
              {block.image_url && (
                <div className="w-full md:w-1/2 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img src={block.image_url} alt={title||''} className="w-full object-cover"/>
                </div>
              )}
              <div className="flex-1 space-y-4">
                {title && <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>}
                {body  && <p  className="text-gray-600 dark:text-gray-400 leading-relaxed text-base">{body}</p>}
              </div>
            </section>
          )
        })}

        {/* ── Reviews section ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('Customer Reviews','آراء العملاء')}</h2>

          {/* Rating summary */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Big number */}
              <div className="flex flex-col items-center flex-shrink-0 w-32">
                <span className="text-6xl font-bold" style={{color:'#F59E0B'}}>{(avgRating||tool.rating).toFixed(1)}</span>
                <div className="flex gap-0.5 my-2">
                  {[1,2,3,4,5].map(i=>(
                    <Star key={i} size={16} fill={i<=Math.round(avgRating||tool.rating)?'#F59E0B':'none'} stroke={i<=Math.round(avgRating||tool.rating)?'#F59E0B':'#D1D5DB'}/>
                  ))}
                </div>
                <span className="text-sm text-gray-400">{totalReviews||tool.review_count} {t('reviews','تقييم')}</span>
              </div>
              {/* Bars */}
              <div className="flex-1 space-y-2 w-full">
                {dist.map(d=>(
                  <RatingBar key={d.stars} label={`${d.stars} ${t('★','★')}`} count={d.count} total={totalReviews}/>
                ))}
              </div>
            </div>
          </div>

          {/* Write a review */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 mb-6">
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
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#d99401] resize-none transition-all"/>
                {submitErr && <p className="text-red-500 text-sm">{submitErr}</p>}
                <button onClick={submitReview} disabled={submitting||!myStars}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-50"
                  style={{background:'#d99401'}}>
                  <Send size={14}/>{submitting ? t('Sending...','جاري الإرسال...') : t('Submit Review','إرسال التقييم')}
                </button>
              </div>
            )}
          </div>

          {/* Review list */}
          {reviews.length > 0 && (
            <div className="space-y-4">
              {reviews.map(r=>(
                <div key={r.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{r.member_name}</span>
                      <div className="flex gap-0.5 mt-1">
                        {[1,2,3,4,5].map(i=>(
                          <Star key={i} size={12} fill={i<=r.stars?'#F59E0B':'none'} stroke={i<=r.stars?'#F59E0B':'#D1D5DB'}/>
                        ))}
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
            <div className="text-center py-12 text-gray-400 text-sm">{t('No reviews yet. Be the first!','لا توجد تقييمات بعد. كن الأول!')}</div>
          )}
        </section>

        {/* ── Bottom CTA ── */}
        <div className="text-center pb-6">
          {tool.is_out_of_stock
            ? <button disabled className="px-10 py-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-400 font-bold cursor-default">{t('Out of Stock','نفذت الكمية')}</button>
            : <button onClick={()=>{ window.location.href=`/u/checkout?tool_id=${tool.id}` }}
                className="px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-colors flex items-center gap-2 mx-auto" style={{background:'#d99401'}}>
                🔒 {t('Buy Now — ','اشتري الآن — ')}{price}
              </button>
          }
        </div>

      </div>
    </div>
  )
}
