'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { v4 as uuid } from 'uuid'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft, Plus, Trash2, Check, AlertCircle, Save, Globe,
  GripVertical, ChevronLeft, Download, Upload, X, Image as ImageIcon,
  AlignLeft, LayoutGrid, Video, HelpCircle, FileText, Layers, Grid3X3,
} from 'lucide-react'
import ImageUploadInput from '@/components/admin/ImageUploadInput'

// ── Types ──────────────────────────────────────────────────────────────────
type FeaturesLayout = 'grid' | 'list' | 'cards'
type FeaturesPreset = 'grid_center'|'grid_hover'|'row_left'|'row_flat'|'big_icon'|'minimal'

interface FeatureItem   { icon: string; icon_url?: string; icon_size?: number; en: string; ar: string; subtitle_en?: string; subtitle_ar?: string }
interface CardItem      { image_url?: string; title_en?: string; title_ar?: string; subtitle_en?: string; subtitle_ar?: string }
interface FaqItem       { q_en: string; q_ar: string; a_en: string; a_ar: string }
interface MarqueeItem   { icon_url?: string; text_en?: string; text_ar?: string }

interface LandingBlock {
  id: string
  layout: 'image_left'|'image_right'|'text_only'|'image_only'|'features_grid'|'video'|'faq'|'cards_grid'|'marquee'
  image_url?: string; video_url?: string
  title_en?: string; title_ar?: string
  body_en?: string;  body_ar?: string
  features?: FeatureItem[]
  features_layout?: FeaturesLayout
  features_preset?: FeaturesPreset
  faqs?: FaqItem[]
  cards?: CardItem[]
  marquee_items?: MarqueeItem[]
  marquee_bg?: string
  marquee_text_color?: string
  marquee_speed?: number
}

interface Tool { id: string; name: string; details_slug?: string; image_url?: string; landing_blocks?: LandingBlock[] }

// ── Constants ──────────────────────────────────────────────────────────────
const GOLD = '#d99401'

const BLOCK_TYPES: { value: LandingBlock['layout']; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { value:'image_left',    label:'Image Left',    color:'#3B82F6', desc:'Image on left, text on right',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="16" height="26" rx="2" fill="#3B82F620" stroke="#3B82F6" strokeWidth="1.5"/><rect x="21" y="5" width="18" height="3" rx="1.5" fill="#374151"/><rect x="21" y="11" width="14" height="2" rx="1" fill="#9CA3AF"/><rect x="21" y="15" width="16" height="2" rx="1" fill="#9CA3AF"/><rect x="21" y="19" width="12" height="2" rx="1" fill="#9CA3AF"/></svg> },
  { value:'image_right',   label:'Image Right',   color:'#8B5CF6', desc:'Text on left, image on right',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="23" y="1" width="16" height="26" rx="2" fill="#8B5CF620" stroke="#8B5CF6" strokeWidth="1.5"/><rect x="1" y="5" width="18" height="3" rx="1.5" fill="#374151"/><rect x="1" y="11" width="14" height="2" rx="1" fill="#9CA3AF"/><rect x="1" y="15" width="16" height="2" rx="1" fill="#9CA3AF"/><rect x="1" y="19" width="12" height="2" rx="1" fill="#9CA3AF"/></svg> },
  { value:'text_only',     label:'Text Only',     color:'#10B981', desc:'Full-width text content',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="4" y="5" width="32" height="3" rx="1.5" fill="#374151"/><rect x="4" y="11" width="32" height="2" rx="1" fill="#9CA3AF"/><rect x="4" y="15" width="28" height="2" rx="1" fill="#9CA3AF"/><rect x="4" y="19" width="30" height="2" rx="1" fill="#9CA3AF"/></svg> },
  { value:'image_only',    label:'Image Banner',  color:'#F59E0B', desc:'Full-width image or banner',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="38" height="26" rx="2" fill="#F59E0B20" stroke="#F59E0B" strokeWidth="1.5"/><circle cx="20" cy="14" r="5" fill="#F59E0B40"/><path d="M16 14l2.5 2.5L24 11" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg> },
  { value:'features_grid', label:'Features Grid', color:'#EF4444', desc:'Icon grid of features',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="11" height="12" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="15" y="1" width="11" height="12" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="29" y="1" width="10" height="12" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="1" y="16" width="11" height="11" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="15" y="16" width="11" height="11" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/><rect x="29" y="16" width="10" height="11" rx="2" fill="#EF444420" stroke="#EF4444" strokeWidth="1"/></svg> },
  { value:'cards_grid',    label:'Cards Grid',    color:'#F97316', desc:'Image + title + subtitle cards',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="12" height="26" rx="2" fill="#F9731620" stroke="#F97316" strokeWidth="1"/><rect x="15" y="1" width="12" height="26" rx="2" fill="#F9731620" stroke="#F97316" strokeWidth="1"/><rect x="29" y="1" width="10" height="26" rx="2" fill="#F9731620" stroke="#F97316" strokeWidth="1"/><rect x="3" y="3" width="8" height="8" rx="1" fill="#F9731640"/><rect x="17" y="3" width="8" height="8" rx="1" fill="#F9731640"/><rect x="31" y="3" width="6" height="8" rx="1" fill="#F9731640"/></svg> },
  { value:'video',         label:'Video Embed',   color:'#EC4899', desc:'YouTube / video embed',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="38" height="26" rx="2" fill="#EC489920" stroke="#EC4899" strokeWidth="1.5"/><circle cx="20" cy="14" r="7" fill="#EC489930"/><polygon points="17,10 27,14 17,18" fill="#EC4899"/></svg> },
  { value:'faq',           label:'FAQ',           color:'#06B6D4', desc:'Accordion FAQ section',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="2" width="38" height="6" rx="2" fill="#06B6D420" stroke="#06B6D4" strokeWidth="1"/><rect x="1" y="11" width="38" height="6" rx="2" fill="#06B6D410" stroke="#06B6D430" strokeWidth="1"/><rect x="1" y="20" width="38" height="6" rx="2" fill="#06B6D410" stroke="#06B6D430" strokeWidth="1"/></svg> },
  { value:'marquee',       label:'Marquee Strip', color:'#D92D36', desc:'Infinite scrolling icon ticker',
    icon: <svg viewBox="0 0 40 28" className="w-10 h-7"><rect x="1" y="1" width="38" height="26" rx="2" fill="#D92D3620" stroke="#D92D36" strokeWidth="1.5"/><circle cx="8" cy="14" r="4" fill="#D92D3640"/><circle cx="20" cy="14" r="4" fill="#D92D3640"/><circle cx="32" cy="14" r="4" fill="#D92D3640"/><rect x="5" y="10" width="6" height="1.5" rx=".75" fill="#D92D36"/><rect x="17" y="10" width="6" height="1.5" rx=".75" fill="#D92D36"/><rect x="29" y="10" width="6" height="1.5" rx=".75" fill="#D92D36"/></svg> },
]

