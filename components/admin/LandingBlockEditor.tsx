'use client'
import { useState, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { v4 as uuid } from 'uuid'
import {
  Plus, Trash2, GripVertical, X, Globe, LayoutGrid, Video, HelpCircle,
  FileText, Layers, Grid3X3, Image as ImageIcon,
} from 'lucide-react'
import ImageUploadInput from './ImageUploadInput'

// ── Types ──────────────────────────────────────────────────────────────────────
export type FeaturesPreset = 'grid_center'|'grid_hover'|'row_left'|'row_flat'|'big_icon'|'minimal'

export interface FeatureItem   { icon: string; icon_url?: string; icon_size?: number; en: string; ar: string; subtitle_en?: string; subtitle_ar?: string }
export interface CardItem      { image_url?: string; title_en?: string; title_ar?: string; subtitle_en?: string; subtitle_ar?: string }
export interface FaqItem       { q_en: string; q_ar: string; a_en: string; a_ar: string }
export interface MarqueeItem   { icon_url?: string; text_en?: string; text_ar?: string }
export interface TestimonialReview { author_name: string; author_image?: string; review: string; type?: 'facebook'|'google'; review_heading?: string }
export interface TestimonialColors {
  variant: number
  bg_color?: string; hover_color?: string
  review_color?: string; hover_text_color?: string
  author_name_color?: string; author_name_color_hover?: string
  review_heading_color?: string; review_heading_color_hover?: string
}

export interface LandingBlock {
  id: string
  layout: 'image_left'|'image_right'|'text_only'|'image_only'|'features_grid'|'video'|'faq'|'cards_grid'|'marquee'|'testimonials'|'banners'|'countdown'|'stats'|'content'|'how_to_work'|'html'
  image_url?: string; video_url?: string
  title_en?: string; title_ar?: string
  body_en?: string; body_ar?: string
  features?: FeatureItem[]
  features_preset?: FeaturesPreset
  faqs?: FaqItem[]
  cards?: CardItem[]
  marquee_items?: MarqueeItem[]; marquee_bg?: string; marquee_text_color?: string; marquee_speed?: number
  testimonials?: TestimonialReview[]; testimonial_colors?: TestimonialColors
  testimonial_title_align?: 'left'|'center'|'right'
  testimonial_desc?: string; testimonial_desc_color?: string; testimonial_desc_align?: 'left'|'center'|'right'
  banner_variant?: number; banner_images?: { image_url: string; link_url?: string }[]; banner_gap?: number; banner_radius?: number
  countdown_preset?: 1|2|3; countdown_hours?: number; countdown_title_en?: string; countdown_title_ar?: string
  countdown_number_color?: string; countdown_label_color?: string; countdown_box_bg?: string
  stats_items?: { value: number; suffix?: string; label_en?: string; label_ar?: string }[]
  stats_bg?: string; stats_number_color?: string; stats_label_color?: string; stats_card_bg?: string
  stats_number_size?: number; stats_label_size?: number; stats_card_min_width?: number; stats_card_padding?: number
  content_helper_en?: string; content_helper_ar?: string; content_helper_color?: string
  content_title_align?: 'left'|'center'|'right'; content_desc_align?: 'left'|'center'|'right'
  content_desc_color?: string; content_img_link?: string; content_img_side?: 'left'|'right'
  content_btn_text_en?: string; content_btn_text_ar?: string; content_btn_bg?: string; content_btn_link?: string
  content_stats?: { value: string; suffix?: string; label_en?: string; label_ar?: string }[]
  hiw_variant?: 1|2|3|4|5
  hiw_steps?: { title_en?: string; title_ar?: string; desc_en?: string; desc_ar?: string; image_url?: string }[]
  hiw_helper_en?: string; hiw_helper_ar?: string; hiw_helper_color?: string
  hiw_title_align?: 'left'|'center'|'right'; hiw_desc_color?: string
  hiw_step_title_color?: string; hiw_step_desc_color?: string; hiw_accent_color?: string
  hiw_bg?: string; hiw_bg_image?: string
  html_code?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const GOLD = '#d99401'

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 transition-all"

const BLOCK_TYPES: { value: LandingBlock['layout']; label: string; labelAr: string; color: string; icon: React.ReactNode }[] = [
  { value:'image_left',    color:'#3B82F6', label:'Image Left',     labelAr:'صورة يسار',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="16" height="26" rx="2" fill="#3B82F620" stroke="#3B82F6" strokeWidth="1.5"/><rect x="21" y="5" width="18" height="3" rx="1.5" fill="#374151"/><rect x="21" y="11" width="14" height="2" rx="1" fill="#9CA3AF"/><rect x="21" y="15" width="16" height="2" rx="1" fill="#9CA3AF"/></svg> },
  { value:'image_right',   color:'#8B5CF6', label:'Image Right',    labelAr:'صورة يمين',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="23" y="1" width="16" height="26" rx="2" fill="#8B5CF620" stroke="#8B5CF6" strokeWidth="1.5"/><rect x="1" y="5" width="18" height="3" rx="1.5" fill="#374151"/><rect x="1" y="11" width="14" height="2" rx="1" fill="#9CA3AF"/><rect x="1" y="15" width="16" height="2" rx="1" fill="#9CA3AF"/></svg> },
  { value:'text_only',     color:'#10B981', label:'Text Only',      labelAr:'نص فقط',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="4" y="5" width="32" height="3" rx="1.5" fill="#374151"/><rect x="4" y="11" width="32" height="2" rx="1" fill="#9CA3AF"/><rect x="4" y="15" width="28" height="2" rx="1" fill="#9CA3AF"/><rect x="4" y="19" width="30" height="2" rx="1" fill="#9CA3AF"/></svg> },
  { value:'image_only',    color:'#F59E0B', label:'Image Banner',   labelAr:'بانر صورة',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="38" height="26" rx="2" fill="#F59E0B20" stroke="#F59E0B" strokeWidth="1.5"/><circle cx="20" cy="14" r="5" fill="#F59E0B40"/></svg> },
  { value:'features_grid', color:'#EF4444', label:'Features Grid',  labelAr:'شبكة مميزات',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="11" height="12" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="15" y="1" width="11" height="12" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="29" y="1" width="10" height="12" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="1" y="16" width="11" height="11" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="15" y="16" width="11" height="11" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="29" y="16" width="10" height="11" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/></svg> },
  { value:'cards_grid',    color:'#F97316', label:'Cards Grid',     labelAr:'شبكة بطاقات',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="12" height="26" rx="2" fill="#F9731620" stroke="#F97316" strokeWidth="1"/><rect x="15" y="1" width="12" height="26" rx="2" fill="#F9731620" stroke="#F97316" strokeWidth="1"/><rect x="29" y="1" width="10" height="26" rx="2" fill="#F9731620" stroke="#F97316" strokeWidth="1"/></svg> },
  { value:'video',         color:'#EC4899', label:'Video Embed',    labelAr:'فيديو',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="38" height="26" rx="2" fill="#EC489920" stroke="#EC4899" strokeWidth="1.5"/><polygon points="15,9 29,14 15,19" fill="#EC4899"/></svg> },
  { value:'faq',           color:'#06B6D4', label:'FAQ',            labelAr:'أسئلة شائعة',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="2" width="38" height="6" rx="2" fill="#06B6D420" stroke="#06B6D4" strokeWidth="1"/><rect x="1" y="11" width="38" height="6" rx="2" fill="#06B6D410" stroke="#06B6D430" strokeWidth="1"/><rect x="1" y="20" width="38" height="6" rx="2" fill="#06B6D410" stroke="#06B6D430" strokeWidth="1"/></svg> },
  { value:'testimonials',  color:'#7C3AED', label:'Testimonials',   labelAr:'تقييمات',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="2" width="17" height="24" rx="3" fill="#7C3AED20" stroke="#7C3AED" strokeWidth="1"/><rect x="22" y="2" width="17" height="24" rx="3" fill="#7C3AED20" stroke="#7C3AED" strokeWidth="1"/><circle cx="9" cy="9" r="4" fill="#7C3AED40"/><circle cx="30" cy="9" r="4" fill="#7C3AED40"/></svg> },
  { value:'banners',       color:'#0EA5E9', label:'Banner Grid',    labelAr:'شبكة بانرات',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="17" height="26" rx="2" fill="#0EA5E920" stroke="#0EA5E9" strokeWidth="1.2"/><rect x="21" y="1" width="8" height="12" rx="2" fill="#0EA5E920" stroke="#0EA5E9" strokeWidth="1.2"/><rect x="31" y="1" width="8" height="12" rx="2" fill="#0EA5E920" stroke="#0EA5E9" strokeWidth="1.2"/><rect x="21" y="15" width="18" height="12" rx="2" fill="#0EA5E920" stroke="#0EA5E9" strokeWidth="1.2"/></svg> },
  { value:'marquee',       color:'#D92D36', label:'Marquee Strip',  labelAr:'شريط متحرك',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="38" height="26" rx="2" fill="#D92D3620" stroke="#D92D36" strokeWidth="1.5"/><circle cx="8" cy="14" r="4" fill="#D92D3640"/><circle cx="20" cy="14" r="4" fill="#D92D3640"/><circle cx="32" cy="14" r="4" fill="#D92D3640"/></svg> },
  { value:'how_to_work',   color:'#6366F1', label:'How It Works',   labelAr:'كيف يعمل',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><circle cx="7" cy="14" r="5" fill="#6366F120" stroke="#6366F1" strokeWidth="1.2"/><circle cx="20" cy="14" r="5" fill="#6366F120" stroke="#6366F1" strokeWidth="1.2"/><circle cx="33" cy="14" r="5" fill="#6366F120" stroke="#6366F1" strokeWidth="1.2"/><path d="M12 14h3M25 14h3" stroke="#6366F160" strokeWidth="1.5" strokeDasharray="2 1"/></svg> },
  { value:'content',       color:'#10B981', label:'Content Card',   labelAr:'بطاقة محتوى',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="16" height="26" rx="2" fill="#10B98120" stroke="#10B981" strokeWidth="1.2"/><rect x="20" y="4" width="19" height="3" rx="1.5" fill="#374151"/><rect x="20" y="9" width="15" height="2" rx="1" fill="#9CA3AF"/><rect x="20" y="13" width="17" height="2" rx="1" fill="#9CA3AF"/></svg> },
  { value:'stats',         color:'#D99401', label:'Stats Numbers',  labelAr:'أرقام وإحصائيات',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="6" width="11" height="21" rx="2" fill="#D9940120" stroke="#D99401" strokeWidth="1.2"/><rect x="15" y="2" width="11" height="25" rx="2" fill="#D9940120" stroke="#D99401" strokeWidth="1.2"/><rect x="29" y="10" width="10" height="17" rx="2" fill="#D9940120" stroke="#D99401" strokeWidth="1.2"/></svg> },
  { value:'countdown',     color:'#F59E0B', label:'Countdown Timer',labelAr:'عداد تنازلي',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="4" width="8" height="20" rx="2" fill="#F59E0B20" stroke="#F59E0B" strokeWidth="1.2"/><rect x="11" y="4" width="8" height="20" rx="2" fill="#F59E0B20" stroke="#F59E0B" strokeWidth="1.2"/><rect x="21" y="4" width="8" height="20" rx="2" fill="#F59E0B20" stroke="#F59E0B" strokeWidth="1.2"/><rect x="31" y="4" width="8" height="20" rx="2" fill="#F59E0B20" stroke="#F59E0B" strokeWidth="1.2"/></svg> },
  { value:'html',          color:'#64748B', label:'HTML Block',     labelAr:'كود HTML',
    icon:<svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="38" height="26" rx="2" fill="#64748B20" stroke="#64748B" strokeWidth="1.5"/><text x="5" y="19" fontSize="11" fontWeight="bold" fill="#64748B">{'</>'}</text></svg> },
]

// ── Label component ────────────────────────────────────────────────────────────
function FL({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1">{children}</div>
}

function ColorRow({ label, value, onChange, defaultVal }: { label: string; value?: string; onChange: (v: string) => void; defaultVal: string }) {
  const v = value || defaultVal
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={v} onChange={e => onChange(e.target.value)}
        className="w-8 h-7 rounded cursor-pointer border border-gray-200 dark:border-gray-700 flex-shrink-0"/>
      <input value={v} onChange={e => onChange(e.target.value)}
        className={`${inp} flex-1 font-mono text-xs`}/>
      <span className="text-[10px] text-gray-400 w-28 flex-shrink-0">{label}</span>
    </div>
  )
}

function AlignPicker({ value, onChange, accentColor = 'amber' }: { value?: string; onChange: (v: string) => void; accentColor?: string }) {
  const cls = (a: string) => `flex-1 py-1 rounded-lg text-[10px] font-bold border-2 transition-all ${
    (value || 'center') === a
      ? `border-${accentColor}-400 text-${accentColor}-600 bg-${accentColor}-50 dark:bg-${accentColor}-500/10`
      : 'border-gray-200 dark:border-gray-700 text-gray-400'
  }`
  return (
    <div className="flex gap-1">
      {(['left', 'center', 'right'] as const).map(a => (
        <button key={a} onClick={() => onChange(a)} className={cls(a)}>
          {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
        </button>
      ))}
    </div>
  )
}

// ── Block Settings Panel ───────────────────────────────────────────────────────
function BlockSettings({ block, onChange }: { block: LandingBlock; onChange: (p: Partial<LandingBlock>) => void }) {
  const upd = useCallback((p: Partial<LandingBlock>) => onChange(p), [onChange])

  const TitleBody = () => (
    <>
      <div>
        <FL><Globe size={9}/>العنوان</FL>
        <div className="grid grid-cols-2 gap-2">
          <input value={block.title_en || ''} onChange={e => upd({ title_en: e.target.value })} placeholder="Title EN" className={inp}/>
          <input value={block.title_ar || ''} onChange={e => upd({ title_ar: e.target.value })} placeholder="العنوان AR" className={inp} dir="rtl"/>
        </div>
      </div>
      <div>
        <FL><FileText size={9}/>النص</FL>
        <div className="grid grid-cols-2 gap-2">
          <textarea value={block.body_en || ''} onChange={e => upd({ body_en: e.target.value })} rows={3} placeholder="Body EN" className={`${inp} resize-none`}/>
          <textarea value={block.body_ar || ''} onChange={e => upd({ body_ar: e.target.value })} rows={3} placeholder="النص AR" className={`${inp} resize-none`} dir="rtl"/>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">

      {/* ── Image fields ── */}
      {['image_left', 'image_right', 'image_only'].includes(block.layout) && (
        <div>
          <FL><ImageIcon size={9}/>الصورة</FL>
          <ImageUploadInput value={block.image_url || ''} onChange={url => upd({ image_url: url })} folder="landing-blocks"/>
        </div>
      )}

      {/* ── Video ── */}
      {block.layout === 'video' && (
        <div>
          <FL><Video size={9}/>YouTube URL</FL>
          <input value={block.video_url || ''} onChange={e => upd({ video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className={inp}/>
        </div>
      )}

      {/* ── Text + Body (simple layouts) ── */}
      {['image_left', 'image_right', 'text_only', 'video'].includes(block.layout) && <TitleBody/>}

      {/* ── Features Grid ── */}
      {block.layout === 'features_grid' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><FL>Title EN</FL><input value={block.title_en || ''} onChange={e => upd({ title_en: e.target.value })} placeholder="Why choose us" className={inp}/></div>
            <div><FL>عنوان AR</FL><input value={block.title_ar || ''} onChange={e => upd({ title_ar: e.target.value })} placeholder="لماذا تختارنا" className={inp} dir="rtl"/></div>
          </div>
          <div>
            <FL><LayoutGrid size={9}/>نمط البطاقات</FL>
            <div className="grid grid-cols-3 gap-1.5">
              {(['grid_center','grid_hover','row_left','row_flat','big_icon','minimal'] as FeaturesPreset[]).map(p => (
                <button key={p} onClick={() => upd({ features_preset: p })}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border-2 transition-all ${(block.features_preset || 'grid_center') === p ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FL><LayoutGrid size={9}/>العناصر</FL>
            <div className="space-y-3">
              {(block.features || []).map((f, fi) => (
                <div key={fi} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400">عنصر {fi + 1}</span>
                    <button onClick={() => upd({ features: (block.features || []).filter((_, j) => j !== fi) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"><X size={10}/></button>
                  </div>
                  <ImageUploadInput value={f.icon_url || ''} onChange={url => { const fs = [...(block.features || [])]; fs[fi] = { ...f, icon_url: url }; upd({ features: fs }) }} folder="landing-icons"/>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-400 whitespace-nowrap">Size: {f.icon_size || 40}px</span>
                    <input type="range" min={20} max={120} step={4} value={f.icon_size || 40}
                      onChange={e => { const fs = [...(block.features || [])]; fs[fi] = { ...f, icon_size: +e.target.value }; upd({ features: fs }) }}
                      className="flex-1 accent-yellow-500 h-1"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={f.en} onChange={e => { const fs = [...(block.features || [])]; fs[fi] = { ...f, en: e.target.value }; upd({ features: fs }) }} placeholder="Title EN" className={inp}/>
                    <input value={f.ar} onChange={e => { const fs = [...(block.features || [])]; fs[fi] = { ...f, ar: e.target.value }; upd({ features: fs }) }} placeholder="عنوان AR" className={inp} dir="rtl"/>
                    <input value={f.subtitle_en || ''} onChange={e => { const fs = [...(block.features || [])]; fs[fi] = { ...f, subtitle_en: e.target.value }; upd({ features: fs }) }} placeholder="Subtitle EN" className={inp}/>
                    <input value={f.subtitle_ar || ''} onChange={e => { const fs = [...(block.features || [])]; fs[fi] = { ...f, subtitle_ar: e.target.value }; upd({ features: fs }) }} placeholder="وصف AR" className={inp} dir="rtl"/>
                  </div>
                </div>
              ))}
              <button onClick={() => upd({ features: [...(block.features || []), { icon: '', en: '', ar: '' }] })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-yellow-600 hover:border-yellow-400 transition-colors w-full justify-center">
                <Plus size={12}/>إضافة عنصر
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Cards Grid ── */}
      {block.layout === 'cards_grid' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><FL>Title EN</FL><input value={block.title_en || ''} onChange={e => upd({ title_en: e.target.value })} placeholder="Our Plans" className={inp}/></div>
            <div><FL>عنوان AR</FL><input value={block.title_ar || ''} onChange={e => upd({ title_ar: e.target.value })} placeholder="باقاتنا" className={inp} dir="rtl"/></div>
          </div>
          <div>
            <FL><Grid3X3 size={9}/>البطاقات</FL>
            <div className="space-y-3">
              {(block.cards || []).map((c, ci) => (
                <div key={ci} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold text-gray-400">بطاقة {ci + 1}</span>
                    <button onClick={() => upd({ cards: (block.cards || []).filter((_, j) => j !== ci) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                  </div>
                  <ImageUploadInput value={c.image_url || ''} onChange={url => { const cs = [...(block.cards || [])]; cs[ci] = { ...c, image_url: url }; upd({ cards: cs }) }} folder="landing-cards"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={c.title_en || ''} onChange={e => { const cs = [...(block.cards || [])]; cs[ci] = { ...c, title_en: e.target.value }; upd({ cards: cs }) }} placeholder="Title EN" className={inp}/>
                    <input value={c.title_ar || ''} onChange={e => { const cs = [...(block.cards || [])]; cs[ci] = { ...c, title_ar: e.target.value }; upd({ cards: cs }) }} placeholder="عنوان AR" className={inp} dir="rtl"/>
                    <input value={c.subtitle_en || ''} onChange={e => { const cs = [...(block.cards || [])]; cs[ci] = { ...c, subtitle_en: e.target.value }; upd({ cards: cs }) }} placeholder="Subtitle EN" className={inp}/>
                    <input value={c.subtitle_ar || ''} onChange={e => { const cs = [...(block.cards || [])]; cs[ci] = { ...c, subtitle_ar: e.target.value }; upd({ cards: cs }) }} placeholder="وصف AR" className={inp} dir="rtl"/>
                  </div>
                </div>
              ))}
              <button onClick={() => upd({ cards: [...(block.cards || []), { image_url: '', title_en: '', title_ar: '' }] })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-yellow-600 hover:border-yellow-400 transition-colors w-full justify-center">
                <Plus size={12}/>إضافة بطاقة
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── FAQ ── */}
      {block.layout === 'faq' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><FL>Title EN</FL><input value={block.title_en || ''} onChange={e => upd({ title_en: e.target.value })} placeholder="FAQ" className={inp}/></div>
            <div><FL>عنوان AR</FL><input value={block.title_ar || ''} onChange={e => upd({ title_ar: e.target.value })} placeholder="الأسئلة الشائعة" className={inp} dir="rtl"/></div>
          </div>
          <div>
            <FL><HelpCircle size={9}/>الأسئلة</FL>
            <div className="space-y-3">
              {(block.faqs || []).map((faq, fi) => (
                <div key={fi} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                  <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-500/10 border-b border-yellow-100 dark:border-yellow-500/20">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: GOLD + '25', color: GOLD }}>Q{fi + 1}</span>
                    <span className="flex-1 text-[10px] font-semibold text-yellow-700 dark:text-yellow-400">سؤال</span>
                    <button onClick={() => upd({ faqs: (block.faqs || []).filter((_, j) => j !== fi) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={faq.q_en} onChange={e => { const fs = [...(block.faqs || [])]; fs[fi] = { ...faq, q_en: e.target.value }; upd({ faqs: fs }) }} placeholder="Question EN" className={inp}/>
                      <input value={faq.q_ar} onChange={e => { const fs = [...(block.faqs || [])]; fs[fi] = { ...faq, q_ar: e.target.value }; upd({ faqs: fs }) }} placeholder="السؤال AR" className={inp} dir="rtl"/>
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 pt-1">الإجابة</div>
                    <div className="grid grid-cols-2 gap-2">
                      <textarea value={faq.a_en} onChange={e => { const fs = [...(block.faqs || [])]; fs[fi] = { ...faq, a_en: e.target.value }; upd({ faqs: fs }) }} rows={2} placeholder="Answer EN" className={`${inp} resize-none`}/>
                      <textarea value={faq.a_ar} onChange={e => { const fs = [...(block.faqs || [])]; fs[fi] = { ...faq, a_ar: e.target.value }; upd({ faqs: fs }) }} rows={2} placeholder="الإجابة AR" className={`${inp} resize-none`} dir="rtl"/>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => upd({ faqs: [...(block.faqs || []), { q_en: '', q_ar: '', a_en: '', a_ar: '' }] })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-yellow-600 hover:border-yellow-400 transition-colors w-full justify-center">
                <Plus size={12}/>إضافة سؤال
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Marquee ── */}
      {block.layout === 'marquee' && (
        <>
          <ColorRow label="لون الخلفية" value={block.marquee_bg} onChange={v => upd({ marquee_bg: v })} defaultVal="#d92d36"/>
          <ColorRow label="لون النص" value={block.marquee_text_color} onChange={v => upd({ marquee_text_color: v })} defaultVal="#ffffff"/>
          <div>
            <FL>السرعة: {block.marquee_speed || 15}s (أقل = أسرع)</FL>
            <input type="range" min={5} max={40} step={1} value={block.marquee_speed || 15}
              onChange={e => upd({ marquee_speed: +e.target.value })} className="w-full accent-yellow-500 h-1"/>
          </div>
          <div>
            <FL><Layers size={9}/>العناصر</FL>
            <div className="space-y-2">
              {(block.marquee_items || []).map((m, mi) => (
                <div key={mi} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold text-gray-400">عنصر {mi + 1}</span>
                    <button onClick={() => upd({ marquee_items: (block.marquee_items || []).filter((_, j) => j !== mi) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                  </div>
                  <ImageUploadInput value={m.icon_url || ''} onChange={url => { const ms = [...(block.marquee_items || [])]; ms[mi] = { ...m, icon_url: url }; upd({ marquee_items: ms }) }} folder="landing-marquee"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={m.text_en || ''} onChange={e => { const ms = [...(block.marquee_items || [])]; ms[mi] = { ...m, text_en: e.target.value }; upd({ marquee_items: ms }) }} placeholder="Label EN" className={inp}/>
                    <input value={m.text_ar || ''} onChange={e => { const ms = [...(block.marquee_items || [])]; ms[mi] = { ...m, text_ar: e.target.value }; upd({ marquee_items: ms }) }} placeholder="نص AR" className={inp} dir="rtl"/>
                  </div>
                </div>
              ))}
              <button onClick={() => upd({ marquee_items: [...(block.marquee_items || []), { icon_url: '', text_en: '', text_ar: '' }] })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-400 transition-colors w-full justify-center">
                <Plus size={12}/>إضافة عنصر
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Testimonials ── */}
      {block.layout === 'testimonials' && (() => {
        const tc = block.testimonial_colors || { variant: 1 }
        const setTc = (p: Partial<TestimonialColors>) => upd({ testimonial_colors: { ...tc, ...p } })
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><FL>Title EN</FL><input value={block.title_en || ''} onChange={e => upd({ title_en: e.target.value })} placeholder="Reviews" className={inp}/></div>
              <div><FL>عنوان AR</FL><input value={block.title_ar || ''} onChange={e => upd({ title_ar: e.target.value })} placeholder="آراء العملاء" className={inp} dir="rtl"/></div>
            </div>
            <div>
              <FL>تنسيق العنوان</FL>
              <AlignPicker value={block.testimonial_title_align} onChange={v => upd({ testimonial_title_align: v as any })} accentColor="violet"/>
            </div>
            <div>
              <FL>نوع التصميم (1-11)</FL>
              <div className="grid grid-cols-6 gap-1">
                {[1,2,3,4,5,6,7,8,9,10,11].map(v => (
                  <button key={v} onClick={() => setTc({ variant: v })}
                    className={`py-1.5 rounded-lg text-[11px] font-black border-2 transition-all ${tc.variant === v ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <ColorRow label="خلفية البطاقة" value={tc.bg_color} onChange={v => setTc({ bg_color: v })} defaultVal="#ffffff"/>
              <ColorRow label="خلفية hover" value={tc.hover_color} onChange={v => setTc({ hover_color: v })} defaultVal="#f5f5f5"/>
              <ColorRow label="لون النص" value={tc.review_color} onChange={v => setTc({ review_color: v })} defaultVal="#333333"/>
              <ColorRow label="لون الاسم" value={tc.author_name_color} onChange={v => setTc({ author_name_color: v })} defaultVal="#111111"/>
            </div>
            <div>
              <FL>التقييمات</FL>
              <div className="space-y-3">
                {(block.testimonials || []).map((r, ri) => (
                  <div key={ri} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold text-gray-400">تقييم {ri + 1}</span>
                      <button onClick={() => upd({ testimonials: (block.testimonials || []).filter((_, j) => j !== ri) })}
                        className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                    </div>
                    <ImageUploadInput value={r.author_image || ''} onChange={url => { const rs = [...(block.testimonials || [])]; rs[ri] = { ...r, author_image: url }; upd({ testimonials: rs }) }} folder="landing-testimonials"/>
                    <input value={r.author_name} onChange={e => { const rs = [...(block.testimonials || [])]; rs[ri] = { ...r, author_name: e.target.value }; upd({ testimonials: rs }) }} placeholder="اسم العميل" className={inp} dir="rtl"/>
                    <textarea value={r.review} onChange={e => { const rs = [...(block.testimonials || [])]; rs[ri] = { ...r, review: e.target.value }; upd({ testimonials: rs }) }} rows={3} placeholder="نص التقييم..." className={`${inp} resize-none`} dir="rtl"/>
                    <div className="flex gap-1.5">
                      {(['facebook', 'google'] as const).map(t => (
                        <button key={t} onClick={() => { const rs = [...(block.testimonials || [])]; rs[ri] = { ...r, type: t }; upd({ testimonials: rs }) }}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold border-2 transition-all capitalize ${r.type === t ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10 text-violet-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={() => upd({ testimonials: [...(block.testimonials || []), { author_name: '', review: '', type: 'facebook' }] })}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-violet-600 hover:border-violet-400 transition-colors w-full justify-center">
                  <Plus size={12}/>إضافة تقييم
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Banners ── */}
      {block.layout === 'banners' && (
        <>
          <div>
            <FL>نوع التخطيط (1-9)</FL>
            <div className="grid grid-cols-5 gap-1">
              {[1,2,3,4,5,6,7,8,9].map(v => (
                <button key={v} onClick={() => upd({ banner_variant: v })}
                  className={`py-1.5 rounded-lg text-[11px] font-black border-2 transition-all ${(block.banner_variant || 1) === v ? 'border-sky-400 bg-sky-50 dark:bg-sky-500/10 text-sky-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><FL>Gap: {block.banner_gap ?? 8}px</FL><input type="range" min={0} max={24} step={2} value={block.banner_gap ?? 8} onChange={e => upd({ banner_gap: +e.target.value })} className="w-full accent-sky-500 h-1"/></div>
            <div><FL>Radius: {block.banner_radius ?? 12}px</FL><input type="range" min={0} max={32} step={2} value={block.banner_radius ?? 12} onChange={e => upd({ banner_radius: +e.target.value })} className="w-full accent-sky-500 h-1"/></div>
          </div>
          <div>
            <FL>الصور</FL>
            <div className="space-y-2">
              {(block.banner_images || []).map((img, ii) => (
                <div key={ii} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold text-sky-500">صورة {ii + 1}</span>
                    <button onClick={() => upd({ banner_images: (block.banner_images || []).filter((_, j) => j !== ii) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                  </div>
                  <ImageUploadInput value={img.image_url} onChange={url => { const imgs = [...(block.banner_images || [])]; imgs[ii] = { ...img, image_url: url }; upd({ banner_images: imgs }) }} folder="landing-banners"/>
                  <input value={img.link_url || ''} onChange={e => { const imgs = [...(block.banner_images || [])]; imgs[ii] = { ...img, link_url: e.target.value }; upd({ banner_images: imgs }) }} placeholder="رابط الصورة (اختياري)" className={inp}/>
                </div>
              ))}
              <button onClick={() => upd({ banner_images: [...(block.banner_images || []), { image_url: '' }] })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-sky-600 hover:border-sky-400 transition-colors w-full justify-center">
                <Plus size={12}/>إضافة صورة
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── How It Works ── */}
      {block.layout === 'how_to_work' && (
        <>
          <div>
            <FL>نوع التصميم</FL>
            <div className="flex gap-1.5">
              {([1,2,3,4,5] as const).map(v => (
                <button key={v} onClick={() => upd({ hiw_variant: v })}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg border-2 transition-all ${(block.hiw_variant || 1) === v ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                  {['Cards','Timeline','Horiz','Alt','Icons'][v-1]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><FL>Title EN</FL><input value={block.title_en || ''} onChange={e => upd({ title_en: e.target.value })} placeholder="How It Works" className={inp}/></div>
            <div><FL>عنوان AR</FL><input value={block.title_ar || ''} onChange={e => upd({ title_ar: e.target.value })} placeholder="كيف يعمل" className={inp} dir="rtl"/></div>
          </div>
          <div>
            <FL>تنسيق العنوان</FL>
            <AlignPicker value={block.hiw_title_align} onChange={v => upd({ hiw_title_align: v as any })} accentColor="indigo"/>
          </div>
          <div className="space-y-2">
            <ColorRow label="لون accent" value={block.hiw_accent_color} onChange={v => upd({ hiw_accent_color: v })} defaultVal="#d99401"/>
            <ColorRow label="خلفية القسم" value={block.hiw_bg} onChange={v => upd({ hiw_bg: v })} defaultVal="#f8fafc"/>
          </div>
          <div>
            <FL>الخطوات</FL>
            <div className="space-y-2">
              {(block.hiw_steps || []).map((s, si) => (
                <div key={si} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold text-indigo-400">خطوة {si + 1}</span>
                    <button onClick={() => upd({ hiw_steps: (block.hiw_steps || []).filter((_, j) => j !== si) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={s.title_en || ''} onChange={e => { const ss = [...(block.hiw_steps || [])]; ss[si] = { ...s, title_en: e.target.value }; upd({ hiw_steps: ss }) }} placeholder="Title EN" className={inp}/>
                    <input value={s.title_ar || ''} onChange={e => { const ss = [...(block.hiw_steps || [])]; ss[si] = { ...s, title_ar: e.target.value }; upd({ hiw_steps: ss }) }} placeholder="العنوان AR" className={inp} dir="rtl"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <textarea value={s.desc_en || ''} onChange={e => { const ss = [...(block.hiw_steps || [])]; ss[si] = { ...s, desc_en: e.target.value }; upd({ hiw_steps: ss }) }} rows={2} placeholder="Desc EN" className={inp}/>
                    <textarea value={s.desc_ar || ''} onChange={e => { const ss = [...(block.hiw_steps || [])]; ss[si] = { ...s, desc_ar: e.target.value }; upd({ hiw_steps: ss }) }} rows={2} placeholder="الوصف AR" className={inp} dir="rtl"/>
                  </div>
                  <ImageUploadInput value={s.image_url || ''} onChange={url => { const ss = [...(block.hiw_steps || [])]; ss[si] = { ...s, image_url: url }; upd({ hiw_steps: ss }) }} folder="landing-hiw"/>
                </div>
              ))}
              <button onClick={() => upd({ hiw_steps: [...(block.hiw_steps || []), { title_en: '', title_ar: '', desc_en: '', desc_ar: '', image_url: '' }] })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-500 hover:border-indigo-400 transition-colors w-full justify-center">
                <Plus size={12}/>إضافة خطوة
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Content Card ── */}
      {block.layout === 'content' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><FL>Title EN</FL><input value={block.title_en || ''} onChange={e => upd({ title_en: e.target.value })} placeholder="Title" className={inp}/></div>
            <div><FL>عنوان AR</FL><input value={block.title_ar || ''} onChange={e => upd({ title_ar: e.target.value })} placeholder="العنوان" className={inp} dir="rtl"/></div>
          </div>
          <div><FL>تنسيق العنوان</FL><AlignPicker value={block.content_title_align} onChange={v => upd({ content_title_align: v as any })}/></div>
          <div>
            <FL>النص الفرعي</FL>
            <div className="space-y-1.5">
              <textarea value={block.body_en || ''} onChange={e => upd({ body_en: e.target.value })} rows={2} placeholder="Body EN" className={inp}/>
              <textarea value={block.body_ar || ''} onChange={e => upd({ body_ar: e.target.value })} rows={2} placeholder="النص AR" className={inp} dir="rtl"/>
            </div>
          </div>
          <div>
            <FL>الصورة</FL>
            <ImageUploadInput value={block.image_url || ''} onChange={url => upd({ image_url: url })} folder="landing-content"/>
            <div className="flex gap-1 mt-1">
              {(['left', 'right'] as const).map(s => (
                <button key={s} onClick={() => upd({ content_img_side: s })}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition-all ${(block.content_img_side || 'right') === s ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                  صورة {s === 'left' ? 'يسار' : 'يمين'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><FL>CTA EN</FL><input value={block.content_btn_text_en || ''} onChange={e => upd({ content_btn_text_en: e.target.value })} placeholder="Get Started" className={inp}/></div>
            <div><FL>CTA AR</FL><input value={block.content_btn_text_ar || ''} onChange={e => upd({ content_btn_text_ar: e.target.value })} placeholder="ابدأ الآن" className={inp} dir="rtl"/></div>
            <div className="col-span-2"><FL>رابط CTA</FL><input value={block.content_btn_link || ''} onChange={e => upd({ content_btn_link: e.target.value })} placeholder="/u/shop" className={inp}/></div>
          </div>
        </>
      )}

      {/* ── Stats ── */}
      {block.layout === 'stats' && (
        <>
          <div className="space-y-2">
            <ColorRow label="خلفية القسم" value={block.stats_bg} onChange={v => upd({ stats_bg: v })} defaultVal="#0f172a"/>
            <ColorRow label="لون الأرقام" value={block.stats_number_color} onChange={v => upd({ stats_number_color: v })} defaultVal="#d99401"/>
            <ColorRow label="لون التسميات" value={block.stats_label_color} onChange={v => upd({ stats_label_color: v })} defaultVal="#94a3b8"/>
          </div>
          <div>
            <FL>الأرقام</FL>
            <div className="space-y-2">
              {(block.stats_items || []).map((s, si) => (
                <div key={si} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold" style={{ color: GOLD }}>رقم {si + 1}</span>
                    <button onClick={() => upd({ stats_items: (block.stats_items || []).filter((_, j) => j !== si) })}
                      className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input value={String(s.value)} onChange={e => { const ss = [...(block.stats_items || [])]; ss[si] = { ...s, value: +e.target.value }; upd({ stats_items: ss }) }} placeholder="1500" type="number" className={inp}/>
                    <input value={s.suffix || ''} onChange={e => { const ss = [...(block.stats_items || [])]; ss[si] = { ...s, suffix: e.target.value }; upd({ stats_items: ss }) }} placeholder="+" className={inp}/>
                    <input value={s.label_en || ''} onChange={e => { const ss = [...(block.stats_items || [])]; ss[si] = { ...s, label_en: e.target.value }; upd({ stats_items: ss }) }} placeholder="Orders" className={inp}/>
                    <input value={s.label_ar || ''} onChange={e => { const ss = [...(block.stats_items || [])]; ss[si] = { ...s, label_ar: e.target.value }; upd({ stats_items: ss }) }} placeholder="طلب" className={inp} dir="rtl"/>
                  </div>
                </div>
              ))}
              <button onClick={() => upd({ stats_items: [...(block.stats_items || []), { value: 0, suffix: '+', label_en: '', label_ar: '' }] })}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-yellow-600 hover:border-yellow-400 transition-colors w-full justify-center">
                <Plus size={12}/>إضافة رقم
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Countdown ── */}
      {block.layout === 'countdown' && (
        <>
          <div>
            <FL>نوع التصميم</FL>
            <div className="flex gap-1.5">
              {([1,2,3] as const).map(v => (
                <button key={v} onClick={() => upd({ countdown_preset: v })}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg border-2 transition-all ${(block.countdown_preset || 1) === v ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' : 'border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                  نمط {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FL>المدة (بالساعات)</FL>
            <input type="number" value={block.countdown_hours || 24} onChange={e => upd({ countdown_hours: +e.target.value })} className={inp}/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><FL>العنوان EN</FL><input value={block.countdown_title_en || ''} onChange={e => upd({ countdown_title_en: e.target.value })} placeholder="Limited Offer!" className={inp}/></div>
            <div><FL>العنوان AR</FL><input value={block.countdown_title_ar || ''} onChange={e => upd({ countdown_title_ar: e.target.value })} placeholder="عرض محدود!" className={inp} dir="rtl"/></div>
          </div>
          <div className="space-y-2">
            <ColorRow label="لون الأرقام" value={block.countdown_number_color} onChange={v => upd({ countdown_number_color: v })} defaultVal="#d99401"/>
            <ColorRow label="لون التسميات" value={block.countdown_label_color} onChange={v => upd({ countdown_label_color: v })} defaultVal="#94a3b8"/>
            <ColorRow label="خلفية الصناديق" value={block.countdown_box_bg} onChange={v => upd({ countdown_box_bg: v })} defaultVal="#1e293b"/>
          </div>
        </>
      )}

      {/* ── HTML ── */}
      {block.layout === 'html' && (
        <div>
          <FL>كود HTML</FL>
          <textarea value={block.html_code || ''} onChange={e => upd({ html_code: e.target.value })}
            rows={12} placeholder="<!-- ضع كودك هنا -->" className={`${inp} font-mono text-xs resize-y`}/>
        </div>
      )}
    </div>
  )
}

// ── Sortable Row ───────────────────────────────────────────────────────────────
function SortableRow({ block, isSelected, onClick, onRemove }: {
  block: LandingBlock; isSelected: boolean; onClick: () => void; onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const bt = BLOCK_TYPES.find(b => b.value === block.layout)

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onClick={onClick}>
      <button {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 flex-shrink-0 touch-none"
        onClick={e => e.stopPropagation()}>
        <GripVertical size={16}/>
      </button>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: (bt?.color || GOLD) + '18' }}>
        <div className="scale-75">{bt?.icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-bold truncate ${isSelected ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {bt?.labelAr || bt?.label || block.layout}
        </div>
        {(block.title_ar || block.title_en) && (
          <div className="text-[10px] text-gray-400 truncate mt-0.5">{block.title_ar || block.title_en}</div>
        )}
      </div>
      <button onClick={e => { e.stopPropagation(); onRemove() }}
        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0">
        <Trash2 size={11}/>
      </button>
    </div>
  )
}

// ── Main Editor ────────────────────────────────────────────────────────────────
interface Props {
  blocks: LandingBlock[]
  onChange: (blocks: LandingBlock[]) => void
}

export default function LandingBlockEditor({ blocks, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const selected = blocks.find(b => b.id === selectedId) || null

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const from = blocks.findIndex(b => b.id === active.id)
      const to   = blocks.findIndex(b => b.id === over.id)
      onChange(arrayMove(blocks, from, to))
    }
  }

  function addBlock(layout: LandingBlock['layout']) {
    const nb: LandingBlock = { id: uuid(), layout }
    onChange([...blocks, nb])
    setSelectedId(nb.id)
    setAddOpen(false)
  }

  function updateBlock(id: string, patch: Partial<LandingBlock>) {
    onChange(blocks.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  function removeBlock(id: string) {
    onChange(blocks.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117]">
      {/* ── Left: block list ── */}
      <div className="w-60 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">بلوكات الصفحة ({blocks.length})</span>
          <button onClick={() => setAddOpen(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
            style={{ background: GOLD }}>
            <Plus size={12}/> إضافة
          </button>
        </div>

        {/* Block type picker */}
        {addOpen && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto max-h-64 flex-shrink-0">
            <div className="grid grid-cols-1 gap-1">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.value} onClick={() => addBlock(bt.value)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-white dark:hover:bg-gray-800 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bt.color + '15' }}>
                    <div className="scale-75">{bt.icon}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{bt.labelAr}</div>
                    <div className="text-[9px] text-gray-400">{bt.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sortable list */}
        <div className="flex-1 overflow-y-auto p-2">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ background: GOLD + '20' }}>
                <Plus size={18} style={{ color: GOLD }}/>
              </div>
              <p className="text-xs text-gray-400">لا توجد بلوكات بعد<br/>اضغط "إضافة" لبدء بناء الصفحة</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {blocks.map(b => (
                    <SortableRow key={b.id} block={b}
                      isSelected={selectedId === b.id}
                      onClick={() => setSelectedId(selectedId === b.id ? null : b.id)}
                      onRemove={() => removeBlock(b.id)}/>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* ── Right: settings panel ── */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0D1117]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: (BLOCK_TYPES.find(b => b.value === selected.layout)?.color || GOLD) + '20' }}>
                <div className="scale-75">{BLOCK_TYPES.find(b => b.value === selected.layout)?.icon}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800 dark:text-white">
                  {BLOCK_TYPES.find(b => b.value === selected.layout)?.labelAr}
                </div>
                <div className="text-[10px] text-gray-400">{BLOCK_TYPES.find(b => b.value === selected.layout)?.label}</div>
              </div>
              <button onClick={() => removeBlock(selected.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                <Trash2 size={12}/> حذف
              </button>
            </div>
            <BlockSettings block={selected} onChange={p => updateBlock(selected.id, p)}/>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-64 text-center px-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: GOLD + '15' }}>
              <Layers size={22} style={{ color: GOLD }}/>
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">اختر بلوك لتعديله</p>
            <p className="text-xs text-gray-400">اضغط على أي بلوك من القائمة لرؤية إعداداته</p>
          </div>
        )}
      </div>
    </div>
  )
}
