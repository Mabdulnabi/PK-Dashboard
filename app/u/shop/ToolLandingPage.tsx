'use client'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { ArrowLeft, Star, Zap, Send, CheckCircle, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react'

type FeaturesLayout = 'grid' | 'list' | 'cards'
type FeaturesPreset = 'grid_center' | 'grid_hover' | 'row_left' | 'row_flat' | 'big_icon' | 'minimal'

interface Block {
  id: string
  layout: 'image_left' | 'image_right' | 'text_only' | 'image_only' | 'features_grid' | 'video' | 'faq' | 'cards_grid' | 'marquee' | 'testimonials' | 'banners' | 'countdown' | 'stats' | 'content' | 'how_to_work' | 'html'
  image_url?: string
  video_url?: string
  title_en?: string; title_ar?: string
  body_en?: string;  body_ar?: string
  features?: { icon: string; icon_url?: string; icon_size?: number; en: string; ar: string; subtitle_en?: string; subtitle_ar?: string }[]
  features_layout?: FeaturesLayout
  features_preset?: FeaturesPreset
  faqs?: { q_en: string; q_ar: string; a_en: string; a_ar: string }[]
  cards?: { image_url?: string; title_en?: string; title_ar?: string; subtitle_en?: string; subtitle_ar?: string }[]
  marquee_items?: { icon_url?: string; text_en?: string; text_ar?: string }[]
  marquee_bg?: string
  marquee_text_color?: string
  marquee_speed?: number
  testimonials?: { author_name: string; author_image?: string; review: string; type?: string; review_heading?: string }[]
  testimonial_colors?: { variant: number; bg_color?: string; hover_color?: string; review_color?: string; hover_text_color?: string; author_name_color?: string; author_name_color_hover?: string; review_heading_color?: string; review_heading_color_hover?: string }
  testimonial_title_align?: string
  testimonial_desc?: string
  testimonial_desc_color?: string
  testimonial_desc_align?: string
  banner_variant?: number
  banner_images?: { image_url: string; link_url?: string }[]
  banner_gap?: number
  banner_radius?: number
  countdown_preset?: 1 | 2 | 3
  countdown_hours?: number
  countdown_title_en?: string
  countdown_title_ar?: string
  countdown_number_color?: string
  countdown_label_color?: string
  countdown_box_bg?: string
  stats_items?: { value: number; suffix?: string; label_en?: string; label_ar?: string }[]
  stats_bg?: string
  stats_number_color?: string
  stats_label_color?: string
  stats_card_bg?: string
  stats_number_size?: number
  stats_label_size?: number
  stats_card_min_width?: number
  stats_card_padding?: number
  content_helper_en?: string
  content_helper_ar?: string
  content_helper_color?: string
  content_title_align?: 'left' | 'center' | 'right'
  content_desc_align?: 'left' | 'center' | 'right'
  content_desc_color?: string
  content_img_link?: string
  content_img_side?: 'left' | 'right'
  content_btn_text_en?: string
  content_btn_text_ar?: string
  content_btn_bg?: string
  content_btn_link?: string
  content_stats?: { value: string; suffix?: string; label_en?: string; label_ar?: string }[]
  hiw_variant?: 1 | 2 | 3 | 4 | 5
  hiw_steps?: { title_en?: string; title_ar?: string; desc_en?: string; desc_ar?: string; image_url?: string }[]
  hiw_helper_en?: string; hiw_helper_ar?: string; hiw_helper_color?: string
  hiw_title_align?: 'left' | 'center' | 'right'
  hiw_desc_color?: string
  hiw_step_title_color?: string
  hiw_step_desc_color?: string
  hiw_accent_color?: string
  hiw_bg?: string
  hiw_bg_image?: string
  html_code?: string
}

interface Review {
  id: string; member_name: string; stars: number; comment?: string; created_at: string
  members?: { avatar_url: string | null } | null
}

interface ToolVariant {
  name_en: string; name_ar: string; name?: string
  price: string; retail_price?: string; discount_price?: string; cost: string; stock: string; sku: string
}

interface Tool {
  id: string; name: string; description: string; image_url?: string
  price_egp: number; price_usd?: number; duration_label: string; retail_price_egp?: number
  delivery_label: string; rating: number; review_count: number
  sales_count?: number; video_url?: string; features: string[]
  is_out_of_stock: boolean; landing_blocks: Block[]
  sku?: string
  fake_visits_min?: number; fake_visits_max?: number
  fake_stock_min?: number; fake_stock_max?: number
  variants?: ToolVariant[]
  warranty_label?: string
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
    <div style={{
      marginBottom:'1rem', background:'#ffffff', borderStyle:'solid', borderWidth:1,
      boxShadow:'-6px 6px 0px 0px #d99401', borderColor:'#0f4c75',
      borderRadius: open ? '16px 16px 16px 0' : '16px 16px 16px 0',
      overflow:'hidden', width:'100%', boxSizing:'border-box' as const,
      transition:'box-shadow .2s',
    }}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:12,
        padding:'18px 24px', fontSize:16, fontWeight:600, lineHeight:'20px',
        color:'rgba(72,59,54,1)', background:'none', border:'none', cursor:'pointer',
        textAlign:'start',
      }}>
        <span style={{ flex:1 }}>{q}</span>
        <span style={{
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          borderRadius:6, padding:1, background:'rgba(217,148,1,0.52)',
          color:'#52443a', transition:'transform .2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink:0,
        }}>
          <ChevronDown size={20}/>
        </span>
      </button>
      {open && (
        <div style={{
          padding:20, borderTop:'1px solid rgba(217,148,1,0.6)',
          fontSize:16, color:'#57637a', fontWeight:400, lineHeight:'1.6',
        }}>
          {a}
        </div>
      )}
    </div>
  )
}

// Cairo font for Arabic landing pages
const CAIRO_LINK = typeof document !== 'undefined' ? (()=>{
  if (!document.getElementById('pk-cairo-font')) {
    const l = document.createElement('link')
    l.id = 'pk-cairo-font'; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
    document.head.appendChild(l)
  }
})() : null

function useArabicFont(isRtl: boolean) {
  useEffect(()=>{
    if (!isRtl) return
    if (document.getElementById('pk-cairo-font')) return
    const l = document.createElement('link')
    l.id = 'pk-cairo-font'; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
    document.head.appendChild(l)
  }, [isRtl])
}

// Hero CSS — aura glow + live dot + responsive split
const HERO_CSS = `
@keyframes pk-aura-pulse {
  0%, 100% { opacity: 0.25; transform: scale(0.96); }
  50%       { opacity: 0.48; transform: scale(1.06); }
}
@keyframes pk-live-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}
.pk-hero-body  { display: flex; align-items: stretch; }
.pk-hero-vdiv  { width: 1px; background: rgba(0,0,0,0.06); flex-shrink: 0; margin: 24px 0; }
.pk-hero-left  { flex: 0 0 58%; min-width: 270px; padding: 26px 28px 30px; box-sizing: border-box; }
.pk-hero-right { flex: 1 1 200px; min-width: 200px; padding: 26px 28px 30px; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; }
@media (max-width: 640px) {
  .pk-hero-body  { flex-direction: column; }
  .pk-hero-vdiv  { width: auto; height: 1px; margin: 0 28px; }
  .pk-hero-left  { flex: none; width: 100%; padding-bottom: 18px; }
  .pk-hero-right { flex: none; width: 100%; padding-top: 20px; }
}
`
function injectHeroCss() {
  if (typeof document === 'undefined' || document.getElementById('pk-hero-css')) return
  const s = document.createElement('style'); s.id = 'pk-hero-css'; s.textContent = HERO_CSS
  document.head.appendChild(s)
}

// Gold shimmer keyframes injected once
const GOLD_SHIMMER_CSS = `
@keyframes pk-gold-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
.pk-gold-hover {
  position: relative; overflow: hidden;
  transition: border-color .25s, box-shadow .25s, transform .2s;
}
.pk-gold-hover::after {
  content: '';
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(217,148,1,.18) 50%, transparent 70%);
  background-size: 200% 100%;
  transition: opacity .25s;
}
.pk-gold-hover:hover::after { opacity: 1; animation: pk-gold-shimmer .7s linear; }
.pk-gold-hover:hover { border-color: #d99401 !important; box-shadow: 0 0 0 1.5px #d9940130, 0 6px 22px #d9940118; transform: translateY(-2px); }
`
function injectGoldShimmer() {
  if (typeof document === 'undefined' || document.getElementById('pk-gold-shimmer-css')) return
  const s = document.createElement('style'); s.id = 'pk-gold-shimmer-css'; s.textContent = GOLD_SHIMMER_CSS
  document.head.appendChild(s)
}

function injectPlusJakarta() {
  if (typeof document === 'undefined' || document.getElementById('pk-jakarta-font')) return
  const l = document.createElement('link')
  l.id = 'pk-jakarta-font'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
  document.head.appendChild(l)
}

// Features Grid renderers
function FeatureIcon({ icon_url, size = 28 }: { icon_url?: string; size?: number }) {
  if (!icon_url) return null
  return <img src={icon_url} alt="" style={{ width: size, height: size }} className="object-contain"/>
}