// ── Helpers ────────────────────────────────────────────────────────────────
const inp = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"

function FL({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1">{children}</div>
}

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onClose,3000); return()=>clearTimeout(t) },[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

// ── Sortable Block Row in sidebar ──────────────────────────────────────────
function SortableBlockRow({ block, isSelected, onClick, onRemove }: {
  block: LandingBlock; isSelected: boolean; onClick: ()=>void; onRemove: ()=>void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const bType = BLOCK_TYPES.find(b => b.value === block.layout)

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10'
          : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onClick={onClick}>
      <button {...attributes} {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 flex-shrink-0 touch-none"
        onClick={e => e.stopPropagation()}>
        <GripVertical size={16}/>
      </button>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: (bType?.color||GOLD)+'18' }}>
        <div className="scale-75">{bType?.icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-bold truncate ${isSelected?'text-amber-700 dark:text-amber-400':'text-gray-700 dark:text-gray-300'}`}>
          {bType?.label || block.layout}
        </div>
        {(block.title_en||block.title_ar) && (
          <div className="text-[10px] text-gray-400 truncate mt-0.5">{block.title_en||block.title_ar}</div>
        )}
      </div>
      <button onClick={e=>{ e.stopPropagation(); onRemove() }}
        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0">
        <Trash2 size={11}/>
      </button>
    </div>
  )
}

// ── Block Settings Panel ───────────────────────────────────────────────────
function BlockSettings({ block, onChange }: { block: LandingBlock; onChange: (p: Partial<LandingBlock>)=>void }) {
  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Image fields */}
      {(block.layout==='image_left'||block.layout==='image_right'||block.layout==='image_only') && (
        <div>
          <FL><ImageIcon size={9}/>Image / GIF</FL>
          <ImageUploadInput value={block.image_url||''} onChange={url=>onChange({image_url:url})} folder="landing-blocks"/>
        </div>
      )}

      {/* Video */}
      {block.layout==='video' && (
        <div>
          <FL><Video size={9}/>YouTube URL</FL>
          <input value={block.video_url||''} onChange={e=>onChange({video_url:e.target.value})}
            placeholder="https://youtube.com/watch?v=..." className={inp}/>
        </div>
      )}

      {/* Title */}
      {!['image_only','features_grid','marquee'].includes(block.layout) && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FL><Globe size={9}/>Title EN</FL>
            <input value={block.title_en||''} onChange={e=>onChange({title_en:e.target.value})} placeholder="Section title" className={inp}/>
          </div>
          <div>
            <FL><Globe size={9}/>عنوان AR</FL>
            <input value={block.title_ar||''} onChange={e=>onChange({title_ar:e.target.value})} placeholder="عنوان القسم" className={inp} dir="rtl"/>
          </div>
        </div>
      )}

      {/* Body */}
      {!['image_only','features_grid','faq','video','cards_grid','marquee'].includes(block.layout) && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FL><FileText size={9}/>Body EN</FL>
            <textarea value={block.body_en||''} onChange={e=>onChange({body_en:e.target.value})}
              rows={3} placeholder="Description text..." className={`${inp} resize-none`}/>
          </div>
          <div>
            <FL><FileText size={9}/>نص AR</FL>
            <textarea value={block.body_ar||''} onChange={e=>onChange({body_ar:e.target.value})}
              rows={3} placeholder="النص بالعربي..." className={`${inp} resize-none`} dir="rtl"/>
          </div>
        </div>
      )}

      {/* Features Grid */}
      {block.layout==='features_grid' && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <FL>Title EN</FL>
              <input value={block.title_en||''} onChange={e=>onChange({title_en:e.target.value})} placeholder="Why choose us" className={inp}/>
            </div>
            <div>
              <FL>عنوان AR</FL>
              <input value={block.title_ar||''} onChange={e=>onChange({title_ar:e.target.value})} placeholder="لماذا تختارنا" className={inp} dir="rtl"/>
            </div>
          </div>

          {/* Preset style picker */}
          <div className="mb-3">
            <FL><LayoutGrid size={9}/>Card Style</FL>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key:'grid_center', label:'Grid Center',
                  svg:<svg viewBox="0 0 60 40"><rect x="1" y="8" width="17" height="24" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/><rect x="21" y="8" width="17" height="24" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/><rect x="41" y="8" width="18" height="24" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/><circle cx="9.5" cy="16" r="4" fill="#d99401"/><circle cx="29.5" cy="16" r="4" fill="#d99401"/><circle cx="50" cy="16" r="4" fill="#d99401"/><rect x="4" y="23" width="11" height="2" rx="1" fill="#374151"/><rect x="24" y="23" width="11" height="2" rx="1" fill="#374151"/><rect x="44" y="23" width="11" height="2" rx="1" fill="#374151"/><rect x="6" y="27" width="7" height="1.5" rx="0.75" fill="#9ca3af"/><rect x="26" y="27" width="7" height="1.5" rx="0.75" fill="#9ca3af"/><rect x="46" y="27" width="7" height="1.5" rx="0.75" fill="#9ca3af"/></svg> },
                { key:'grid_hover', label:'Hover Color',
                  svg:<svg viewBox="0 0 60 40"><rect x="1" y="8" width="17" height="24" rx="3" fill="#d99401"/><rect x="21" y="8" width="17" height="24" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/><rect x="41" y="8" width="18" height="24" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/><circle cx="9.5" cy="16" r="4" fill="white" opacity="0.5"/><rect x="4" y="23" width="11" height="2" rx="1" fill="white"/><rect x="6" y="27" width="7" height="1.5" rx="0.75" fill="white" opacity="0.7"/><circle cx="29.5" cy="16" r="4" fill="#d99401"/><rect x="24" y="23" width="11" height="2" rx="1" fill="#374151"/><rect x="46" y="23" width="11" height="2" rx="1" fill="#374151"/></svg> },
                { key:'row_left', label:'Row + Icon',
                  svg:<svg viewBox="0 0 60 40"><rect x="1" y="3" width="58" height="10" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/><rect x="1" y="15" width="58" height="10" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/><rect x="1" y="27" width="58" height="10" rx="3" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/><circle cx="9" cy="8" r="4" fill="#d99401"/><rect x="16" y="6" width="24" height="2" rx="1" fill="#374151"/><rect x="16" y="10" width="16" height="1.5" rx="0.75" fill="#9ca3af"/><circle cx="9" cy="20" r="4" fill="#d99401"/><rect x="16" y="18" width="22" height="2" rx="1" fill="#374151"/><rect x="16" y="22" width="14" height="1.5" rx="0.75" fill="#9ca3af"/><circle cx="9" cy="32" r="4" fill="#d99401"/><rect x="16" y="30" width="20" height="2" rx="1" fill="#374151"/><rect x="16" y="34" width="18" height="1.5" rx="0.75" fill="#9ca3af"/></svg> },
                { key:'row_flat', label:'Row Flat',
                  svg:<svg viewBox="0 0 60 40"><rect x="1" y="3" width="58" height="10" rx="3" fill="white" stroke="#e5e7eb" strokeWidth="1"/><rect x="1" y="15" width="58" height="10" rx="3" fill="white" stroke="#e5e7eb" strokeWidth="1"/><rect x="1" y="27" width="58" height="10" rx="3" fill="white" stroke="#e5e7eb" strokeWidth="1"/><rect x="3" y="5" width="8" height="6" rx="1.5" fill="#f3f4f6"/><rect x="3" y="17" width="8" height="6" rx="1.5" fill="#f3f4f6"/><rect x="3" y="29" width="8" height="6" rx="1.5" fill="#f3f4f6"/><rect x="14" y="6.5" width="22" height="2" rx="1" fill="#374151"/><rect x="14" y="18.5" width="20" height="2" rx="1" fill="#374151"/><rect x="14" y="30.5" width="24" height="2" rx="1" fill="#374151"/></svg> },
                { key:'big_icon', label:'Big Icon',
                  svg:<svg viewBox="0 0 60 40"><rect x="1" y="5" width="17" height="30" rx="5" fill="white" stroke="#e5e7eb" strokeWidth="1"/><rect x="21" y="5" width="17" height="30" rx="5" fill="white" stroke="#e5e7eb" strokeWidth="1"/><rect x="41" y="5" width="18" height="30" rx="5" fill="white" stroke="#e5e7eb" strokeWidth="1"/><circle cx="9.5" cy="16" r="6" fill="#fef3c7" stroke="#d99401" strokeWidth="1"/><circle cx="29.5" cy="16" r="6" fill="#fef3c7" stroke="#d99401" strokeWidth="1"/><circle cx="50" cy="16" r="6" fill="#fef3c7" stroke="#d99401" strokeWidth="1"/><rect x="4" y="25" width="11" height="2" rx="1" fill="#374151"/><rect x="24" y="25" width="11" height="2" rx="1" fill="#374151"/><rect x="44" y="25" width="11" height="2" rx="1" fill="#374151"/></svg> },
                { key:'minimal', label:'Minimal',
                  svg:<svg viewBox="0 0 60 40"><circle cx="9.5" cy="12" r="4" fill="#fef3c7" stroke="#d99401" strokeWidth="1"/><rect x="5" y="19" width="9" height="2" rx="1" fill="#374151"/><rect x="6" y="23" width="7" height="1.5" rx="0.75" fill="#9ca3af"/><circle cx="30" cy="12" r="4" fill="#fef3c7" stroke="#d99401" strokeWidth="1"/><rect x="26" y="19" width="9" height="2" rx="1" fill="#374151"/><rect x="27" y="23" width="7" height="1.5" rx="0.75" fill="#9ca3af"/><circle cx="50" cy="12" r="4" fill="#fef3c7" stroke="#d99401" strokeWidth="1"/><rect x="46" y="19" width="9" height="2" rx="1" fill="#374151"/><rect x="47" y="23" width="7" height="1.5" rx="0.75" fill="#9ca3af"/></svg> },
              ] as const).map(p=>{
                const active = (block.features_preset||'grid_center')===p.key
                return (
                  <button key={p.key} onClick={()=>onChange({features_preset:p.key})}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${active?'border-amber-400 bg-amber-50 dark:bg-amber-500/10':'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                    <div className="w-full">{p.svg}</div>
                    <span className={`text-[9px] font-bold ${active?'text-amber-600':'text-gray-400'}`}>{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <FL><LayoutGrid size={9}/>Feature Items</FL>
          <div className="space-y-3">
            {(block.features||[]).map((f,fi)=>(
              <div key={fi} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400">Item {fi+1}</span>
                  <button onClick={()=>{ const fs=(block.features||[]).filter((_,j)=>j!==fi); onChange({features:fs}) }}
                    className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <X size={10}/>
                  </button>
                </div>
                {/* Icon image + size */}
                <div>
                  <div className="text-[9px] text-gray-400 mb-1">Icon (image / GIF)</div>
                  <ImageUploadInput
                    value={f.icon_url||''}
                    onChange={url=>{ const fs=[...(block.features||[])]; fs[fi]={...f,icon_url:url}; onChange({features:fs}) }}
                    folder="landing-icons"
                  />
                </div>
                {/* Size control */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-400 whitespace-nowrap">Size: {f.icon_size||40}px</span>
                  <input type="range" min={20} max={120} step={4} value={f.icon_size||40}
                    onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,icon_size:+e.target.value}; onChange({features:fs}) }}
                    className="flex-1 accent-amber-500 h-1"/>
                  <button onClick={()=>{ const fs=[...(block.features||[])]; fs[fi]={...f,icon_size:40}; onChange({features:fs}) }}
                    className="text-[9px] text-gray-400 hover:text-amber-500">↺</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={f.en} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,en:e.target.value}; onChange({features:fs}) }}
                    placeholder="Title EN" className={inp}/>
                  <input value={f.ar} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,ar:e.target.value}; onChange({features:fs}) }}
                    placeholder="عنوان AR" className={inp} dir="rtl"/>
                  <input value={f.subtitle_en||''} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,subtitle_en:e.target.value}; onChange({features:fs}) }}
                    placeholder="Subtitle EN (optional)" className={inp}/>
                  <input value={f.subtitle_ar||''} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,subtitle_ar:e.target.value}; onChange({features:fs}) }}
                    placeholder="وصف AR (اختياري)" className={inp} dir="rtl"/>
                </div>
              </div>
            ))}
            <button onClick={()=>onChange({features:[...(block.features||[]),{icon:'',en:'',ar:'',subtitle_en:'',subtitle_ar:''}]})}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-amber-600 hover:border-amber-400 dark:hover:border-amber-500 transition-colors w-full justify-center">
              <Plus size={12}/>Add Feature
            </button>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      {block.layout==='cards_grid' && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <FL>Title EN</FL>
              <input value={block.title_en||''} onChange={e=>onChange({title_en:e.target.value})} placeholder="Our Plans" className={inp}/>
            </div>
            <div>
              <FL>عنوان AR</FL>
              <input value={block.title_ar||''} onChange={e=>onChange({title_ar:e.target.value})} placeholder="باقاتنا" className={inp} dir="rtl"/>
            </div>
          </div>
          <FL><Grid3X3 size={9}/>Cards</FL>
          <div className="space-y-3">
            {(block.cards||[]).map((c,ci)=>(
              <div key={ci} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400">Card {ci+1}</span>
                  <button onClick={()=>{ const cs=(block.cards||[]).filter((_,j)=>j!==ci); onChange({cards:cs}) }}
                    className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <X size={10}/>
                  </button>
                </div>
                <div>
                  <div className="text-[9px] text-gray-400 mb-1">Card image</div>
                  <ImageUploadInput
                    value={c.image_url||''}
                    onChange={url=>{ const cs=[...(block.cards||[])]; cs[ci]={...c,image_url:url}; onChange({cards:cs}) }}
                    folder="landing-cards"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={c.title_en||''} onChange={e=>{ const cs=[...(block.cards||[])]; cs[ci]={...c,title_en:e.target.value}; onChange({cards:cs}) }}
                    placeholder="Title EN" className={inp}/>
                  <input value={c.title_ar||''} onChange={e=>{ const cs=[...(block.cards||[])]; cs[ci]={...c,title_ar:e.target.value}; onChange({cards:cs}) }}
                    placeholder="عنوان AR" className={inp} dir="rtl"/>
                  <input value={c.subtitle_en||''} onChange={e=>{ const cs=[...(block.cards||[])]; cs[ci]={...c,subtitle_en:e.target.value}; onChange({cards:cs}) }}
                    placeholder="Subtitle EN" className={inp}/>
                  <input value={c.subtitle_ar||''} onChange={e=>{ const cs=[...(block.cards||[])]; cs[ci]={...c,subtitle_ar:e.target.value}; onChange({cards:cs}) }}
                    placeholder="عنوان فرعي AR" className={inp} dir="rtl"/>
                </div>
              </div>
            ))}
            <button onClick={()=>onChange({cards:[...(block.cards||[]),{image_url:'',title_en:'',title_ar:'',subtitle_en:'',subtitle_ar:''}]})}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-amber-600 hover:border-amber-400 transition-colors w-full justify-center">
              <Plus size={12}/>Add Card
            </button>
          </div>
        </div>
      )}

      {/* FAQ */}
      {block.layout==='faq' && (
        <div>
          <div className="mb-3">
            <FL>Section Title EN</FL>
            <input value={block.title_en||''} onChange={e=>onChange({title_en:e.target.value})} placeholder="Frequently Asked Questions" className={inp}/>
          </div>
          <div className="mb-3">
            <FL>Section Title AR</FL>
            <input value={block.title_ar||''} onChange={e=>onChange({title_ar:e.target.value})} placeholder="الأسئلة الشائعة" className={inp} dir="rtl"/>
          </div>
          <FL><HelpCircle size={9}/>FAQ Items</FL>
          <div className="space-y-3">
            {(block.faqs||[]).map((faq,fi)=>(
              <div key={fi} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                {/* Question header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-100 dark:border-amber-500/20">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{background:GOLD+'25',color:GOLD}}>Q{fi+1}</span>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex-1">Question</span>
                  <button onClick={()=>{ const fs=(block.faqs||[]).filter((_,j)=>j!==fi); onChange({faqs:fs}) }}
                    className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <X size={10}/>
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={faq.q_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_en:e.target.value}; onChange({faqs:fs}) }} placeholder="Question EN" className={inp}/>
                    <input value={faq.q_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_ar:e.target.value}; onChange({faqs:fs}) }} placeholder="السؤال AR" className={inp} dir="rtl"/>
                  </div>
                  {/* Answer */}
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 pt-1">Answer</div>
                  <div className="grid grid-cols-2 gap-2">
                    <textarea value={faq.a_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_en:e.target.value}; onChange({faqs:fs}) }} rows={2} placeholder="Answer EN" className={`${inp} resize-none`}/>
                    <textarea value={faq.a_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_ar:e.target.value}; onChange({faqs:fs}) }} rows={2} placeholder="الإجابة AR" className={`${inp} resize-none`} dir="rtl"/>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={()=>onChange({faqs:[...(block.faqs||[]),{q_en:'',q_ar:'',a_en:'',a_ar:''}]})}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-amber-600 hover:border-amber-400 transition-colors w-full justify-center">
              <Plus size={12}/>Add Question
            </button>
          </div>
        </div>
      )}

      {/* Marquee Strip */}
      {block.layout==='marquee' && (
        <div className="space-y-3">
          {/* Background color */}
          <div>
            <FL>Background Color</FL>
            <div className="flex gap-2 items-center">
              <input type="color" value={block.marquee_bg||'#d92d36'}
                onChange={e=>onChange({marquee_bg:e.target.value})}
                className="w-10 h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-700"/>
              <input value={block.marquee_bg||'#d92d36'}
                onChange={e=>onChange({marquee_bg:e.target.value})}
                placeholder="#d92d36" className={`${inp} flex-1 font-mono`}/>
            </div>
          </div>
          {/* Text color */}
          <div>
            <FL>Text Color</FL>
            <div className="flex gap-2 items-center">
              <input type="color" value={block.marquee_text_color||'#ffffff'}
                onChange={e=>onChange({marquee_text_color:e.target.value})}
                className="w-10 h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-700"/>
              <input value={block.marquee_text_color||'#ffffff'}
                onChange={e=>onChange({marquee_text_color:e.target.value})}
                placeholder="#ffffff" className={`${inp} flex-1 font-mono`}/>
            </div>
          </div>
          {/* Speed */}
          <div>
            <FL>Speed: {block.marquee_speed||15}s per cycle (lower = faster)</FL>
            <input type="range" min={5} max={40} step={1} value={block.marquee_speed||15}
              onChange={e=>onChange({marquee_speed:+e.target.value})}
              className="w-full accent-amber-500 h-1"/>
          </div>
          {/* Items */}
          <FL><Layers size={9}/>Marquee Items</FL>
          <div className="space-y-2">
            {(block.marquee_items||[]).map((m,mi)=>(
              <div key={mi} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400">Item {mi+1}</span>
                  <button onClick={()=>{ const ms=(block.marquee_items||[]).filter((_,j)=>j!==mi); onChange({marquee_items:ms}) }}
                    className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                    <X size={10}/>
                  </button>
                </div>
                <div>
                  <div className="text-[9px] text-gray-400 mb-1">Icon / Image / GIF</div>
                  <ImageUploadInput
                    value={m.icon_url||''}
                    onChange={url=>{ const ms=[...(block.marquee_items||[])]; ms[mi]={...m,icon_url:url}; onChange({marquee_items:ms}) }}
                    folder="landing-marquee"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={m.text_en||''} onChange={e=>{ const ms=[...(block.marquee_items||[])]; ms[mi]={...m,text_en:e.target.value}; onChange({marquee_items:ms}) }}
                    placeholder="Label EN" className={inp}/>
                  <input value={m.text_ar||''} onChange={e=>{ const ms=[...(block.marquee_items||[])]; ms[mi]={...m,text_ar:e.target.value}; onChange({marquee_items:ms}) }}
                    placeholder="نص AR" className={inp} dir="rtl"/>
                </div>
              </div>
            ))}
            <button onClick={()=>onChange({marquee_items:[...(block.marquee_items||[]),{icon_url:'',text_en:'',text_ar:''}]})}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-400 transition-colors w-full justify-center">
              <Plus size={12}/>Add Item
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Section Picker ─────────────────────────────────────────────────────
function BlockTypePicker({ onAdd, onClose }: { onAdd:(t:LandingBlock['layout'])=>void; onClose:()=>void }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Add Section</span>
        <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <X size={13}/>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {BLOCK_TYPES.map(bt=>(
          <button key={bt.value} onClick={()=>{ onAdd(bt.value); onClose() }}
            className="flex items-center gap-3 p-3 rounded-xl border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left transition-all group">
            <div className="w-12 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: bt.color+'15', border:`1.5px solid ${bt.color}30` }}>
              {bt.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">{bt.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{bt.desc}</div>
            </div>
            <Plus size={13} className="ml-auto text-gray-300 group-hover:text-amber-500 flex-shrink-0 transition-colors"/>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main Editor ────────────────────────────────────────────────────────────
export default function LandingEditorPage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const [tool,          setTool]          = useState<Tool|null>(null)
  const [blocks,        setBlocks]        = useState<LandingBlock[]>([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [toast,         setToast]         = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [iframeLoaded,  setIframeLoaded]  = useState(false)
  const [previewMode,   setPreviewMode]   = useState<'desktop'|'mobile'>('desktop')
  const [panel,         setPanel]         = useState<'list'|'add'|string>('list')

  // Resizable sidebar
  const [sidebarW, setSidebarW] = useState(288)
  const resizingRef = useRef(false)
  const startXRef   = useRef(0)
  const startWRef   = useRef(0)

  const selectedId = panel !== 'list' && panel !== 'add' ? panel : null
  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null

  useEffect(()=>{
    supabase.from('shop_tools').select('id,name,details_slug,image_url,landing_blocks')
      .eq('id', id).single()
      .then(({ data }) => {
        if (data) { setTool(data as Tool); setBlocks(Array.isArray(data.landing_blocks)?data.landing_blocks:[]) }
        setLoading(false)
      })
  },[id])

  const sendPreview = useCallback((b: LandingBlock[]) => {
    iframeRef.current?.contentWindow?.postMessage({ type:'PK_LANDING_PREVIEW', blocks:b }, '*')
  },[])

  useEffect(()=>{
    if (!iframeLoaded) return
    const t = setTimeout(()=>sendPreview(blocks), 300)
    return ()=>clearTimeout(t)
  },[blocks, iframeLoaded, sendPreview])

  const onIframeLoad = () => { setIframeLoaded(true); setTimeout(()=>sendPreview(blocks),200) }

  const addBlock = (layout: LandingBlock['layout']) => {
    const b: LandingBlock = { id:uuid(), layout, image_url:'', title_en:'', title_ar:'', body_en:'', body_ar:'' }
    if (layout==='features_grid') { b.features = [{icon:'',en:'',ar:''}]; b.features_layout='grid' }
    if (layout==='faq')           b.faqs          = [{q_en:'',q_ar:'',a_en:'',a_ar:''}]
    if (layout==='cards_grid')    b.cards         = [{image_url:'',title_en:'',title_ar:'',subtitle_en:'',subtitle_ar:''}]
    if (layout==='marquee')     { b.marquee_items = [{icon_url:'',text_en:'',text_ar:''}]; b.marquee_bg='#d92d36'; b.marquee_text_color='#ffffff'; b.marquee_speed=15 }
    setBlocks(prev=>[...prev, b])
    setPanel(b.id)
  }

  const updateBlock = (blockId: string, patch: Partial<LandingBlock>) =>
    setBlocks(prev => prev.map(b => b.id===blockId ? {...b,...patch} : b))

  const removeBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id!==blockId))
    if (panel===blockId) setPanel('list')
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setBlocks(prev => {
      const from = prev.findIndex(b=>b.id===active.id)
      const to   = prev.findIndex(b=>b.id===over.id)
      return arrayMove(prev, from, to)
    })
  }

  // Resizer mouse handlers
  const onResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = true
    startXRef.current = e.clientX
    startWRef.current = sidebarW

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      const delta = ev.clientX - startXRef.current
      setSidebarW(Math.max(220, Math.min(500, startWRef.current + delta)))
    }
    const onUp = () => {
      resizingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const save = async () => {
    if (!tool) return
    setSaving(true)
    const { error } = await supabase.from('shop_tools').update({ landing_blocks: blocks }).eq('id', tool.id)
    setSaving(false)
    if (error) { setToast({ msg: error.message, type:'err' }); return }
    setToast({ msg:'Landing page saved ✓', type:'ok' })
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(blocks, null, 2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${tool?.name||'landing'}-blocks.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(parsed)) throw new Error()
        const imported: LandingBlock[] = parsed.map((b: any) => ({ ...b, id: uuid() }))
        setBlocks(imported)
        setToast({ msg:`Imported ${imported.length} blocks`, type:'ok' })
        setPanel('list')
      } catch { setToast({ msg:'Invalid JSON file', type:'err' }) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Preview uses isolated preview route — no nav/sidebar shown
  const iframeSrc = tool?.details_slug ? `/preview/${tool.details_slug}` : null

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:`${GOLD} transparent transparent transparent`}}/>
    </div>
  )
  if (!tool) return (
    <div className="flex h-screen items-center justify-center text-gray-400">Tool not found</div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">

      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 shadow-sm z-10">
        <button onClick={()=>router.push('/store')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={16}/>
        </button>

        <div className="flex items-center gap-2">
          {tool.image_url && <img src={tool.image_url} alt={tool.name} className="w-6 h-6 rounded-md object-contain bg-gray-100 dark:bg-gray-800 p-0.5"/>}
          <div>
            <div className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">{tool.name}</div>
            <div className="text-[9px] text-gray-400 leading-tight">Landing Page Editor</div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {iframeSrc && (
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {(['desktop','mobile'] as const).map(m=>(
                <button key={m} onClick={()=>setPreviewMode(m)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${previewMode===m?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-400'}`}>
                  {m==='desktop'?'🖥 Desktop':'📱 Mobile'}
                </button>
              ))}
            </div>
          )}

          <button onClick={()=>importRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Upload size={12}/>Import
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importJSON}/>

          <button onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={12}/>Export
          </button>

          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-bold disabled:opacity-60 transition-colors"
            style={{background:GOLD}}>
            {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<Save size={13}/>}
            {saving?'Saving…':'Save'}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR (resizable) ── */}
        <aside style={{ width: sidebarW, flexShrink: 0 }}
          className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">

          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            {(panel==='add' || selectedId) && (
              <button onClick={()=>setPanel('list')}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                <ChevronLeft size={15}/>
              </button>
            )}
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
              {panel==='add' ? 'Add Section'
                : selectedBlock ? (BLOCK_TYPES.find(b=>b.value===selectedBlock.layout)?.label || selectedBlock.layout)
                : `Sections (${blocks.length})`}
            </span>
            {panel==='list' && (
              <button onClick={()=>setPanel('add')}
                className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 transition-colors"
                style={{background:GOLD}}>
                <Plus size={14}/>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {panel==='list' && (
              <div className="p-3 space-y-1">
                {blocks.length===0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <Layers size={20} className="text-gray-300 dark:text-gray-600"/>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">No sections yet.<br/>Click <strong className="text-gray-600 dark:text-gray-300">+</strong> to add your first section.</p>
                  </div>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={blocks.map(b=>b.id)} strategy={verticalListSortingStrategy}>
                    {blocks.map(b=>(
                      <SortableBlockRow
                        key={b.id}
                        block={b}
                        isSelected={panel===b.id}
                        onClick={()=>setPanel(b.id)}
                        onRemove={()=>removeBlock(b.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {panel==='add' && (
              <BlockTypePicker onAdd={addBlock} onClose={()=>setPanel('list')}/>
            )}

            {selectedBlock && (
              <BlockSettings block={selectedBlock} onChange={p=>updateBlock(selectedBlock.id, p)}/>
            )}
          </div>
        </aside>

        {/* ── RESIZER HANDLE ── */}
        <div
          onMouseDown={onResizerMouseDown}
          className="w-1.5 flex-shrink-0 bg-gray-200 dark:bg-gray-800 hover:bg-amber-400 dark:hover:bg-amber-500 cursor-col-resize transition-colors group relative"
          title="Drag to resize">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 dark:bg-gray-700 group-hover:bg-amber-300 transition-colors"/>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-8 rounded-full bg-gray-300 dark:bg-gray-700 group-hover:bg-amber-400 flex flex-col items-center justify-center gap-0.5 transition-colors">
            <div className="w-0.5 h-1 rounded-full bg-white/60"/>
            <div className="w-0.5 h-1 rounded-full bg-white/60"/>
            <div className="w-0.5 h-1 rounded-full bg-white/60"/>
          </div>
        </div>

        {/* ── PREVIEW ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-950 p-4">
          {iframeSrc ? (
            <div className={`flex-1 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 mx-auto w-full transition-all ${previewMode==='mobile'?'max-w-sm':''}`}>
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                className="w-full h-full"
                onLoad={onIframeLoad}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <AlignLeft size={22} className="text-gray-300"/>
                </div>
                <p className="text-sm text-gray-400">No preview URL — add a slug to the tool first</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
