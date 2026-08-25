'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { v4 as uuid } from 'uuid'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Check, X,
  AlertCircle, Save, Eye, EyeOff, RefreshCw, Globe, Grip,
  Image, FileText, LayoutGrid, Video, HelpCircle, AlignLeft, Layers
} from 'lucide-react'
import ImageUploadInput from '@/components/admin/ImageUploadInput'

interface LandingBlock {
  id: string
  layout: 'image_left'|'image_right'|'text_only'|'image_only'|'features_grid'|'video'|'faq'
  image_url?: string; video_url?: string
  title_en?: string; title_ar?: string
  body_en?: string;  body_ar?: string
  features?: { icon: string; en: string; ar: string }[]
  faqs?: { q_en: string; q_ar: string; a_en: string; a_ar: string }[]
}

interface Tool {
  id: string; name: string; details_slug?: string; image_url?: string
  landing_blocks?: LandingBlock[]
}

const GOLD = '#d99401'

const LAYOUTS: { value: LandingBlock['layout']; label: string; icon: React.ReactNode; desc: string }[] = [
  { value:'image_left',    label:'Image Left',    icon:<><div className="w-5 h-4 bg-amber-400/80 rounded-sm mr-1"/><div className="flex-1 space-y-0.5"><div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-full"/><div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-3/4"/></div></>, desc:'Image on left, text on right' },
  { value:'image_right',   label:'Image Right',   icon:<><div className="flex-1 space-y-0.5"><div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-full"/><div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-3/4"/></div><div className="w-5 h-4 bg-amber-400/80 rounded-sm ml-1"/></>, desc:'Text on left, image on right' },
  { value:'text_only',     label:'Text Only',     icon:<><div className="w-full space-y-0.5"><div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-full"/><div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-5/6"/><div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-4/5"/></div></>, desc:'Full-width text content' },
  { value:'image_only',    label:'Image Banner',  icon:<><div className="w-full h-5 bg-amber-400/60 rounded-sm flex items-center justify-center"><Image size={10} className="text-amber-700"/></div></>, desc:'Full-width image / banner' },
  { value:'features_grid', label:'Features Grid', icon:<><div className="grid grid-cols-3 gap-0.5 w-full">{[...Array(6)].map((_,i)=><div key={i} className="h-2 bg-gray-200 dark:bg-gray-700 rounded"/>)}</div></>, desc:'Icon grid of features' },
  { value:'video',         label:'Video Embed',   icon:<><div className="w-full h-5 bg-gray-200 dark:bg-gray-700 rounded-sm flex items-center justify-center"><Video size={10} className="text-gray-400"/></div></>, desc:'YouTube video embed' },
  { value:'faq',           label:'FAQ',           icon:<><div className="w-full space-y-0.5">{[...Array(3)].map((_,i)=><div key={i} className="flex items-center gap-1"><div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded flex-1"/><div className="w-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-sm"/></div>)}</div></>, desc:'Accordion FAQ section' },
]

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

const inp = "w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-colors"

function BlockCard({ block, index, total, onChange, onRemove, onMove }: {
  block: LandingBlock; index: number; total: number
  onChange: (patch: Partial<LandingBlock>) => void
  onRemove: () => void
  onMove: (dir: -1|1) => void
}) {
  const [open, setOpen] = useState(true)
  const layout = LAYOUTS.find(l => l.value === block.layout)

  return (
    <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl overflow-hidden shadow-sm">
      {/* Block header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors select-none"
        onClick={() => setOpen(o => !o)}>
        <div className="flex flex-col gap-0.5 text-gray-300 dark:text-gray-600 cursor-grab flex-shrink-0">
          <div className="flex gap-0.5"><div className="w-1 h-1 rounded-full bg-current"/><div className="w-1 h-1 rounded-full bg-current"/></div>
          <div className="flex gap-0.5"><div className="w-1 h-1 rounded-full bg-current"/><div className="w-1 h-1 rounded-full bg-current"/></div>
          <div className="flex gap-0.5"><div className="w-1 h-1 rounded-full bg-current"/><div className="w-1 h-1 rounded-full bg-current"/></div>
        </div>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{background:GOLD}}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{layout?.label || block.layout}</div>
          {(block.title_en || block.title_ar) && (
            <div className="text-[10px] text-gray-400 truncate mt-0.5">{block.title_en || block.title_ar}</div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronUp size={12}/>
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronDown size={12}/>
          </button>
          <button onClick={onRemove}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <Trash2 size={11}/>
          </button>
          <div className={`w-5 h-5 rounded flex items-center justify-center text-gray-400 transition-transform ${open?'rotate-180':''}`}>
            <ChevronDown size={13}/>
          </div>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-50 dark:border-[#1a2233]">

          {/* Layout picker */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">Layout</label>
            <div className="grid grid-cols-2 gap-2">
              {LAYOUTS.map(l => (
                <button key={l.value} onClick={() => onChange({ layout: l.value })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    block.layout === l.value
                      ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-500/5'
                      : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30'
                  }`}>
                  <div className={`flex items-center w-16 h-6 flex-shrink-0 text-[8px] ${block.layout===l.value?'opacity-100':'opacity-60'}`}>
                    {l.icon}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[11px] font-bold ${block.layout===l.value?'text-amber-600 dark:text-amber-400':'text-gray-600 dark:text-gray-400'}`}>{l.label}</div>
                    <div className="text-[9px] text-gray-400 truncate">{l.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Image */}
          {(block.layout==='image_left'||block.layout==='image_right'||block.layout==='image_only') && (
            <ImageUploadInput
              label="Image / GIF"
              value={block.image_url||''}
              onChange={url => onChange({ image_url: url })}
              folder="landing-blocks"
            />
          )}

          {/* Video */}
          {block.layout==='video' && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">YouTube URL</label>
              <input value={block.video_url||''} onChange={e=>onChange({video_url:e.target.value})}
                placeholder="https://youtube.com/watch?v=..." className={inp}/>
            </div>
          )}

          {/* Title + Body (most layouts) */}
          {!['image_only','features_grid','faq'].includes(block.layout) && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1 block">
                    <Globe size={9}/> Title EN
                  </label>
                  <input value={block.title_en||''} onChange={e=>onChange({title_en:e.target.value})} placeholder="Section title" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1 block">
                    <Globe size={9}/> عنوان AR
                  </label>
                  <input value={block.title_ar||''} onChange={e=>onChange({title_ar:e.target.value})} placeholder="عنوان القسم" className={inp} dir="rtl"/>
                </div>
              </div>
              {block.layout !== 'video' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Body EN</label>
                    <textarea value={block.body_en||''} onChange={e=>onChange({body_en:e.target.value})}
                      rows={3} placeholder="Description text..." className={`${inp} resize-none`}/>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">نص AR</label>
                    <textarea value={block.body_ar||''} onChange={e=>onChange({body_ar:e.target.value})}
                      rows={3} placeholder="النص بالعربي..." className={`${inp} resize-none`} dir="rtl"/>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Features grid */}
          {block.layout==='features_grid' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Title EN</label>
                  <input value={block.title_en||''} onChange={e=>onChange({title_en:e.target.value})} placeholder="Why choose us" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">عنوان AR</label>
                  <input value={block.title_ar||''} onChange={e=>onChange({title_ar:e.target.value})} placeholder="لماذا تختارنا" className={inp} dir="rtl"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">Feature Items</label>
                <div className="space-y-2">
                  {(block.features||[]).map((f,fi)=>(
                    <div key={fi} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                      <input value={f.icon} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,icon:e.target.value}; onChange({features:fs}) }}
                        placeholder="⚡" className={`${inp} w-12 text-center text-base`}/>
                      <input value={f.en} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,en:e.target.value}; onChange({features:fs}) }}
                        placeholder="Feature EN" className={`${inp} flex-1`}/>
                      <input value={f.ar} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,ar:e.target.value}; onChange({features:fs}) }}
                        placeholder="ميزة AR" className={`${inp} flex-1`} dir="rtl"/>
                      <button onClick={()=>{ const fs=(block.features||[]).filter((_,j)=>j!==fi); onChange({features:fs}) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex-shrink-0 transition-colors">
                        <X size={12}/>
                      </button>
                    </div>
                  ))}
                  <button onClick={()=>onChange({features:[...(block.features||[]),{icon:'⭐',en:'',ar:''}]})}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-amber-600 hover:border-amber-400 transition-colors w-full justify-center">
                    <Plus size={12}/>Add Feature
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FAQ */}
          {block.layout==='faq' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Section Title (EN)</label>
                <input value={block.title_en||''} onChange={e=>onChange({title_en:e.target.value})} placeholder="Frequently Asked Questions" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">FAQ Items</label>
                <div className="space-y-2">
                  {(block.faqs||[]).map((faq,fi)=>(
                    <div key={fi} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Q{fi+1}</span>
                        <button onClick={()=>{ const fs=(block.faqs||[]).filter((_,j)=>j!==fi); onChange({faqs:fs}) }}
                          className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                          <X size={10}/>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={faq.q_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_en:e.target.value}; onChange({faqs:fs}) }} placeholder="Question EN" className={inp}/>
                        <input value={faq.q_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_ar:e.target.value}; onChange({faqs:fs}) }} placeholder="السؤال AR" className={inp} dir="rtl"/>
                        <textarea value={faq.a_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_en:e.target.value}; onChange({faqs:fs}) }} rows={2} placeholder="Answer EN" className={`${inp} resize-none`}/>
                        <textarea value={faq.a_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_ar:e.target.value}; onChange({faqs:fs}) }} rows={2} placeholder="الإجابة AR" className={`${inp} resize-none`} dir="rtl"/>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>onChange({faqs:[...(block.faqs||[]),{q_en:'',q_ar:'',a_en:'',a_ar:''}]})}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-amber-600 hover:border-amber-400 transition-colors w-full justify-center">
                    <Plus size={12}/>Add Question
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LandingEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [tool,         setTool]         = useState<Tool | null>(null)
  const [blocks,       setBlocks]       = useState<LandingBlock[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [previewMode,  setPreviewMode]  = useState<'desktop'|'mobile'>('desktop')

  useEffect(() => {
    supabase.from('shop_tools').select('id, name, details_slug, image_url, landing_blocks')
      .eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setTool(data as Tool)
          setBlocks(Array.isArray(data.landing_blocks) ? data.landing_blocks : [])
        }
        setLoading(false)
      })
  }, [id])

  // Send blocks to iframe for live preview
  const sendPreview = useCallback((b: LandingBlock[]) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'PK_LANDING_PREVIEW', blocks: b }, '*')
  }, [])

  // Debounce preview updates
  useEffect(() => {
    if (!iframeLoaded) return
    const t = setTimeout(() => sendPreview(blocks), 300)
    return () => clearTimeout(t)
  }, [blocks, iframeLoaded, sendPreview])

  const onIframeLoad = () => {
    setIframeLoaded(true)
    setTimeout(() => sendPreview(blocks), 200)
  }

  const addBlock = () => {
    const b: LandingBlock = { id: uuid(), layout:'image_left', image_url:'', title_en:'', title_ar:'', body_en:'', body_ar:'' }
    setBlocks(prev => [...prev, b])
  }

  const updateBlock = (blockId: string, patch: Partial<LandingBlock>) =>
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...patch } : b))

  const removeBlock = (blockId: string) =>
    setBlocks(prev => prev.filter(b => b.id !== blockId))

  const moveBlock = (blockId: string, dir: -1|1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  const save = async () => {
    if (!tool) return
    setSaving(true)
    const { error } = await supabase.from('shop_tools').update({ landing_blocks: blocks }).eq('id', tool.id)
    setSaving(false)
    if (error) { setToast({ msg: error.message, type:'err' }); return }
    setToast({ msg:'✓ Landing page saved', type:'ok' })
  }

  const iframeSrc = tool?.details_slug ? `/u/tool/${tool.details_slug}` : null

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0D1117]">
      <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:`${GOLD} transparent transparent transparent`}}/>
    </div>
  )

  if (!tool) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0D1117] text-gray-400">
      Tool not found
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0D1117] overflow-hidden">

      {/* Top bar */}
      <header className="flex items-center gap-4 px-5 py-3 bg-white dark:bg-[#111827] border-b border-gray-100 dark:border-[#1a2233] flex-shrink-0 shadow-sm">
        <button onClick={() => router.push('/store')}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <ArrowLeft size={16}/>
        </button>

        <div className="flex items-center gap-2.5">
          {tool.image_url && <img src={tool.image_url} alt={tool.name} className="w-7 h-7 rounded-lg object-contain bg-gray-100 dark:bg-gray-800 p-0.5"/>}
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{tool.name}</div>
            <div className="text-[10px] text-gray-400">Landing Page Editor</div>
          </div>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {/* Preview mode toggle */}
          {iframeSrc && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mr-2">
              {(['desktop','mobile'] as const).map(m => (
                <button key={m} onClick={() => setPreviewMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${previewMode===m?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500'}`}>
                  {m === 'desktop' ? '🖥️ Desktop' : '📱 Mobile'}
                </button>
              ))}
            </div>
          )}

          {/* Blocks count */}
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl font-semibold">
            {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </span>

          {/* Open in new tab */}
          {iframeSrc && (
            <a href={iframeSrc} target="_blank" rel="noopener"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Eye size={13}/>Preview
            </a>
          )}

          {/* Save */}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 hover:opacity-90 transition-opacity shadow-sm"
            style={{background:GOLD}}>
            {saving
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving…</>
              : <><Save size={14}/>Save</>}
          </button>
        </div>
      </header>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Block Editor ── */}
        <div className="w-[420px] flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-[#1a2233] bg-white dark:bg-[#0f1623] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1a2233]">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-gray-400"/>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Blocks</span>
            </div>
            <button onClick={addBlock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
              style={{background:GOLD}}>
              <Plus size={12}/>Add Block
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Layers size={24} className="text-gray-300 dark:text-gray-600"/>
                </div>
                <p className="text-sm font-semibold text-gray-400 mb-1">No blocks yet</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mb-4">Add your first content block</p>
                <button onClick={addBlock}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white"
                  style={{background:GOLD}}>
                  <Plus size={13}/>Add First Block
                </button>
              </div>
            )}
            {blocks.map((block, i) => (
              <BlockCard
                key={block.id}
                block={block}
                index={i}
                total={blocks.length}
                onChange={patch => updateBlock(block.id, patch)}
                onRemove={() => removeBlock(block.id)}
                onMove={dir => moveBlock(block.id, dir)}
              />
            ))}
            {blocks.length > 0 && (
              <button onClick={addBlock}
                className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-400 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center justify-center gap-2">
                <Plus size={13}/>Add Block
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Preview iframe ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-[#0D1117]">
          {iframeSrc ? (
            <>
              <div className="flex items-center justify-center py-2 border-b border-gray-200 dark:border-[#1a2233] bg-white dark:bg-[#111827] flex-shrink-0">
                <div className={`relative transition-all duration-300 ${previewMode === 'mobile' ? 'w-[390px]' : 'w-full'}`}>
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto w-fit">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"/>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"/>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"/>
                    <span className="text-[10px] text-gray-400 font-mono ml-2">/u/tool/{tool.details_slug}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex justify-center overflow-hidden p-4">
                <div className={`relative transition-all duration-300 h-full overflow-hidden rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1a2233] bg-white ${
                  previewMode === 'mobile' ? 'w-[390px]' : 'w-full'
                }`}>
                  <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    onLoad={onIframeLoad}
                    className="w-full h-full border-0"
                    title="Landing page preview"
                  />
                  {!iframeLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#111827]">
                      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:`${GOLD} transparent transparent transparent`}}/>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <EyeOff size={36} className="opacity-30"/>
              <p className="text-sm">No preview URL</p>
              <p className="text-xs text-gray-400">Set a <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">details_slug</code> on this tool to enable live preview</p>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}