function FeaturesGridBlock({ block, isRtl }: { block: Block; isRtl: boolean }) {
  const title = isRtl ? (block.title_ar||block.title_en) : (block.title_en||block.title_ar)
  const body  = isRtl ? (block.body_ar||block.body_en)  : (block.body_en||block.body_ar)
  const preset = block.features_preset || 'grid_center'
  const features = block.features || []

  useArabicFont(isRtl)
  useEffect(()=>{ injectGoldShimmer() }, [])

  const fontStyle = isRtl ? { fontFamily: "'Cairo', sans-serif" } : {}
  const itemTitle = (f: NonNullable<Block['features']>[number]) => isRtl ? (f.ar||f.en) : (f.en||f.ar)
  const itemSub   = (f: NonNullable<Block['features']>[number]) => isRtl ? (f.subtitle_ar||f.subtitle_en) : (f.subtitle_en||f.subtitle_ar)

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8" style={fontStyle}>
      {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>}
      {body  && <p  className="text-gray-500 dark:text-gray-400 text-sm mb-7 leading-relaxed">{body}</p>}

      {/* grid_center */}
      {preset === 'grid_center' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {features.map((f,i)=>(
            <div key={i} className="pk-gold-hover group flex flex-col items-center text-center gap-3 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
              {f.icon_url && (
                <div className="rounded-2xl flex items-center justify-center shadow-sm p-2" style={{background:'linear-gradient(135deg,#fef3c7,#fde68a)'}}>
                  <FeatureIcon icon_url={f.icon_url} size={f.icon_size||40}/>
                </div>
              )}
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-snug">{itemTitle(f)}</span>
              {itemSub(f) && <span className="text-xs text-gray-400 leading-snug">{itemSub(f)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* grid_hover */}
      {preset === 'grid_hover' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {features.map((f,i)=>(
            <div key={i} className="pk-gold-hover group flex flex-col items-center text-center gap-3 p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:!bg-amber-500 hover:!border-amber-400 cursor-default transition-colors">
              {f.icon_url && (
                <div className="rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-500/20 group-hover:bg-white/20 transition-colors p-2">
                  <FeatureIcon icon_url={f.icon_url} size={f.icon_size||40}/>
                </div>
              )}
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-white transition-colors leading-snug">{itemTitle(f)}</span>
              {itemSub(f) && <span className="text-xs text-gray-400 group-hover:text-white/80 transition-colors leading-snug">{itemSub(f)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* row_left */}
      {preset === 'row_left' && (
        <div className="space-y-3">
          {features.map((f,i)=>(
            <div key={i} className="pk-gold-hover flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              {f.icon_url && (
                <div className="rounded-full flex items-center justify-center flex-shrink-0 shadow-sm p-2" style={{background:'linear-gradient(135deg,#fef3c7,#fde68a)'}}>
                  <FeatureIcon icon_url={f.icon_url} size={f.icon_size||36}/>
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug">{itemTitle(f)}</p>
                {itemSub(f) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{itemSub(f)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* row_flat */}
      {preset === 'row_flat' && (
        <div className="space-y-2">
          {features.map((f,i)=>(
            <div key={i} className="pk-gold-hover flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-transparent">
              {f.icon_url && (
                <div className="rounded-lg flex items-center justify-center flex-shrink-0 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-1.5">
                  <FeatureIcon icon_url={f.icon_url} size={f.icon_size||32}/>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{itemTitle(f)}</p>
                {itemSub(f) && <p className="text-xs text-gray-400 truncate">{itemSub(f)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* big_icon */}
      {preset === 'big_icon' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f,i)=>(
            <div key={i} className="pk-gold-hover flex flex-col items-center text-center gap-4 p-7 rounded-3xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              {f.icon_url && (
                <div className="rounded-full flex items-center justify-center flex-shrink-0 border-2 border-amber-200 dark:border-amber-600/40 p-3" style={{background:'linear-gradient(135deg,#fef9ee,#fef3c7)'}}>
                  <FeatureIcon icon_url={f.icon_url} size={f.icon_size||56}/>
                </div>
              )}
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white leading-snug">{itemTitle(f)}</p>
                {itemSub(f) && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{itemSub(f)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* minimal */}
      {preset === 'minimal' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {features.map((f,i)=>(
            <div key={i} className="pk-gold-hover flex flex-col items-center text-center gap-2.5 rounded-2xl border border-transparent p-4">
              {f.icon_url && (
                <div className="rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-500/10 p-2">
                  <FeatureIcon icon_url={f.icon_url} size={f.icon_size||32}/>
                </div>
              )}
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{itemTitle(f)}</p>
              {itemSub(f) && <p className="text-xs text-gray-400 leading-snug">{itemSub(f)}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// â”€â”€ Platform icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FacebookIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
}
function GoogleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
}

function StarRow({ n = 5 }: { n?: number }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i<=n?'#FFB800':'#E5E7EB'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  )
}

// â”€â”€ How To Work Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HowToWorkBlock({ block, isRtl }: { block: Block; isRtl: boolean }) {
  const v           = block.hiw_variant || 1
  const steps       = block.hiw_steps || []
  const accent      = block.hiw_accent_color || '#d99401'
  const stepTitleC  = block.hiw_step_title_color || '#111827'
  const stepDescC   = block.hiw_step_desc_color  || '#586174'
  const helper      = isRtl ? (block.hiw_helper_ar || block.hiw_helper_en) : (block.hiw_helper_en || block.hiw_helper_ar)
  const helperColor = block.hiw_helper_color || '#d99401'
  const title       = isRtl ? (block.title_ar || block.title_en) : (block.title_en || block.title_ar)
  const desc        = isRtl ? (block.body_ar  || block.body_en)  : (block.body_en  || block.body_ar)
  const titleAlign  = block.hiw_title_align || 'center'
  const descColor   = block.hiw_desc_color || '#757095'
  const sectionBg   = block.hiw_bg || 'transparent'
  const bgImage     = block.hiw_bg_image

  const getStep = (s: typeof steps[0]) => ({
    title : isRtl ? (s.title_ar || s.title_en) : (s.title_en || s.title_ar),
    desc  : isRtl ? (s.desc_ar  || s.desc_en)  : (s.desc_en  || s.desc_ar),
  })

  const SectionHeader = () => (
    <div style={{ textAlign: titleAlign as any, marginBottom: 32 }}>
      {helper && (
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:helperColor,
          background:helperColor+'18', border:`1px solid ${helperColor}40`, borderRadius:999, padding:'4px 14px', marginBottom:12 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:helperColor, display:'inline-block' }}/>
          {helper}
        </span>
      )}
      {title && <h2 style={{ fontSize:'clamp(20px,4vw,30px)', fontWeight:800, color:'#111827', margin:'0 0 10px', lineHeight:1.3 }}>{title}</h2>}
      {desc  && <p  style={{ fontSize:15, color:descColor, margin:0, lineHeight:1.7 }}>{desc}</p>}
    </div>
  )

  const wrapStyle: React.CSSProperties = {
    borderRadius:20, padding:'36px 24px', position:'relative', overflow:'hidden',
    background: bgImage ? 'transparent' : sectionBg,
  }

  // â”€â”€ V1: Numbered cards grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 1) return (
    <section style={wrapStyle}>
      {bgImage && <img src={bgImage} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:0 }}/>}
      {bgImage && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', zIndex:1 }}/>}
      <div style={{ position:'relative', zIndex:2 }}>
        <SectionHeader/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:20 }}>
          {steps.map((s, i) => {
            const { title: st, desc: sd } = getStep(s)
            return (
              <div key={i} className="pk-gold-hover" style={{ background: bgImage?'rgba(255,255,255,.10)':('#fff'), backdropFilter:bgImage?'blur(8px)':undefined, borderRadius:18, padding:'28px 20px', border:`1px solid ${bgImage?'rgba(255,255,255,.18)':'#f0f0f5'}`, position:'relative' }}>
                <div style={{ width:44, height:44, borderRadius:14, background:accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'#fff', marginBottom:16, boxShadow:`0 4px 14px ${accent}50` }}>
                  {i + 1}
                </div>
                {s.image_url && <img src={s.image_url} alt="" style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', borderRadius:10, marginBottom:14 }}/>}
                {st && <p style={{ fontWeight:700, fontSize:16, color: bgImage?'#fff':stepTitleC, margin:'0 0 8px' }}>{st}</p>}
                {sd && <p style={{ fontSize:13, color: bgImage?'rgba(255,255,255,.75)':stepDescC, lineHeight:1.65, margin:0 }}>{sd}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )

  // â”€â”€ V2: Vertical timeline with line â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 2) return (
    <section style={{ ...wrapStyle, background: sectionBg }}>
      <SectionHeader/>
      <div style={{ position:'relative', paddingLeft: isRtl?0:32, paddingRight: isRtl?32:0 }}>
        <div style={{ position:'absolute', top:0, bottom:0, [isRtl?'right':'left']:14, width:2, background:`linear-gradient(to bottom, ${accent}, ${accent}40)`, borderRadius:2 }}/>
        {steps.map((s, i) => {
          const { title: st, desc: sd } = getStep(s)
          return (
            <div key={i} style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom: i<steps.length-1?32:0, position:'relative' }}>
              <div style={{ position:'absolute', [isRtl?'right':'left']:-32, top:4, width:28, height:28, borderRadius:'50%', background:accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'#fff', flexShrink:0, boxShadow:`0 0 0 4px ${accent}25` }}>
                {i + 1}
              </div>
              <div className="pk-gold-hover" style={{ flex:1, background:'#fff', borderRadius:16, padding:'20px 20px', border:'1px solid #f0f0f5', boxShadow:'0 2px 12px rgba(0,0,0,.05)' }}>
                {s.image_url && <img src={s.image_url} alt="" style={{ width:56, height:56, borderRadius:12, objectFit:'cover', marginBottom:12 }}/>}
                {st && <p style={{ fontWeight:700, fontSize:16, color:stepTitleC, margin:'0 0 6px' }}>{st}</p>}
                {sd && <p style={{ fontSize:13, color:stepDescC, lineHeight:1.65, margin:0 }}>{sd}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )

  // â”€â”€ V3: Horizontal connected steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 3) return (
    <section style={{ ...wrapStyle, background: sectionBg }}>
      <SectionHeader/>
      <div style={{ display:'flex', gap:0, alignItems:'flex-start', flexWrap:'wrap' }}>
        {steps.map((s, i) => {
          const { title: st, desc: sd } = getStep(s)
          return (
            <div key={i} style={{ flex:'1 1 160px', display:'flex', alignItems:'flex-start', minWidth:0 }}>
              <div style={{ flex:1, textAlign:'center', padding:'0 12px' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:`${accent}18`, border:`2px solid ${accent}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', position:'relative' }}>
                  {s.image_url
                    ? <img src={s.image_url} alt="" style={{ width:36, height:36, objectFit:'contain' }}/>
                    : <span style={{ fontSize:22, fontWeight:900, color:accent }}>{i+1}</span>
                  }
                  <span style={{ position:'absolute', top:-8, right:-8, width:22, height:22, borderRadius:'50%', background:accent, color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{i+1}</span>
                </div>
                {st && <p style={{ fontWeight:700, fontSize:14, color:stepTitleC, margin:'0 0 6px' }}>{st}</p>}
                {sd && <p style={{ fontSize:12, color:stepDescC, lineHeight:1.6, margin:0 }}>{sd}</p>}
              </div>
              {i < steps.length - 1 && (
                <div style={{ paddingTop:30, color:`${accent}80`, fontSize:20, flexShrink:0 }}>
                  {isRtl ? 'â†' : 'â†’'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )

  // â”€â”€ V4: Alternating image + text rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 4) return (
    <section style={{ ...wrapStyle, background: sectionBg }}>
      <SectionHeader/>
      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
        {steps.map((s, i) => {
          const { title: st, desc: sd } = getStep(s)
          const imgLeft = i % 2 === 0
          return (
            <div key={i} style={{ display:'flex', flexWrap:'wrap', gap:20, alignItems:'center', flexDirection: imgLeft?'row':'row-reverse' }}>
              {s.image_url && (
                <div style={{ flex:'0 0 auto', width:'clamp(120px,35%,220px)', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,.08)' }}>
                  <img src={s.image_url} alt="" style={{ width:'100%', display:'block', objectFit:'cover', aspectRatio:'4/3' }}/>
                </div>
              )}
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#fff', flexShrink:0 }}>{i+1}</div>
                  {st && <p style={{ fontWeight:700, fontSize:17, color:stepTitleC, margin:0 }}>{st}</p>}
                </div>
                {sd && <p style={{ fontSize:14, color:stepDescC, lineHeight:1.7, margin:0 }}>{sd}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )

  // â”€â”€ V5: Icon cards centered with gold accent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <section style={{ ...wrapStyle, background: sectionBg }}>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:20 }}>
        {steps.map((s, i) => {
          const { title: st, desc: sd } = getStep(s)
          return (
            <div key={i} className="pk-gold-hover" style={{ background:'#fff', borderRadius:20, padding:'28px 20px', textAlign:'center', border:'1px solid #f0f0f5', boxShadow:'0 2px 16px rgba(0,0,0,.06)', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
              <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${accent}20,${accent}08)`, border:`1.5px solid ${accent}30`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 }}>
                {s.image_url
                  ? <img src={s.image_url} alt="" style={{ width:40, height:40, objectFit:'contain' }}/>
                  : <span style={{ fontSize:24, fontWeight:900, color:accent }}>{i+1}</span>
                }
              </div>
              <div style={{ width:28, height:28, borderRadius:'50%', background:accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'#fff', boxShadow:`0 3px 10px ${accent}50` }}>{i+1}</div>
              {st && <p style={{ fontWeight:700, fontSize:15, color:stepTitleC, margin:0, lineHeight:1.3 }}>{st}</p>}
              {sd && <p style={{ fontSize:13, color:stepDescC, lineHeight:1.65, margin:0 }}>{sd}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// â”€â”€ Content Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ContentBlock({ block, isRtl }: { block: Block; isRtl: boolean }) {
  const title      = isRtl ? (block.title_ar || block.title_en) : (block.title_en || block.title_ar)
  const desc       = isRtl ? (block.body_ar  || block.body_en)  : (block.body_en  || block.body_ar)
  const helper     = isRtl ? (block.content_helper_ar || block.content_helper_en) : (block.content_helper_en || block.content_helper_ar)
  const btnText    = isRtl ? (block.content_btn_text_ar || block.content_btn_text_en) : (block.content_btn_text_en || block.content_btn_text_ar)
  const helperColor = block.content_helper_color || '#007E60'
  const titleAlign  = block.content_title_align || (isRtl ? 'right' : 'left')
  const descAlign   = block.content_desc_align  || (isRtl ? 'right' : 'left')
  const descColor   = block.content_desc_color  || '#6B7280'
  const btnBg       = block.content_btn_bg || '#000000'
  const btnLink     = block.content_btn_link || '#'
  const imgSide     = block.content_img_side || 'right'
  const stats       = block.content_stats || []
  const imgUrl      = block.image_url
  const imgLink     = block.content_img_link

  const textSide = (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, padding: '8px 0' }}>
      {helper && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 700, color: helperColor,
          background: helperColor + '18', borderRadius: 999,
          padding: '5px 14px', width: 'fit-content',
          border: `1px solid ${helperColor}40`,
          alignSelf: titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'flex-start',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: helperColor, display: 'inline-block' }}/>
          {helper}
        </span>
      )}
      {title && (
        <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.25, textAlign: titleAlign as any }}>
          {title}
        </h2>
      )}
      {desc && (
        <p style={{ fontSize: 15, color: descColor, lineHeight: 1.75, margin: 0, textAlign: descAlign as any }}>
          {desc}
        </p>
      )}
      {stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginTop: 4 }}>
          {stats.map((s, i) => {
            const label = isRtl ? (s.label_ar || s.label_en) : (s.label_en || s.label_ar)
            return (
              <div key={i} className="pk-gold-hover" style={{
                background: '#f9fafb', borderRadius: 14, padding: '14px 16px',
                border: '1px solid #f0f0f5',
              }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#d99401', margin: 0, lineHeight: 1 }}>
                  {s.value}{s.suffix || ''}
                </p>
                {label && <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginTop: 4, display: 'block' }}>{label}</span>}
              </div>
            )
          })}
        </div>
      )}
      {btnText && (
        <div style={{ marginTop: 8 }}>
          <a href={btnLink} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: btnBg, color: '#fff', fontSize: 14, fontWeight: 700,
            padding: '12px 28px', borderRadius: 12, textDecoration: 'none',
            transition: 'filter .2s, transform .2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = ''; (e.currentTarget as HTMLElement).style.transform = '' }}
          >
            {btnText}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      )}
    </div>
  )

  const imgSideEl = imgUrl ? (
    <div style={{ flex: '0 0 auto', width: 'clamp(160px,40%,320px)', borderRadius: 20, overflow: 'hidden', alignSelf: 'stretch' }}>
      {imgLink
        ? <a href={imgLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', height: '100%' }}>
            <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 200 }}/>
          </a>
        : <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 200 }}/>
      }
    </div>
  ) : null

  return (
    <section style={{ borderRadius: 20, overflow: 'hidden', background: '#ffffff', border: '1px solid #f0f0f5', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0, minHeight: 260 }}>
        {imgSide === 'left'  && imgSideEl}
        <div style={{ flex: 1, minWidth: 200, padding: '32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {textSide}
        </div>
        {imgSide === 'right' && imgSideEl}
      </div>
    </section>
  )
}

// â”€â”€ Stats Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatsBlock({ block, isRtl }: { block: Block; isRtl: boolean }) {
  const items = block.stats_items || []
  const sectionBg   = block.stats_bg          || '#f7f8fa'
  const numColor    = block.stats_number_color || '#d99401'
  const lblColor    = block.stats_label_color  || '#101010'
  const cardBg      = block.stats_card_bg      || '#ffffff'
  const numSize     = block.stats_number_size  || 60
  const lblSize     = block.stats_label_size   || 18
  const cardMinW    = block.stats_card_min_width || 180
  const cardPad     = block.stats_card_padding  || 28
  const title       = isRtl ? (block.title_ar || block.title_en) : (block.title_en || block.title_ar)

  const refEl = useRef<HTMLDivElement>(null)
  const [counts, setCounts] = useState<number[]>(items.map(() => 0))
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!refEl.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true) },
      { threshold: 0.3 }
    )
    obs.observe(refEl.current)
    return () => obs.disconnect()
  }, [started])

  useEffect(() => {
    if (!started || !items.length) return
    const duration = 1800
    const startTime = performance.now()
    const targets = items.map(it => it.value || 0)

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

    const frame = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = easeOut(progress)
      setCounts(targets.map(t => Math.round(t * eased)))
      if (progress < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [started]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={refEl} style={{ background: sectionBg, borderRadius: 20, padding: '32px 20px' }}>
      {title && (
        <h2 style={{
          fontSize: 'clamp(20px,4vw,28px)', fontWeight: 800, textAlign: 'center',
          color: '#101010', margin: '0 0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        }}>
          <span style={{ width: 40, height: 3, background: '#101010', borderRadius: 2, display: 'block' }}/>
          {title}
          <span style={{ width: 40, height: 3, background: '#101010', borderRadius: 2, display: 'block' }}/>
        </h2>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${cardMinW}px,1fr))`, gap: 20 }}>
        {items.map((it, i) => {
          const label = isRtl ? (it.label_ar || it.label_en) : (it.label_en || it.label_ar)
          return (
            <div key={i} className="pk-gold-hover" style={{
              background: cardBg, borderRadius: 24, padding: `${cardPad}px 20px`,
              textAlign: 'center', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,.06)',
              border: '1px solid transparent',
            }}>
              <p style={{ fontSize: numSize, fontWeight: 700, color: numColor, lineHeight: 1, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {counts[i].toLocaleString()}{it.suffix || ''}
              </p>
              {label && <span style={{ fontSize: lblSize, color: lblColor, fontWeight: 600, lineHeight: 1.4 }}>{label}</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// â”€â”€ Countdown Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CountdownBlock({ block, isRtl }: { block: Block; isRtl: boolean }) {
  const hours = block.countdown_hours || 4
  const preset = block.countdown_preset || 1
  const numColor = block.countdown_number_color || '#e0e0e0'
  const lblColor = block.countdown_label_color || '#b0b0b0'
  const boxBg = block.countdown_box_bg || '#2a2a2a'
  const titleText = isRtl ? (block.countdown_title_ar || block.countdown_title_en) : (block.countdown_title_en || block.countdown_title_ar)

  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    const key = `pk-cd-${block.id}`
    const getEnd = () => {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const end = parseInt(stored, 10)
          if (end > Date.now()) return end
        }
      } catch {}
      const end = Date.now() + hours * 3600000
      try { localStorage.setItem(key, String(end)) } catch {}
      return end
    }

    let endTime = getEnd()

    const tick = () => {
      const diff = Math.max(0, endTime - Date.now())
      if (diff === 0) {
        // reset
        endTime = Date.now() + hours * 3600000
        try { localStorage.setItem(key, String(endTime)) } catch {}
      }
      const total = Math.floor(diff / 1000)
      setTimeLeft({
        d: Math.floor(total / 86400),
        h: Math.floor((total % 86400) / 3600),
        m: Math.floor((total % 3600) / 60),
        s: total % 60,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [block.id, hours])

  const pad = (n: number) => String(n).padStart(2, '0')
  const labels = isRtl
    ? ['يوم', 'ساعة', 'دقيقة', 'ثانية']
    : ['Days', 'Hours', 'Minutes', 'Seconds']
  const units = [timeLeft.d, timeLeft.h, timeLeft.m, timeLeft.s]
  const glowColors = ['rgba(239,68,68,.4)', 'rgba(59,130,246,.4)', 'rgba(34,197,94,.4)', 'rgba(168,85,247,.4)']

  // â”€â”€ Preset 1: dark boxes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (preset === 1) return (
    <section style={{ padding: '24px 0' }}>
      {titleText && <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>{titleText}</p>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap', padding: 15, borderRadius: 12, lineHeight: 1 }}>
        {units.map((val, i) => (
          <div key={i} style={{ background: boxBg, padding: '15px 20px', borderRadius: 10, minWidth: 75, textAlign: 'center', boxShadow: '0 4px 8px rgba(0,0,0,.6)' }}>
            <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: numColor, fontVariantNumeric: 'tabular-nums' }}>{pad(val)}</p>
            <span style={{ display: 'block', marginTop: 8, fontSize: 13, fontWeight: 500, color: lblColor, letterSpacing: '0.5px' }}>{labels[i]}</span>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Preset 2: glow boxes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (preset === 2) return (
    <section style={{ padding: '24px 0' }}>
      {titleText && <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>{titleText}</p>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap', padding: 15, lineHeight: 1 }}>
        {units.map((val, i) => (
          <div key={i} style={{ background: boxBg, padding: '15px 20px', borderRadius: 10, minWidth: 75, textAlign: 'center', boxShadow: `0 0 18px ${glowColors[i]}, 0 8px 18px rgba(0,0,0,.6)` }}>
            <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: numColor, fontVariantNumeric: 'tabular-nums' }}>{pad(val)}</p>
            <span style={{ display: 'block', marginTop: 8, fontSize: 13, color: lblColor }}>{labels[i]}</span>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Preset 3: inline dotted â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <section style={{ padding: '12px 0' }}>
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: 12, borderRadius: 10,
        background: `${boxBg} radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
        border: '1px solid rgba(255,255,255,.08)',
      }}>
        {titleText && <p style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', margin: '0 6px 0 0', lineHeight: 1 }}>{titleText}</p>}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', lineHeight: 1 }}>
          {units.map((val, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: numColor, fontVariantNumeric: 'tabular-nums' }}>{pad(val)}</span>
              <span style={{ fontSize: 13, color: lblColor }}>{labels[i]}</span>
              {i < 3 && <span style={{ fontSize: 15, color: '#ffffff', margin: '0 2px' }}>:</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// â”€â”€ Banners Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BannersBlock({ block }: { block: Block }) {
  const imgs = block.banner_images || []
  const v    = block.banner_variant || 1
  const gap  = block.banner_gap  ?? 8
  const r    = block.banner_radius ?? 12

  const Img = ({ i, style }: { i: number; style?: React.CSSProperties }) => {
    const src = imgs[i]?.image_url
    const href = imgs[i]?.link_url
    const el = src ? (
      <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', borderRadius: r }}/>
    ) : (
      <div style={{ width:'100%', height:'100%', background:'#e8e8f0', borderRadius: r, display:'flex', alignItems:'center', justifyContent:'center', color:'#9ca3af', fontSize:13 }}>Image {i+1}</div>
    )
    const wrapped = href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ display:'block', width:'100%', height:'100%' }}>{el}</a> : el
    return <div style={{ overflow:'hidden', borderRadius: r, ...style }}>{wrapped}</div>
  }

  // â”€â”€ V1: 2 equal columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 1) return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap }}>
      {[0,1].map(i=><Img key={i} i={i} style={{ aspectRatio:'4/3' }}/>)}
    </div>
  )

  // â”€â”€ V2: Large left + 2 stacked right â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 2) return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap }}>
      <Img i={0} style={{ gridRow:'span 2' }}/>
      <Img i={1} style={{ aspectRatio:'4/3' }}/>
      <Img i={2} style={{ aspectRatio:'4/3' }}/>
    </div>
  )

  // â”€â”€ V3: 2Ã—2 grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 3) return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap }}>
      {[0,1,2,3].map(i=><Img key={i} i={i} style={{ aspectRatio:'1' }}/>)}
    </div>
  )

  // â”€â”€ V4: Wide top + 4 equal bottom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 4) return (
    <div style={{ display:'flex', flexDirection:'column', gap }}>
      <Img i={0} style={{ aspectRatio:'21/9', width:'100%' }}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap }}>
        {[1,2,3,4].map(i=><Img key={i} i={i} style={{ aspectRatio:'1' }}/>)}
      </div>
    </div>
  )

  // â”€â”€ V5: Large left (2/3) + 3 stacked right â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 5) return (
    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap }}>
      <Img i={0} style={{ gridRow:'span 3' }}/>
      <Img i={1} style={{ aspectRatio:'4/3' }}/>
      <Img i={2} style={{ aspectRatio:'4/3' }}/>
      <Img i={3} style={{ aspectRatio:'4/3' }}/>
    </div>
  )

  // â”€â”€ V6: 3 equal columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 6) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap }}>
      {[0,1,2].map(i=><Img key={i} i={i} style={{ aspectRatio:'3/4' }}/>)}
    </div>
  )

  // â”€â”€ V7: 2 top + 3 bottom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 7) return (
    <div style={{ display:'flex', flexDirection:'column', gap }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap }}>
        <Img i={0} style={{ aspectRatio:'16/9' }}/>
        <Img i={1} style={{ aspectRatio:'16/9' }}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap }}>
        {[2,3,4].map(i=><Img key={i} i={i} style={{ aspectRatio:'1' }}/>)}
      </div>
    </div>
  )

  // â”€â”€ V8: Wide top + 3 bottom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 8) return (
    <div style={{ display:'flex', flexDirection:'column', gap }}>
      <Img i={0} style={{ aspectRatio:'21/9', width:'100%' }}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap }}>
        {[1,2,3].map(i=><Img key={i} i={i} style={{ aspectRatio:'1' }}/>)}
      </div>
    </div>
  )

  // â”€â”€ V9: Mosaic (tall left + top-right + 2 small bottom-right) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 9) return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'auto auto', gap }}>
      <Img i={0} style={{ gridRow:'span 2' }}/>
      <Img i={1} style={{ aspectRatio:'16/9' }}/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap }}>
        <Img i={2} style={{ aspectRatio:'1' }}/>
        <Img i={3} style={{ aspectRatio:'1' }}/>
      </div>
    </div>
  )

  return null
}

// â”€â”€ Testimonials Block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TestimonialsBlock({ block, isRtl }: { block: Block; isRtl: boolean }) {
  const tc = block.testimonial_colors || { variant: 1 }
  const v = tc.variant || 1
  const reviews = block.testimonials || []
  const title = isRtl ? (block.title_ar||block.title_en) : (block.title_en||block.title_ar)
  const desc = block.testimonial_desc || ''
  const titleAlign = block.testimonial_title_align || 'center'
  const descAlign = block.testimonial_desc_align || 'center'
  const descColor = block.testimonial_desc_color || '#586174'

  // css-in-js helpers
  const cardBg  = tc.bg_color  || (v===5?'#fff':v===6?'#fff':'#fff')
  const hoverBg = tc.hover_color || ''
  const revColor = tc.review_color || '#57637a'
  const nameColor = tc.author_name_color || '#1a1a2e'
  const headColor = tc.review_heading_color || '#1a1a2e'

  const blockId = `tst-${block.id}`

  // inject hover styles once per block
  const hoverCSS = `
    .${blockId}-card { transition: background .2s, box-shadow .2s, transform .2s; }
    .${blockId}-card:hover { ${hoverBg ? `background: ${hoverBg} !important;` : ''} transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.08); }
    ${tc.hover_text_color ? `.${blockId}-card:hover .tst-review { color: ${tc.hover_text_color} !important; }` : ''}
    ${tc.author_name_color_hover ? `.${blockId}-card:hover .tst-name { color: ${tc.author_name_color_hover} !important; }` : ''}
    ${tc.review_heading_color_hover ? `.${blockId}-card:hover .tst-heading { color: ${tc.review_heading_color_hover} !important; }` : ''}
  `

  const SectionHeader = () => (
    <>
      {title && <h2 style={{ textAlign: titleAlign as any, fontSize:'clamp(20px,4vw,32px)', fontWeight:800, color:'#1a1a2e', margin:'0 0 8px' }}>{title}</h2>}
      {desc && <p style={{ textAlign: descAlign as any, color: descColor, fontSize:16, fontWeight:600, margin:'0 0 28px' }}>{desc}</p>}
    </>
  )

  // â”€â”€ Variant 1: grid cards with image+heading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 1) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:cardBg, borderRadius:16, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,.06)', border:'1px solid #f0f0f5' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:48, height:48, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/> : <div style={{ width:48, height:48, borderRadius:'50%', background:'#e8e8f0', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>ðŸ‘¤</div>}
              <div>
                <div className="tst-name" style={{ fontWeight:700, fontSize:15, color:nameColor }}>{r.author_name}</div>
                <StarRow/>
              </div>
              <div style={{ marginLeft:'auto' }}>{r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}</div>
            </div>
            {r.review_heading && <div className="tst-heading" style={{ fontWeight:700, fontSize:14, color:headColor, marginBottom:8 }}>{r.review_heading}</div>}
            <p className="tst-review" style={{ color:revColor, fontSize:14, lineHeight:'1.7', margin:0 }}>{r.review}</p>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 2: quote cards, no image, centered â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 2) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:20 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:cardBg, borderRadius:20, padding:'28px 24px', boxShadow:'0 4px 20px rgba(0,0,0,.07)', textAlign:'center', border:'1px solid #f0f0f5', position:'relative' }}>
            <div style={{ fontSize:48, lineHeight:1, color:'#d99401', fontFamily:'Georgia,serif', position:'absolute', top:12, left:20, opacity:.3 }}>"</div>
            <p className="tst-review" style={{ color:revColor, fontSize:15, lineHeight:'1.75', margin:'20px 0 20px', position:'relative', zIndex:1 }}>{r.review}</p>
            <div style={{ width:40, height:2, background:'#d99401', borderRadius:2, margin:'0 auto 14px' }}/>
            <div className="tst-name" style={{ fontWeight:700, fontSize:14, color:nameColor }}>{r.author_name}</div>
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:8 }}>
              <StarRow/>{r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 3: avatar top-center, stars, review text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 3) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:20 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:cardBg, borderRadius:20, padding:28, textAlign:'center', boxShadow:'0 2px 16px rgba(0,0,0,.06)', border:'1px solid #f0f0f5' }}>
            {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', margin:'0 auto 14px', display:'block', border:'3px solid #fde68a' }}/> : <div style={{ width:64, height:64, borderRadius:'50%', background:'#fde68a', margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>ðŸ‘¤</div>}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><StarRow/></div>
            <p className="tst-review" style={{ color:revColor, fontSize:14, lineHeight:'1.7', margin:'0 0 16px' }}>{r.review}</p>
            <div className="tst-name" style={{ fontWeight:700, fontSize:14, color:nameColor }}>{r.author_name}</div>
            <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>{r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}</div>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 4: horizontal card (avatar left, text right) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 4) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:cardBg, borderRadius:16, padding:20, display:'flex', gap:16, alignItems:'flex-start', boxShadow:'0 2px 12px rgba(0,0,0,.06)', border:'1px solid #f0f0f5' }}>
            {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/> : <div style={{ width:56, height:56, borderRadius:'50%', background:'#fde68a', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>ðŸ‘¤</div>}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <div className="tst-name" style={{ fontWeight:700, fontSize:15, color:nameColor }}>{r.author_name}</div>
                {r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}
              </div>
              <div style={{ marginBottom:8 }}><StarRow/></div>
              <p className="tst-review" style={{ color:revColor, fontSize:13, lineHeight:'1.65', margin:0 }}>{r.review}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 5: light-gray bg section, white shadow cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 5) return (
    <section style={{ background: tc.bg_color||'#F3F3F7', borderRadius:20, padding:'36px 24px' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:20 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:'#fff', borderRadius:16, padding:24, boxShadow:'0 4px 24px rgba(0,0,0,.08)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover' }}/> : <div style={{ width:44, height:44, borderRadius:'50%', background:'#e8e8f0', display:'flex', alignItems:'center', justifyContent:'center' }}>ðŸ‘¤</div>}
                <div>
                  <div className="tst-name" style={{ fontWeight:700, fontSize:14, color:nameColor }}>{r.author_name}</div>
                  <StarRow/>
                </div>
              </div>
              {r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}
            </div>
            <p className="tst-review" style={{ color:revColor, fontSize:14, lineHeight:'1.7', margin:0 }}>{r.review}</p>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 6: masonry-like multi-size cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 6) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ columns:'280px', columnGap:20 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:tc.bg_color||'#fff', borderRadius:16, padding:24, marginBottom:20, breakInside:'avoid', boxShadow:'0 4px 20px rgba(0,0,0,.07)', border:'1px solid #f0f0f5' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:42, height:42, borderRadius:'50%', objectFit:'cover' }}/> : <div style={{ width:42, height:42, borderRadius:'50%', background:'#fde68a', display:'flex', alignItems:'center', justifyContent:'center' }}>ðŸ‘¤</div>}
              <div>
                <div className="tst-name" style={{ fontWeight:700, fontSize:13, color:nameColor }}>{r.author_name}</div>
                <div style={{ display:'flex', gap:4, alignItems:'center', marginTop:2 }}><StarRow/>{r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}</div>
              </div>
            </div>
            <p className="tst-review" style={{ color:revColor, fontSize:14, lineHeight:'1.7', margin:0 }}>{r.review}</p>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 7: list, left-aligned, heading prominent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 7) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:cardBg, borderRadius:16, padding:24, display:'flex', gap:20, alignItems:'flex-start', boxShadow:'0 2px 12px rgba(0,0,0,.06)', border:'1px solid #f0f0f5' }}>
            {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}/> : <div style={{ width:64, height:64, borderRadius:'50%', background:'#fde68a', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>ðŸ‘¤</div>}
            <div style={{ flex:1 }}>
              {r.review_heading && <div className="tst-heading" style={{ fontWeight:800, fontSize:16, color:headColor, marginBottom:8 }}>{r.review_heading}</div>}
              <p className="tst-review" style={{ color:revColor, fontSize:14, lineHeight:'1.7', margin:'0 0 12px' }}>{r.review}</p>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="tst-name" style={{ fontWeight:700, fontSize:13, color:nameColor }}>{r.author_name}</div>
                <StarRow/>{r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 8: colored avatar bg, compact grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const avatarColors = ['#dbeafe','#fce7f3','#d1fae5','#fef3c7','#ede9fe','#fee2e2']
  if (v === 8) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:cardBg, borderRadius:20, padding:24, boxShadow:'0 4px 20px rgba(0,0,0,.07)', border:'1px solid #f0f0f5' }}>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14 }}>
              {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:48, height:48, borderRadius:12, objectFit:'cover' }}/> : <div style={{ width:48, height:48, borderRadius:12, background:avatarColors[i%avatarColors.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>ðŸ‘¤</div>}
              <div>
                <div className="tst-name" style={{ fontWeight:700, fontSize:14, color:nameColor }}>{r.author_name}</div>
                <StarRow/>
              </div>
            </div>
            <p className="tst-review" style={{ color:revColor, fontSize:13, lineHeight:'1.7', margin:'0 0 12px' }}>{r.review}</p>
            <div>{r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}</div>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 9: minimal chip-style compact â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 9) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:cardBg||'#f8f9fc', borderRadius:50, padding:'14px 24px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 2px 8px rgba(0,0,0,.06)', border:'1px solid #e8e8f0' }}>
            {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/> : <div style={{ width:36, height:36, borderRadius:'50%', background:'#fde68a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>ðŸ‘¤</div>}
            <div>
              <div className="tst-name" style={{ fontWeight:700, fontSize:13, color:nameColor }}>{r.author_name}</div>
              <div style={{ display:'flex', gap:4 }}><StarRow n={5}/></div>
            </div>
            <div style={{ maxWidth:200 }}><p className="tst-review" style={{ color:revColor, fontSize:12, lineHeight:'1.5', margin:0, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{r.review}</p></div>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 10: dark cards, gold accent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 10) return (
    <section style={{ padding:'32px 0' }}>
      <style>{`.${blockId}-card { transition: transform .2s, box-shadow .2s; } .${blockId}-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(217,148,1,.2) !important; }`}</style>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:20 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ background:tc.bg_color||'#1a1a2e', borderRadius:20, padding:28, boxShadow:'0 4px 24px rgba(0,0,0,.2)', border:'1px solid rgba(217,148,1,.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:48, height:48, borderRadius:'50%', objectFit:'cover', border:'2px solid #d99401' }}/> : <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(217,148,1,.2)', border:'2px solid #d99401', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>ðŸ‘¤</div>}
              <div>
                <div className="tst-name" style={{ fontWeight:700, fontSize:15, color:tc.author_name_color||'#fff' }}>{r.author_name}</div>
                <StarRow/>
              </div>
              <div style={{ marginLeft:'auto' }}>{r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}</div>
            </div>
            {r.review_heading && <div className="tst-heading" style={{ fontWeight:700, fontSize:14, color:tc.review_heading_color||'#d99401', marginBottom:10 }}>{r.review_heading}</div>}
            <p className="tst-review" style={{ color:tc.review_color||'rgba(255,255,255,.8)', fontSize:14, lineHeight:'1.7', margin:0 }}>{r.review}</p>
          </div>
        ))}
      </div>
    </section>
  )

  // â”€â”€ Variant 11: minimal 2-col with large quote â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (v === 11) return (
    <section style={{ padding:'32px 0' }}>
      <style>{hoverCSS}</style>
      <SectionHeader/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
        {reviews.map((r,i)=>(
          <div key={i} className={`pk-gold-hover ${blockId}-card`} style={{ padding:'28px 0', borderTop:'3px solid #d99401' }}>
            <p className="tst-review" style={{ color:revColor, fontSize:16, lineHeight:'1.8', margin:'0 0 20px', fontStyle:'italic' }}>"{r.review}"</p>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {r.author_image ? <img src={r.author_image} alt={r.author_name} style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover' }}/> : <div style={{ width:44, height:44, borderRadius:'50%', background:'#fde68a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>ðŸ‘¤</div>}
              <div>
                <div className="tst-name" style={{ fontWeight:700, fontSize:14, color:nameColor }}>{r.author_name}</div>
                <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:4 }}><StarRow/>{r.type==='google'?<GoogleIcon/>:<FacebookIcon/>}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )

  return null
}

export default function ToolLandingPage({ tool, onBack }: { tool: Tool; onBack: ()=>void }) {
  const { t, lang, formatPrice } = useLang()
  const settings = useSiteSettings()
  const isRtl = lang === 'ar'
  useArabicFont(isRtl)
  useEffect(()=>{ injectGoldShimmer(); injectHeroCss(); injectPlusJakarta() }, [])

  const [reviews, setReviews]     = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [dist, setDist]           = useState<{stars:number;count:number}[]>([])
  const [totalReviews, setTotal]  = useState(0)

  const [myStars,   setMyStars]   = useState(0)
  const [myComment, setMyComment] = useState('')
  const [submitting, setSubmit]   = useState(false)
  const [submitted,  setSubmitted]= useState(false)
  const [submitErr,  setSubmitErr]= useState('')

  const variants = tool.variants || []
  const [selectedVariant, setSelectedVariant] = useState<number>(variants.length > 0 ? 0 : -1)

  const [fakeVisits, setFakeVisits] = useState<number|null>(null)
  const [fakeStock,  setFakeStock]  = useState<number|null>(null)
  useEffect(()=>{
    const vMin = tool.fake_visits_min||0; const vMax = tool.fake_visits_max||0
    const sMin = tool.fake_stock_min||0;  const sMax = tool.fake_stock_max||0
    let visitTimeout: ReturnType<typeof setTimeout>
    if (vMin > 0 || vMax > 0) {
      const range = Math.max(vMax - vMin, 1)
      let current = vMin + Math.floor(Math.random() * (range + 1))
      setFakeVisits(current)
      const drift = () => {
        const delta = Math.floor(Math.random() * Math.max(1, range * 0.07)) + 1
        const dir = Math.random() > 0.42 ? 1 : -1
        current = Math.max(vMin, Math.min(vMax, current + dir * delta))
        setFakeVisits(current)
        visitTimeout = setTimeout(drift, 8000 + Math.random() * 7000)
      }
      visitTimeout = setTimeout(drift, 9000 + Math.random() * 6000)
    }
    if (sMax > 0) {
      const TICK = 5 * 60 * 1000
      const key = `pk_fstock_${tool.id}`
      const getStock = () => {
        try {
          const raw = localStorage.getItem(key)
          const now = Date.now()
          let val = sMax; let ts = now
          if (raw) { const p = JSON.parse(raw); val = p.val; ts = p.ts }
          const ticks = Math.floor((now - ts) / TICK)
          if (ticks > 0) {
            val = val - ticks
            if (val <= (sMin || 1)) val = sMax
            localStorage.setItem(key, JSON.stringify({ val, ts: ts + ticks * TICK }))
          } else if (!raw) { localStorage.setItem(key, JSON.stringify({ val, ts: now })) }
          return Math.max(val, sMin || 1)
        } catch { return sMax }
      }
      setFakeStock(getStock())
      const id = setInterval(()=>setFakeStock(getStock()), TICK)
      return ()=>{ clearInterval(id); clearTimeout(visitTimeout) }
    }
    return ()=>{ clearTimeout(visitTimeout) }
  },[tool.id])

  const activeVariant = selectedVariant >= 0 && variants[selectedVariant] ? variants[selectedVariant] : null
  const displayPriceEgp = activeVariant
    ? (parseFloat(activeVariant.price)||tool.price_egp)
    : tool.price_egp
  const displayRetailEgp = activeVariant
    ? (parseFloat(activeVariant.retail_price||activeVariant.discount_price||'')||tool.retail_price_egp||0)
    : (tool.retail_price_egp||0)

  const price = formatPrice(displayPriceEgp, parseFloat(settings.usd_to_egp_rate)||50)

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

  const activeVariantName = activeVariant
    ? (isRtl ? (activeVariant.name_ar||activeVariant.name_en||activeVariant.name||'') : (activeVariant.name_en||activeVariant.name_ar||activeVariant.name||''))
    : ''
  const buyUrl = activeVariant
    ? `/u/checkout?tool_id=${tool.id}&variant=${encodeURIComponent(activeVariantName)}&price=${displayPriceEgp}`
    : `/u/checkout?tool_id=${tool.id}`

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950" dir={isRtl?'rtl':'ltr'} style={isRtl?{fontFamily:"'Cairo', sans-serif"}:{}}>

      {/* ── Hero ── */}
      <div style={{
        position:'relative',
        padding:'14px 12px 0',
        background:'radial-gradient(ellipse 130% 100% at 5% 0%, rgba(217,148,1,0.13) 0%, transparent 52%), radial-gradient(ellipse 80% 100% at 95% 100%, rgba(99,102,241,0.10) 0%, transparent 52%), radial-gradient(ellipse 60% 60% at 50% 50%, rgba(56,189,248,0.05) 0%, transparent 60%), #e8eef5',
        fontFamily:isRtl?"'Cairo','Plus Jakarta Sans',-apple-system,sans-serif":"'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif",
      }}>
        {/* ambient orbs */}
        <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
          <div style={{position:'absolute',top:-100,left:'20%',width:320,height:320,borderRadius:'50%',background:'rgba(217,148,1,0.08)',filter:'blur(80px)'}}/>
          <div style={{position:'absolute',bottom:-80,right:'5%',width:260,height:260,borderRadius:'50%',background:'rgba(99,102,241,0.08)',filter:'blur(80px)'}}/>
        </div>

        {/* Glass card */}
        <div style={{
          position:'relative',zIndex:1,
          borderRadius:22,
          background:'rgba(255,255,255,0.58)',
          backdropFilter:'blur(28px)',
          WebkitBackdropFilter:'blur(28px)',
          border:'1px solid rgba(255,255,255,0.78)',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.95), 0 12px 52px rgba(0,0,0,0.09)',
          overflow:'hidden',
        }}>
          {/* Gold top accent */}
          <div style={{height:3,background:'linear-gradient(90deg,rgba(217,148,1,0) 0%,#D99401 15%,#F5C842 50%,#D99401 85%,rgba(217,148,1,0) 100%)'}}/>

          {/* Nav */}
          <div style={{padding:'12px 24px 0',display:'flex',alignItems:'center',gap:8}}>
            <button onClick={onBack} style={{
              display:'inline-flex',alignItems:'center',gap:6,
              padding:'8px 18px 8px 14px',borderRadius:10,cursor:'pointer',
              background:'rgba(255,255,255,0.80)',border:'1px solid rgba(0,0,0,0.10)',
              color:'#3A4461',fontSize:13,fontWeight:700,
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <ArrowLeft size={14} style={isRtl?{transform:'rotate(180deg)'}:{}}/>
              {t('Back to Store','\u0631\u062c\u0648\u0639 \u0644\u0644\u0645\u062a\u062c\u0631')}
            </button>
          </div>

          {/* Two-column body */}
          <div className="pk-hero-body">

            {/* LEFT */}
            <div className="pk-hero-left">
              {/* Logo with gold aura */}
              <div style={{position:'relative',width:96,height:96,marginBottom:20}}>
                <div style={{
                  position:'absolute',inset:-20,borderRadius:'50%',
                  background:'radial-gradient(circle, rgba(217,148,1,0.28) 0%, rgba(217,148,1,0.06) 55%, transparent 75%)',
                  animation:'pk-aura-pulse 3.4s ease-in-out infinite',
                }}/>
                <div style={{
                  position:'relative',width:96,height:96,borderRadius:24,
                  background:'rgba(255,255,255,0.90)',
                  border:'1px solid rgba(255,255,255,1)',
                  boxShadow:'0 6px 28px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,1)',
                  display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',
                }}>
                  {tool.image_url
                    ? <img src={tool.image_url} alt={tool.name} style={{width:68,height:68,objectFit:'contain'}}/>
                    : <span style={{fontSize:28,fontWeight:800,color:'#C0C9D8',letterSpacing:-1}}>{tool.name.slice(0,2).toUpperCase()}</span>
                  }
                </div>
              </div>

              <h1 style={{margin:'0 0 10px',lineHeight:1.08,fontSize:'clamp(24px,4vw,34px)',fontWeight:800,color:'#070C1A',letterSpacing:-0.8}}>
                {tool.name}
              </h1>

              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:14}}>
                <div style={{display:'flex',gap:2}}>
                  {[1,2,3,4,5].map(i=>(
                    <Star key={i} size={14} fill={i<=Math.round(displayRating)?'#F59E0B':'none'} stroke={i<=Math.round(displayRating)?'#F59E0B':'#D8DCE8'}/>
                  ))}
                </div>
                <span style={{fontSize:14,fontWeight:700,color:'#C88800'}}>{displayRating.toFixed(1)}</span>
                <span style={{fontSize:13,color:'rgba(0,0,0,0.18)'}}>·</span>
                <span style={{fontSize:13,color:'#8C97AE'}}>{displayCount.toLocaleString()} {t('reviews','\u062a\u0642\u064a\u064a\u0645')}</span>
              </div>

              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:18}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 11px',borderRadius:20,background:'rgba(16,185,129,0.10)',color:'#0B7A4B',fontSize:11,fontWeight:700,border:'1px solid rgba(16,185,129,0.20)'}}>
                  <Zap size={9} fill="#0B7A4B" stroke="none"/>{isRtl?(tool.delivery_label||'INSTANT').replace(/^INSTANT$/i,'\u0641\u0648\u0631\u064a').replace(/instant delivery/i,'\u062a\u0633\u0644\u064a\u0645 \u0641\u0648\u0631\u064a').replace(/instant/i,'\u0641\u0648\u0631\u064a').replace(/within 24/i,'\u062e\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629'):(tool.delivery_label||'INSTANT')}
                </span>
                <span style={{display:'inline-flex',alignItems:'center',padding:'4px 11px',borderRadius:20,background:'rgba(0,0,0,0.05)',color:'#5A6478',fontSize:11,fontWeight:600,border:'1px solid rgba(0,0,0,0.07)'}}>
                  ⏱ {durLabel}
                </span>
                {(tool.sales_count||0) > 0 && (
                  <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 11px',borderRadius:20,background:'rgba(217,148,1,0.10)',color:'#8A5F00',fontSize:11,fontWeight:700,border:'1px solid rgba(217,148,1,0.20)'}}>
                    <ShoppingCart size={9}/>{(tool.sales_count||0).toLocaleString()} {t('sold','\u0645\u0628\u064a\u0639\u0629')}
                  </span>
                )}
                {tool.warranty_label && tool.warranty_label !== 'no_warranty' && (
                  <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 11px',borderRadius:20,background:'rgba(99,102,241,0.10)',color:'#4338CA',fontSize:11,fontWeight:700,border:'1px solid rgba(99,102,241,0.20)'}}>
                    {'🛡️'} {isRtl?(tool.warranty_label).replace(/(\d+)\s*Year[s]?\s*Warranty/i,(_,n)=>`\u0636\u0645\u0627\u0646 ${n} \u0633\u0646\u0629`).replace(/(\d+)\s*Month[s]?\s*Warranty/i,(_,n)=>`\u0636\u0645\u0627\u0646 ${n} \u0634\u0647\u0631`).replace(/(\d+)\s*Day[s]?\s*Warranty/i,(_,n)=>`\u0636\u0645\u0627\u0646 ${n} \u064a\u0648\u0645`).replace(/Full\s*Warranty/i,'\u0636\u0645\u0627\u0646 \u0643\u0627\u0645\u0644').replace(/Warranty/i,'\u0636\u0645\u0627\u0646'):tool.warranty_label}
                  </span>
                )}
              </div>

              <div style={{height:1,background:'linear-gradient(90deg,rgba(217,148,1,0.20),rgba(0,0,0,0.04))',marginBottom:16}}/>

              {tool.description && (
                <p style={{margin:0,fontSize:13,color:'#7A8499',lineHeight:1.7,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as const,overflow:'hidden'}}>
                  {tool.description}
                </p>
              )}
            </div>

            {/* vertical divider */}
            <div className="pk-hero-vdiv"/>

            {/* RIGHT */}
            <div className="pk-hero-right">

              {variants.length > 0 && (
                <div>
                  <div style={{fontSize:9,fontWeight:800,letterSpacing:1.4,color:'#A8B2C5',textTransform:'uppercase',marginBottom:10}}>
                    {t('Choose Plan','\u0627\u062e\u062a\u0631 \u0627\u0644\u0628\u0627\u0642\u0629')}
                  </div>
                  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                    {variants.map((v,i)=>{
                      const vName = isRtl ? (v.name_ar||v.name_en||v.name||'') : (v.name_en||v.name_ar||v.name||'')
                      const active = selectedVariant===i
                      return (
                        <button key={i} onClick={()=>setSelectedVariant(i)} style={{
                          padding:'8px 18px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',
                          border:active?'1.5px solid rgba(217,148,1,0.55)':'1.5px solid rgba(0,0,0,0.09)',
                          background:active?'rgba(217,148,1,0.12)':'rgba(255,255,255,0.72)',
                          color:active?'#8A5F00':'#505A72',
                          boxShadow:active?'0 2px 12px rgba(217,148,1,0.18)':'0 1px 3px rgba(0,0,0,0.04)',
                          transition:'all 0.13s',
                        }}>
                          {vName}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{height:1,background:'rgba(0,0,0,0.06)'}}/>

              <div>
                <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap',marginBottom:5}}>
                  <span style={{fontSize:'clamp(36px,8vw,50px)',fontWeight:800,color:'#D99401',lineHeight:1,letterSpacing:-2,fontVariantNumeric:'tabular-nums'}}>
                    {price}
                  </span>
                  {displayRetailEgp > displayPriceEgp && displayPriceEgp > 0 && (
                    <span style={{fontSize:19,color:'rgba(0,0,0,0.20)',textDecoration:'line-through',fontWeight:500}}>
                      {formatPrice(displayRetailEgp, parseFloat(settings.usd_to_egp_rate)||50)}
                    </span>
                  )}
                  {displayRetailEgp > displayPriceEgp && displayPriceEgp > 0 && (
                    <span style={{padding:'3px 9px',borderRadius:20,background:'rgba(239,68,68,0.10)',color:'#C0392B',fontSize:12,fontWeight:800,border:'1px solid rgba(239,68,68,0.16)'}}>
                      -{Math.round((1-displayPriceEgp/displayRetailEgp)*100)}%
                    </span>
                  )}
                </div>
                <span style={{fontSize:12,color:'#A8B2C5',fontWeight:500}}>/ {durLabel}</span>
              </div>

              {tool.is_out_of_stock
                ? <button disabled style={{width:'100%',padding:'14px',borderRadius:13,background:'rgba(0,0,0,0.05)',color:'rgba(0,0,0,0.26)',fontSize:15,fontWeight:700,border:'1px solid rgba(0,0,0,0.07)',cursor:'not-allowed'}}>
                    {t('Out of Stock','\u0646\u0641\u0630\u062a \u0627\u0644\u0643\u0645\u064a\u0629')}
                  </button>
                : <button onClick={()=>{ window.location.href=buyUrl }}
                    style={{width:'100%',padding:'15px',borderRadius:13,background:'#D99401',color:'#fff',fontSize:15,fontWeight:800,border:'none',cursor:'pointer',
                      boxShadow:'0 5px 24px rgba(217,148,1,0.40), inset 0 1px 0 rgba(255,255,255,0.22)',
                      transition:'transform 0.11s,box-shadow 0.11s',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 9px 30px rgba(217,148,1,0.50), inset 0 1px 0 rgba(255,255,255,0.22)'}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 5px 24px rgba(217,148,1,0.40), inset 0 1px 0 rgba(255,255,255,0.22)'}}>
                    {'🛒'} {t('Buy Now','\u0627\u0634\u062a\u0631\u064a \u0627\u0644\u0622\u0646')}
                  </button>
              }

              <div style={{display:'flex',gap:14,flexWrap:'wrap',justifyContent:'center'}}>
                {[{icon:'\u26A1',en:'Instant Delivery',ar:'\u062A\u0633\u0644\u064a\u0645 \u0641\u0648\u0631\u064a'},{icon:'\uD83D\uDD12',en:'Secure Payment',ar:'\u062f\u0641\u0639 \u0622\u0645\u0646'},{icon:'\uD83D\uDCAC',en:'Support 24/7',ar:'\u062f\u0639\u0645 24/7'}].map(b=>(
                  <span key={b.en} style={{fontSize:11,color:'#A8B2C5',display:'flex',alignItems:'center',gap:3,fontWeight:500}}>
                    {b.icon} {isRtl?b.ar:b.en}
                  </span>
                ))}
              </div>

              {(fakeVisits !== null || fakeStock !== null) && (
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {fakeVisits !== null && (
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 13px',borderRadius:10,background:'rgba(255,255,255,0.72)',border:'1px solid rgba(0,0,0,0.07)',flex:1,minWidth:0}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:'#22C55E',flexShrink:0,display:'inline-block',animation:'pk-live-dot 1.8s ease-in-out infinite'}}/>
                      <span style={{fontSize:13,fontWeight:800,color:'#070C1A',fontVariantNumeric:'tabular-nums'}}>{fakeVisits.toLocaleString()}</span>
                      <span style={{fontSize:11,color:'#8C97AE',fontWeight:500,whiteSpace:'nowrap'}}>{t('viewing now','\u064a\u0634\u0627\u0647\u062f \u0627\u0644\u0622\u0646')}</span>
                    </div>
                  )}
                  {fakeStock !== null && (
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 13px',borderRadius:10,background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.15)',flex:1,minWidth:0}}>
                      <span style={{fontSize:13}}>📦</span>
                      <span style={{fontSize:13,fontWeight:800,color:'#C0392B',fontVariantNumeric:'tabular-nums'}}>{fakeStock}</span>
                      <span style={{fontSize:11,color:'#C47070',fontWeight:500,whiteSpace:'nowrap'}}>{t('left in Stock','\u0645\u062a\u0628\u0642\u064a \u0628\u0627\u0644\u0645\u062E\u0632\u0646')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Content â”€â”€ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-14">

        {tool.features?.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{t('What\'s included','ماذا يشمل الاشتراك')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tool.features.map((f,i)=>(
                <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-bold flex-shrink-0 mt-0.5" style={{color:'#d99401'}}>{'✓'}</span>{f}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* â”€â”€ Content Blocks â”€â”€ */}
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
                    <div key={i} className="pk-gold-hover group rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all">
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

          /* Marquee block */
          if (block.layout === 'marquee') {
            const items = block.marquee_items || []
            if (!items.length) return null
            const doubled = [...items, ...items] // seamless loop
            const speed = block.marquee_speed || 15
            const bg = block.marquee_bg || '#d92d36'
            const textColor = block.marquee_text_color || '#ffffff'
            return (
              <section key={block.id} style={{ background: bg, overflow: 'hidden', padding: '15px 0' }}>
                <style>{`
                  @keyframes pk-marquee-${block.id} {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                  .pk-marquee-${block.id} {
                    display: flex; flex-direction: row; flex-wrap: nowrap;
                    gap: 32px; align-items: center;
                    animation: pk-marquee-${block.id} ${speed}s linear infinite;
                    width: max-content;
                  }
                `}</style>
                <div className={`pk-marquee-${block.id}`}>
                  {doubled.map((m, i) => {
                    const txt = isRtl ? (m.text_ar||m.text_en) : (m.text_en||m.text_ar)
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, minWidth:'max-content' }}>
                        {m.icon_url && <img src={m.icon_url} alt="" style={{ height:32, width:'auto', display:'block' }}/>}
                        {txt && <p style={{ fontSize:22, color: textColor, fontWeight:600, lineHeight:'130%', margin:0, padding:'5px 0' }}>{txt}</p>}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          }

          /* How To Work block */
          if (block.layout === 'how_to_work') return (
            <HowToWorkBlock key={block.id} block={block} isRtl={isRtl}/>
          )

          /* Content block */
          if (block.layout === 'content') return (
            <ContentBlock key={block.id} block={block} isRtl={isRtl}/>
          )

          /* Stats block */
          if (block.layout === 'stats') return (
            <StatsBlock key={block.id} block={block} isRtl={isRtl}/>
          )

          /* Countdown block */
          if (block.layout === 'countdown') return (
            <CountdownBlock key={block.id} block={block} isRtl={isRtl}/>
          )

          /* Raw HTML block */
          if (block.layout === 'html') return block.html_code ? (
            <div key={block.id} dangerouslySetInnerHTML={{ __html: block.html_code }}/>
          ) : null

          /* Banners block */
          if (block.layout === 'banners') return (
            <BannersBlock key={block.id} block={block}/>
          )

          /* Testimonials block */
          if (block.layout === 'testimonials') return (
            <TestimonialsBlock key={block.id} block={block} isRtl={isRtl}/>
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
            <section key={block.id} style={{
              backgroundImage:`url(https://files.easy-orders.net/1730815545147228170serv-bg.svg)`,
              backgroundSize:'cover', backgroundPosition:'center',
              backgroundColor:'#fdf7e8',
              borderRadius:16, padding:'32px 0', overflow:'hidden',
            }}>
              {/* Animated gold gradient title */}
              {title && (
                <>
                  <style>{`
                    @keyframes pk-faq-pulse { 0%{transform:scale(1)} 50%{transform:scale(1.01)} 100%{transform:scale(1)} }
                    @keyframes pk-faq-grad  { 0%{background-position:0%} 50%{background-position:200%} 100%{background-position:0%} }
                    @keyframes pk-faq-border{ 0%{background-position:0%} 100%{background-position:200%} }
                    .pk-faq-desc { text-align:center;font-size:clamp(22px,4vw,40px);font-weight:bold;margin:0 0 15px;word-break:break-word;
                      background:linear-gradient(90deg,#d99401,#f5c76b,#d99401);background-size:200%;
                      -webkit-background-clip:text;background-clip:text;color:transparent !important;
                      animation:pk-faq-grad 5s ease-in-out infinite, pk-faq-pulse 1.5s ease-in-out infinite; }
                  `}</style>
                  <p className="pk-faq-desc">{title}</p>
                </>
              )}
              {/* Gold badge sub-heading */}
              {body && (
                <>
                  <style>{`
                    .pk-faq-badge { font-weight:800;text-align:center;line-height:130%;text-transform:uppercase;
                      padding:14px 24px;border-radius:30px;font-size:14px;color:#52443a;
                      background-color:rgba(217,148,1,0.15);width:fit-content;margin:0 auto 20px;
                      letter-spacing:2px;position:relative;z-index:1;border:4px solid #d99401;
                      display:block; background-clip:padding-box; }
                    .pk-faq-badge::before { content:'';position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;
                      border-radius:34px;background:linear-gradient(90deg,#d99401,#f5c76b,#d99401);background-size:200%;
                      z-index:-1;animation:pk-faq-border 6s linear infinite paused; }
                    .pk-faq-badge:hover::before { animation-play-state:running; }
                  `}</style>
                  <span className="pk-faq-badge">{body}</span>
                </>
              )}
              <div style={{ padding:'0 12px', width:'100%', boxSizing:'border-box', maxWidth:800, margin:'0 auto' }}>
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

        {/* â”€â”€ Reviews â”€â”€ */}
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
                    <div className="flex flex-col items-end gap-1">
                      <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:800,background:'linear-gradient(135deg,#D99401,#B87E00)',color:'#fff',letterSpacing:0.3,boxShadow:'0 2px 8px rgba(217,148,1,0.25)',whiteSpace:'nowrap'}}>
                        {'✓'} {isRtl?'عملية شراء موثقة':'Verified Purchase'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString(lang==='ar'?'ar-EG':'en-GB',{day:'numeric',month:'short',year:'numeric'})}
                      </span>
                    </div>
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
