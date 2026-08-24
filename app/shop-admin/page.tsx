'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Pencil, Trash2, Copy, X, Check, AlertCircle, ToggleLeft, ToggleRight, Package, Tag, Layout, ChevronUp, ChevronDown, Star, Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import BundlesTab from '@/components/admin/BundlesTab'

interface Category { id:string; name:string; slug:string; color:string; icon:string; sort_order:number; is_active:boolean }
interface Tool {
  id:string; name:string; description:string; image_url?:string
  category_slug:string; category_id?:string; price_egp:number; price_usd?:number; retail_price_egp?:number
  duration_label:string; duration_days:number; delivery_label:string
  rating:number; review_count:number; video_url?:string
  features:string[]; is_active:boolean; is_out_of_stock:boolean; sort_order:number
  landing_blocks?: LandingBlock[]
}
interface LandingBlock {
  id: string
  layout: 'image_left'|'image_right'|'text_only'|'image_only'|'features_grid'|'video'|'faq'
  image_url?: string
  video_url?: string
  title_en?: string; title_ar?: string
  body_en?: string;  body_ar?: string
  features?: { icon: string; en: string; ar: string }[]
  faqs?: { q_en: string; q_ar: string; a_en: string; a_ar: string }[]
}
function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}
      style={{boxShadow:'0 16px 48px rgba(0,0,0,0.4)'}}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

// ── Design tokens (dark admin) ──
const S = {
  bg:       '#0b0d16',
  surface:  '#12141f',
  surface2: '#1a1d2e',
  surface3: '#22263a',
  border:   'rgba(255,255,255,0.07)',
  border2:  'rgba(255,255,255,0.12)',
  accent:   '#d99401',
  accentDim:'rgba(217,148,1,0.12)',
  accentMid:'rgba(217,148,1,0.3)',
  text1:    '#edf0fa',
  text2:    '#8892b0',
  text3:    '#454d6a',
  green:    '#22c55e',
  red:      '#ef4444',
  amber:    '#f59e0b',
  blue:     '#3b82f6',
  purple:   '#8b5cf6',
}

const inp = `w-full px-3 py-2 text-sm rounded-lg outline-none transition-all`
const inpStyle = { background: S.surface2, border: `1px solid ${S.border}`, color: S.text1, fontFamily:'inherit' }
const inpFocus = (e:any) => { e.target.style.borderColor = S.accentMid; e.target.style.boxShadow = `0 0 0 3px ${S.accentDim}` }
const inpBlur  = (e:any) => { e.target.style.borderColor = S.border;    e.target.style.boxShadow = 'none' }

const SHOP_CATS = ['shared','private','bundle']
const SHOP_CAT_COLORS: Record<string,{bg:string;color:string}> = {
  shared:  { bg:'rgba(59,130,246,0.12)',  color:'#3b82f6' },
  private: { bg:'rgba(139,92,246,0.12)',  color:'#8b5cf6' },
  bundle:  { bg:'rgba(245,158,11,0.12)',  color:'#f59e0b' },
}
const PRESET_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#06B6D4','#6B7280','#F97316','#14B8A6']
const LAYOUTS: { value: LandingBlock['layout']; label: string }[] = [
  { value:'image_left',     label:'🖼️ Image Left + Text Right' },
  { value:'image_right',    label:'📝 Text Left + Image Right' },
  { value:'text_only',      label:'📄 Text Only' },
  { value:'image_only',     label:'🖼️ Image Only (full width)' },
  { value:'features_grid',  label:'⚡ Features Grid (icons)' },
  { value:'video',          label:'🎬 Video Embed' },
  { value:'faq',            label:'❓ FAQ Accordion' },
]

// ── Field section wrapper ──
function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border:`1px solid ${S.border}`, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
      <div style={{ background:S.surface2, borderBottom:`1px solid ${S.border}`, borderLeft:`3px solid ${S.accent}`, padding:'9px 14px' }}>
        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:S.text2 }}>{title}</span>
      </div>
      <div style={{ padding:14, display:'flex', flexDirection:'column', gap:11 }}>{children}</div>
    </div>
  )
}

// ── Field label ──
function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:S.text3, marginBottom:5 }}>{children}</div>
}

// ── Hint ──
function Hint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:10, color:S.text3, marginTop:3 }}>{children}</div>
}

// ── Grid row ──
function Row({ cols=2, children }: { cols?:2|3; children: React.ReactNode }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns: cols===3 ? '1fr 1fr 1fr' : '1fr 1fr', gap:10 }}>
      {children}
    </div>
  )
}

export default function ShopAdminPage() {
  useEffect(() => { document.title = 'Products | Pro Keys Admin' }, [])
  const [tab,      setTab]      = useState<'tools'|'categories'|'bundles'|'deals'>('tools')
  const [tools,    setTools]    = useState<Tool[]>([])
  const [cats,     setCats]     = useState<Category[]>([])
  const [toolCat,  setToolCat]  = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'add-tool'|'edit-tool'|'add-cat'|'edit-cat'|'landing'|null>(null)
  const [editItem, setEdit]     = useState<any>(null)
  const [toast,    setToast]    = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving,   setSaving]   = useState(false)
  const [delItem,  setDel]      = useState<any>(null)
  const [delType,  setDelType]  = useState<'tool'|'cat'>('tool')
  const [modalTab, setModalTab] = useState(0)

  const [landingTool,   setLandingTool]   = useState<Tool|null>(null)
  const [landingBlocks, setLandingBlocks] = useState<LandingBlock[]>([])
  const [bundleItemIds, setBundleItemIds] = useState<string[]>([])

  const [featuredIds,   setFeaturedIds]   = useState<string[]>([])
  const [dealSections,  setDealSections]  = useState<{id:string;title_en:string;title_ar:string;subtitle_en:string;subtitle_ar:string;emoji:string;tool_ids:string[]}[]>([])
  const [dealSaving,    setDealSaving]    = useState(false)

  const emptyTool = { name:'',description:'',description_ar:'',image_url:'',category_slug:'shared',category_id:'',price_egp:'',price_usd:'',retail_price_egp:'',duration_label:'28 Days',duration_days:'28',delivery_label:'INSTANT',rating:'5.0',review_count:'0',video_url:'',features:'',sort_order:'0',is_out_of_stock:false,details_url:'',details_slug:'',sales_count:'0',warranty_label:'' }
  const [toolForm, setToolForm] = useState(emptyTool)

  const emptyCat = { name:'', name_ar:'', slug:'', color:'#3B82F6', icon:'🔧', image_url:'', image_url_ar:'', sort_order:'0' }
  const [catForm, setCatForm] = useState(emptyCat)

  const load = useCallback(async()=>{
    const [tRes,cRes] = await Promise.all([
      supabase.from('shop_tools').select('*').order('category_slug').order('sort_order'),
      supabase.from('tool_categories').select('*').order('sort_order'),
    ])
    if(tRes.data) setTools(tRes.data)
    if(cRes.data) setCats(cRes.data)
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])
  useEffect(()=>{
    if(tab!=='deals') return
    fetch('/api/admin/ui-settings').then(r=>r.json()).then(d=>{
      const ui = d.settings as Record<string,string>
      try { setFeaturedIds(JSON.parse(ui?.dashboard_featured_ids||'[]')) } catch {}
      try { setDealSections(JSON.parse(ui?.dashboard_sections||'[]').map((s:any)=>({subtitle_en:'',subtitle_ar:'',emoji:'🔖',...s,id:s.id||uuid()}))) } catch {}
    })
  },[tab])

  const openAddTool  = ()=>{ setToolForm(emptyTool); setEdit(null); setModalTab(0); setModal('add-tool') }
  const openEditTool = async (t:Tool)=>{
    setToolForm({name:t.name,description:t.description||'',description_ar:(t as any).description_ar||'',image_url:t.image_url||'',category_slug:t.category_slug,category_id:t.category_id||'',price_egp:String(t.price_egp),price_usd:String(t.price_usd||''),retail_price_egp:String(t.retail_price_egp||''),duration_label:t.duration_label,duration_days:String(t.duration_days),delivery_label:t.delivery_label,rating:String(t.rating),review_count:String(t.review_count),video_url:t.video_url||'',features:(t.features||[]).join('\n'),sort_order:String(t.sort_order),is_out_of_stock:t.is_out_of_stock,details_url:(t as any).details_url||'',details_slug:(t as any).details_slug||'',sales_count:String((t as any).sales_count||0),warranty_label:(t as any).warranty_label||''})
    if (t.category_slug === 'bundle') {
      const res = await fetch('/api/admin/bundles')
      const d   = await res.json()
      const bundle = (d.bundles || []).find((b:any) => b.id === t.id)
      setBundleItemIds((bundle?.items || []).map((i:any) => i.id))
    } else {
      setBundleItemIds([])
    }
    setEdit(t); setModalTab(0); setModal('edit-tool')
  }

  const duplicateTool = async (t: Tool) => {
    const { error } = await supabase.from('shop_tools').insert({
      name: t.name + ' (Copy)', description: t.description, image_url: t.image_url||null,
      category_slug: t.category_slug, category_id: t.category_id||null,
      price_egp: t.price_egp, price_usd: t.price_usd||null, retail_price_egp: t.retail_price_egp||0,
      duration_label: t.duration_label, duration_days: t.duration_days,
      delivery_label: t.delivery_label||'INSTANT',
      rating: t.rating, review_count: t.review_count,
      video_url: t.video_url||null, features: t.features||[],
      sort_order: t.sort_order, is_out_of_stock: t.is_out_of_stock,
    })
    if (error) setToast({ msg: 'Duplicate failed', type: 'err' })
    else { setToast({ msg: 'Tool duplicated', type: 'ok' }); load() }
  }

  const saveTool = async()=>{
    if(!toolForm.name||!toolForm.price_egp) return
    setSaving(true)
    const payload:any = {
      name:toolForm.name, description:toolForm.description||null, description_ar:toolForm.description_ar||null, image_url:toolForm.image_url||null,
      category_slug:toolForm.category_slug, category_id:toolForm.category_id||null,
      price_egp:parseFloat(toolForm.price_egp), price_usd:toolForm.price_usd?parseFloat(toolForm.price_usd):null,
      retail_price_egp:toolForm.retail_price_egp?parseFloat(toolForm.retail_price_egp):0,
      duration_label:toolForm.duration_label, duration_days:parseInt(toolForm.duration_days)||28,
      delivery_label:toolForm.delivery_label||'INSTANT',
      rating:parseFloat(toolForm.rating)||5.0, review_count:parseInt(toolForm.review_count)||0,
      video_url:toolForm.video_url||null,
      features:toolForm.features.split('\n').map(f=>f.trim()).filter(Boolean),
      sort_order:parseInt(toolForm.sort_order)||0, is_out_of_stock:toolForm.is_out_of_stock,
      details_url:toolForm.details_url||null,
      details_slug:toolForm.details_slug||null,
      sales_count:parseInt((toolForm as any).sales_count)||0,
      warranty_label:(toolForm as any).warranty_label||null,
    }
    const res = editItem
      ? await supabase.from('shop_tools').update(payload).eq('id',editItem.id)
      : await supabase.from('shop_tools').insert(payload)
    setSaving(false)
    if(res.error){setToast({msg:res.error.message,type:'err'});return}
    if (toolForm.category_slug === 'bundle' && editItem) {
      await fetch('/api/admin/bundles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editItem.id, tool_ids: bundleItemIds }),
      })
    }
    setToast({msg:editItem?'Tool updated':'Tool added',type:'ok'})
    setModal(null); load()
  }

  const toggleTool = async(t:Tool, field:'is_active'|'is_out_of_stock')=>{
    await supabase.from('shop_tools').update({[field]:!t[field]}).eq('id',t.id)
    setToast({msg:'Updated',type:'ok'}); load()
  }

  const openLanding = (t:Tool)=>{
    setLandingTool(t)
    setLandingBlocks(Array.isArray(t.landing_blocks) ? t.landing_blocks : [])
    setModal('landing')
  }

  const addBlock = ()=>{
    const newBlock: LandingBlock = { id: uuid(), layout:'image_left', image_url:'', title_en:'', title_ar:'', body_en:'', body_ar:'' }
    setLandingBlocks(b=>[...b, newBlock])
  }
  const updateBlock = (id:string, patch: Partial<LandingBlock>)=>{
    setLandingBlocks(b=>b.map(bl=>bl.id===id?{...bl,...patch}:bl))
  }
  const removeBlock = (id:string)=>{ setLandingBlocks(b=>b.filter(bl=>bl.id!==id)) }
  const moveBlock = (id:string, dir:-1|1)=>{
    setLandingBlocks(b=>{
      const idx = b.findIndex(bl=>bl.id===id)
      if (idx<0) return b
      const next = idx+dir
      if (next<0||next>=b.length) return b
      const arr = [...b]
      ;[arr[idx],arr[next]] = [arr[next],arr[idx]]
      return arr
    })
  }
  const saveLandingBlocks = async()=>{
    if (!landingTool) return
    setSaving(true)
    const res = await supabase.from('shop_tools').update({ landing_blocks: landingBlocks }).eq('id', landingTool.id)
    setSaving(false)
    if (res.error) { setToast({msg:res.error.message,type:'err'}); return }
    setToast({msg:'Landing page saved',type:'ok'})
    setModal(null); load()
  }

  const openAddCat  = ()=>{ setCatForm(emptyCat); setEdit(null); setModal('add-cat') }
  const openEditCat = (c:Category)=>{
    setCatForm({name:c.name,name_ar:(c as any).name_ar||'',slug:c.slug,color:c.color,icon:c.icon,image_url:(c as any).image_url||'',image_url_ar:(c as any).image_url_ar||'',sort_order:String(c.sort_order)})
    setEdit(c); setModal('edit-cat')
  }
  const saveCat = async()=>{
    if(!catForm.name) return
    setSaving(true)
    const slug = catForm.slug||catForm.name.toLowerCase().replace(/[^a-z0-9]/g,'_')
    const payload = {name:catForm.name,name_ar:catForm.name_ar||null,slug,color:catForm.color,icon:catForm.icon,image_url:catForm.image_url||null,image_url_ar:catForm.image_url_ar||null,sort_order:parseInt(catForm.sort_order)||0}
    const res = editItem
      ? await supabase.from('tool_categories').update(payload).eq('id',editItem.id)
      : await supabase.from('tool_categories').insert(payload)
    setSaving(false)
    if(res.error){setToast({msg:res.error.message,type:'err'});return}
    setToast({msg:editItem?'Category updated':'Category added',type:'ok'})
    setModal(null); load()
  }
  const toggleCat = async(c:Category)=>{
    await supabase.from('tool_categories').update({is_active:!c.is_active}).eq('id',c.id)
    setToast({msg:'Updated',type:'ok'}); load()
  }
  const del = async()=>{
    if(!delItem) return
    const table = delType==='tool'?'shop_tools':'tool_categories'
    const res = await supabase.from(table).delete().eq('id',delItem.id)
    if(res.error){setToast({msg:'Cannot delete — in use',type:'err'});setDel(null);return}
    setToast({msg:'Deleted',type:'ok'}); setDel(null); load()
  }

  const filtered = toolCat==='all'?tools:tools.filter(t=>t.category_slug===toolCat)
  const counts:any={}; SHOP_CATS.forEach(c=>{counts[c]=tools.filter(t=>t.category_slug===c).length})
  const catName = (id?:string) => cats.find(c=>c.id===id)?.name||'—'

  const saveDeals = async () => {
    setDealSaving(true)
    await fetch('/api/admin/ui-settings', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        dashboard_featured_ids: JSON.stringify(featuredIds),
        dashboard_sections:     JSON.stringify(dealSections.map(s=>({id:s.id,title_en:s.title_en,title_ar:s.title_ar,subtitle_en:s.subtitle_en,subtitle_ar:s.subtitle_ar,emoji:s.emoji,tool_ids:s.tool_ids}))),
      })
    })
    setDealSaving(false)
    setToast({ msg:'Deals saved ✓', type:'ok' })
  }

  const toggleFeatured = (id: string) =>
    setFeaturedIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])
  const addSection = () =>
    setDealSections(p=>[...p,{id:uuid(),title_en:'',title_ar:'',subtitle_en:'',subtitle_ar:'',emoji:'🔖',tool_ids:[]}])
  const removeSection = (id:string) => setDealSections(p=>p.filter(s=>s.id!==id))
  const updateSection = (id:string, key:string, val:any) =>
    setDealSections(p=>p.map(s=>s.id===id?{...s,[key]:val}:s))
  const toggleSectionTool = (secId:string, toolId:string) =>
    setDealSections(p=>p.map(s=>s.id===secId
      ? {...s, tool_ids: s.tool_ids.includes(toolId) ? s.tool_ids.filter(x=>x!==toolId) : [...s.tool_ids, toolId]}
      : s))

  // ── Shared input style helpers ──
  const inputProps = {
    className: inp,
    style: inpStyle,
    onFocus: inpFocus,
    onBlur: inpBlur,
  }

  // ── Modal tab labels ──
  const TOOL_TABS = ['Basics', 'Pricing', 'Content', 'Meta']

  return (
    <div className="flex h-screen overflow-hidden" style={{background:S.bg}}>
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Products" subtitle="Manage tools, categories & deals"/>

        {/* ── Tab bar + toolbar ── */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{background:S.surface, borderBottom:`1px solid ${S.border}`}}>
          {/* Main tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{background:S.surface2}}>
            {(['tools','categories','bundles','deals'] as const).map(t => (
              <button key={t} onClick={()=>setTab(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                style={tab===t ? {background:S.surface3, color:S.text1} : {color:S.text3}}>
                {t==='tools'?`Tools (${tools.length})`:t==='categories'?`Categories (${cats.length})`:t==='bundles'?'Bundles':'Deals'}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {tab==='tools' && (
              <>
                {/* Type filter pills */}
                <div className="flex items-center gap-1">
                  {[['all','All'],['shared','Shared'],['private','Private'],['bundle','Bundle']].map(([id,label])=>(
                    <button key={id} onClick={()=>setToolCat(id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={toolCat===id
                        ? {background:S.accentDim, color:S.accent, border:`1px solid ${S.accentMid}`}
                        : {background:'transparent', color:S.text3, border:`1px solid ${S.border}`}}>
                      {label}{id!=='all'&&` (${counts[id]||0})`}
                    </button>
                  ))}
                </div>
                <button onClick={openAddTool}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                  style={{background:S.accent, color:'#000'}}>
                  <Plus size={12}/>Add Tool
                </button>
              </>
            )}
            {tab==='categories' && (
              <button onClick={openAddCat}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                style={{background:S.accent, color:'#000'}}>
                <Plus size={12}/>Add Category
              </button>
            )}
            {tab==='deals' && (
              <button onClick={saveDeals} disabled={dealSaving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                style={{background:S.green, color:'#fff'}}>
                <Check size={12}/>{dealSaving ? 'Saving…' : 'Save Deals'}
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto p-5">

          {/* ── Tools table ── */}
          {tab==='tools' && (
            <div style={{background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, overflow:'hidden'}}>
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{borderColor:S.surface3, borderTopColor:S.accent}}/>
                </div>
              )}
              {!loading && (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:S.surface2}}>
                        {['Tool','Type','Category','Price','Rating','Landing','Status','Actions'].map(h=>(
                          <th key={h} className="text-left px-4 py-2.5" style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:S.text3, borderBottom:`1px solid ${S.border}`, whiteSpace:'nowrap'}}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length===0 && (
                        <tr><td colSpan={8} className="text-center py-16">
                          <Package size={28} style={{color:S.text3, margin:'0 auto 10px', opacity:0.3}}/>
                          <p style={{fontSize:13, color:S.text3}}>No tools yet</p>
                          <button onClick={openAddTool} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold mt-3"
                            style={{background:S.accent, color:'#000'}}>
                            <Plus size={12}/>Add First Tool
                          </button>
                        </td></tr>
                      )}
                      {filtered.map(t=>{
                        const hasLanding = Array.isArray(t.landing_blocks) && t.landing_blocks.length > 0
                        const sc = SHOP_CAT_COLORS[t.category_slug] || SHOP_CAT_COLORS.shared
                        return (
                          <tr key={t.id} style={{borderBottom:`1px solid ${S.border}`, opacity:!t.is_active?0.45:1}}
                            className="transition-colors" onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                            {/* Tool */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                                  style={{background:S.surface2, border:`1px solid ${S.border}`}}>
                                  {t.image_url
                                    ? <img src={t.image_url} alt={t.name} className="w-7 h-7 object-contain"/>
                                    : <span style={{fontSize:9, fontWeight:700, color:S.text3}}>{t.name.slice(0,2).toUpperCase()}</span>}
                                </div>
                                <div>
                                  <div style={{fontSize:12.5, fontWeight:600, color:S.text1}}>{t.name}</div>
                                  <div style={{fontSize:10, color:S.text3, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.description}</div>
                                </div>
                              </div>
                            </td>
                            {/* Type badge */}
                            <td className="px-4 py-3">
                              <span style={{fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:sc.bg, color:sc.color, textTransform:'capitalize'}}>
                                {t.category_slug}
                              </span>
                            </td>
                            {/* Category */}
                            <td className="px-4 py-3">
                              {t.category_id ? (
                                <div className="flex items-center gap-1.5">
                                  <span>{cats.find(c=>c.id===t.category_id)?.icon}</span>
                                  <span style={{fontSize:11.5, color:S.text2}}>{catName(t.category_id)}</span>
                                </div>
                              ) : <span style={{fontSize:11, color:S.text3}}>—</span>}
                            </td>
                            {/* Price */}
                            <td className="px-4 py-3" style={{fontFamily:"'JetBrains Mono', monospace"}}>
                              <div style={{fontSize:12, fontWeight:500, color:S.text1}}>{Number(t.price_egp).toLocaleString()} EGP</div>
                              {t.price_usd && <div style={{fontSize:10, color:S.text3}}>${t.price_usd}</div>}
                              <div style={{fontSize:10, color:S.text3}}>/{t.duration_label}</div>
                            </td>
                            {/* Rating */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Star size={11} fill={S.amber} stroke={S.amber}/>
                                <span style={{fontSize:11.5, fontWeight:600, color:S.text1}}>{t.rating}</span>
                                <span style={{fontSize:10, color:S.text3}}>({t.review_count})</span>
                              </div>
                            </td>
                            {/* Landing */}
                            <td className="px-4 py-3">
                              <button onClick={()=>openLanding(t)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                                style={hasLanding
                                  ? {background:'rgba(34,197,94,0.1)', color:S.green, border:'1px solid rgba(34,197,94,0.2)'}
                                  : {background:S.surface2, color:S.text3, border:`1px solid ${S.border}`}}>
                                <Layout size={10}/>{hasLanding?`${t.landing_blocks!.length} blocks`:'+ Add'}
                              </button>
                            </td>
                            {/* Status toggles */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <button onClick={()=>toggleTool(t,'is_active')} className="flex items-center gap-1.5">
                                  {t.is_active
                                    ? <ToggleRight size={18} style={{color:S.green}}/>
                                    : <ToggleLeft size={18} style={{color:S.text3}}/>}
                                  <span style={{fontSize:10, color:S.text3}}>{t.is_active?'Active':'Off'}</span>
                                </button>
                                <button onClick={()=>toggleTool(t,'is_out_of_stock')} className="flex items-center gap-1.5">
                                  {t.is_out_of_stock
                                    ? <ToggleRight size={18} style={{color:S.red}}/>
                                    : <ToggleLeft size={18} style={{color:S.text3}}/>}
                                  <span style={{fontSize:10, color:S.text3}}>{t.is_out_of_stock?'OOS':'In Stock'}</span>
                                </button>
                              </div>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {[
                                  { icon:<Pencil size={12}/>, label:'Edit',      onClick:()=>openEditTool(t),              hover:S.blue   },
                                  { icon:<Copy size={12}/>,   label:'Duplicate', onClick:()=>duplicateTool(t),             hover:S.green  },
                                  { icon:<Trash2 size={12}/>, label:'Delete',    onClick:()=>{setDel(t);setDelType('tool')},hover:S.red    },
                                ].map(({icon,label,onClick,hover})=>(
                                  <button key={label} onClick={onClick} title={label}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                    style={{color:S.text3, background:'transparent', border:'none', cursor:'pointer'}}
                                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=hover;(e.currentTarget as HTMLElement).style.background=hover+'20'}}
                                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=S.text3;(e.currentTarget as HTMLElement).style.background='transparent'}}>
                                    {icon}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Categories grid ── */}
          {tab==='categories' && (
            <div className="grid grid-cols-4 gap-4">
              {loading && <div className="col-span-4 flex justify-center py-16"><div className="w-6 h-6 border-2 rounded-full animate-spin" style={{borderColor:S.surface3, borderTopColor:S.accent}}/></div>}
              {cats.map(c=>{
                const toolCount = tools.filter(t=>t.category_id===c.id).length
                return (
                  <div key={c.id} style={{background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, overflow:'hidden', opacity:!c.is_active?0.5:1}}>
                    <div style={{height:3, background:c.color}}/>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden"
                          style={{background:c.color+'18'}}>
                          {(c as any).image_url ? <img src={(c as any).image_url} className="w-full h-full object-cover" alt=""/> : c.icon}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>openEditCat(c)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{color:S.text3, background:'transparent', border:'none', cursor:'pointer'}}
                            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=S.blue;(e.currentTarget as HTMLElement).style.background=S.blue+'18'}}
                            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=S.text3;(e.currentTarget as HTMLElement).style.background='transparent'}}>
                            <Pencil size={12}/>
                          </button>
                          <button onClick={()=>{setDel(c);setDelType('cat')}}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{color:S.text3, background:'transparent', border:'none', cursor:'pointer'}}
                            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=S.red;(e.currentTarget as HTMLElement).style.background=S.red+'18'}}
                            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color=S.text3;(e.currentTarget as HTMLElement).style.background='transparent'}}>
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </div>
                      <div style={{fontSize:13, fontWeight:700, color:S.text1}}>{c.name}</div>
                      {(c as any).name_ar && <div style={{fontSize:11, color:S.text2, marginTop:2}} dir="rtl">{(c as any).name_ar}</div>}
                      <div style={{fontSize:10, fontFamily:"'JetBrains Mono', monospace", color:S.text3, marginTop:2, marginBottom:10}}>{c.slug}</div>
                      <div className="flex items-center justify-between">
                        <span style={{fontSize:11, color:S.text3}}><strong style={{color:S.text2}}>{toolCount}</strong> tools</span>
                        <button onClick={()=>toggleCat(c)} style={{background:'none', border:'none', cursor:'pointer'}}>
                          {c.is_active
                            ? <ToggleRight size={20} style={{color:c.color}}/>
                            : <ToggleLeft size={20} style={{color:S.text3}}/>}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {!loading && cats.length===0 && (
                <div className="col-span-4 text-center py-16 rounded-xl" style={{background:S.surface, border:`1px solid ${S.border}`}}>
                  <Tag size={28} style={{color:S.text3, opacity:0.3, margin:'0 auto 10px'}}/>
                  <p style={{fontSize:13, color:S.text3, marginBottom:12}}>No categories yet</p>
                  <button onClick={openAddCat} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold" style={{background:S.accent, color:'#000'}}>
                    <Plus size={12}/>Add Category
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Deals tab ── */}
          {tab==='deals' && (
            <div className="space-y-6 max-w-4xl">
              {/* Featured Products */}
              <div style={{background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:20}}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 style={{fontWeight:700, fontSize:13, color:S.text1}}>⭐ Featured Products</h3>
                    <p style={{fontSize:11, color:S.text3, marginTop:2}}>Shown as "Top Picks" on Deals tab ({featuredIds.length} selected)</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {tools.filter(t=>t.is_active).map(t=>{
                    const sel = featuredIds.includes(t.id)
                    return (
                      <button key={t.id} onClick={()=>toggleFeatured(t.id)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-start transition-all"
                        style={{border:`2px solid ${sel?S.amber:S.border}`, background:sel?'rgba(245,158,11,0.08)':'transparent'}}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{background:S.surface2, border:`1px solid ${S.border}`}}>
                          {t.image_url?<img src={t.image_url} alt={t.name} className="w-6 h-6 object-contain"/>
                            :<span style={{fontSize:9, fontWeight:700, color:S.text3}}>{t.name.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div style={{fontSize:11.5, fontWeight:600, color:S.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.name}</div>
                          <div style={{fontSize:10, color:S.text3, textTransform:'capitalize'}}>{t.category_slug}</div>
                        </div>
                        <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{background:sel?S.amber:S.surface3}}>
                          {sel && <Check size={10} style={{color:'#000'}}/>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sections */}
              <div style={{background:S.surface, border:`1px solid ${S.border}`, borderRadius:14, padding:20}}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 style={{fontWeight:700, fontSize:13, color:S.text1}}>📂 Product Sections</h3>
                    <p style={{fontSize:11, color:S.text3, marginTop:2}}>Curated sections shown on Deals tab</p>
                  </div>
                  <button onClick={addSection} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.25)'}}>
                    <Plus size={12}/>Add Section
                  </button>
                </div>

                {dealSections.length===0 && (
                  <div className="text-center py-10 rounded-xl" style={{border:`2px dashed ${S.border}`}}>
                    <p style={{fontSize:12, color:S.text3}}>No sections yet. Click "Add Section" to create one.</p>
                  </div>
                )}

                <div className="space-y-4">
                  {dealSections.map((sec, si) => (
                    <div key={sec.id} className="rounded-xl p-4" style={{border:`1px solid ${S.border}`, background:S.surface2}}>
                      <div className="flex items-center justify-between mb-3">
                        <span style={{fontSize:10, fontWeight:700, color:S.text3, background:S.surface3, padding:'2px 8px', borderRadius:6}}>Section #{si+1}</span>
                        <button onClick={()=>removeSection(sec.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
                          style={{color:S.red, background:'transparent', border:'none', cursor:'pointer'}}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.1)'}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                          <Trash2 size={11}/>Remove
                        </button>
                      </div>
                      <div className="mb-3">
                        <label style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:S.text3, display:'block', marginBottom:5}}>Emoji</label>
                        <input type="text" value={sec.emoji} onChange={e=>updateSection(sec.id,'emoji',e.target.value)}
                          placeholder="🔖" {...inputProps} style={{...inpStyle, width:60, textAlign:'center', fontSize:18}}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:S.text3, display:'block', marginBottom:5}}>Title (EN)</label>
                          <input value={sec.title_en} onChange={e=>updateSection(sec.id,'title_en',e.target.value)} placeholder="Section title in English" {...inputProps}/>
                        </div>
                        <div>
                          <label style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:S.text3, display:'block', marginBottom:5, textAlign:'right'}}>العنوان (AR)</label>
                          <input value={sec.title_ar} onChange={e=>updateSection(sec.id,'title_ar',e.target.value)} placeholder="عنوان القسم بالعربية" dir="rtl" {...inputProps}/>
                        </div>
                        <div>
                          <label style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:S.text3, display:'block', marginBottom:5}}>Subtitle (EN)</label>
                          <input value={sec.subtitle_en} onChange={e=>updateSection(sec.id,'subtitle_en',e.target.value)} placeholder="Short description…" {...inputProps}/>
                        </div>
                        <div>
                          <label style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:S.text3, display:'block', marginBottom:5, textAlign:'right'}}>العنوان الفرعي (AR)</label>
                          <input value={sec.subtitle_ar} onChange={e=>updateSection(sec.id,'subtitle_ar',e.target.value)} placeholder="وصف مختصر…" dir="rtl" {...inputProps}/>
                        </div>
                      </div>
                      <p style={{fontSize:10, color:S.text3, marginBottom:8}}>Products in this section ({sec.tool_ids.length} selected):</p>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {tools.filter(t=>t.is_active).map(t=>{
                          const sel = sec.tool_ids.includes(t.id)
                          return (
                            <button key={t.id} onClick={()=>toggleSectionTool(sec.id, t.id)}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-start transition-all text-xs"
                              style={{border:`1px solid ${sel?'rgba(99,102,241,0.4)':S.border}`, background:sel?'rgba(99,102,241,0.08)':'transparent', cursor:'pointer'}}>
                              <div className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0" style={{background:S.surface3}}>
                                {t.image_url?<img src={t.image_url} alt="" className="w-5 h-5 object-contain"/>:<span style={{fontSize:8, color:S.text3}}>{t.name.slice(0,2)}</span>}
                              </div>
                              <span className="flex-1 truncate" style={{color:S.text2}}>{t.name}</span>
                              {sel && <Check size={10} style={{color:'#818cf8', flexShrink:0}}/>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Bundles tab ── */}
          {tab==='bundles' && <BundlesTab/>}
        </div>
      </main>

      {/* ══════════════════════════════════════════
          TOOL MODAL — Tabbed design
      ══════════════════════════════════════════ */}
      {(modal==='add-tool'||modal==='edit-tool') && (
        <div className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto" style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-2xl my-4 rounded-2xl shadow-2xl flex flex-col" style={{background:S.surface, border:`1px solid ${S.border2}`}}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{borderBottom:`1px solid ${S.border}`}}>
              <div>
                <h3 style={{fontSize:14, fontWeight:700, color:S.text1}}>{modal==='add-tool'?'Add Tool':'Edit Tool'}</h3>
                <p style={{fontSize:11, color:S.text3, marginTop:1}}>Fill in all required fields across each tab</p>
              </div>
              <button onClick={()=>setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{background:S.surface2, border:'none', cursor:'pointer', color:S.text2}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=S.surface3}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=S.surface2}}>
                <X size={14}/>
              </button>
            </div>

            {/* Tab strip */}
            <div className="flex flex-shrink-0" style={{borderBottom:`1px solid ${S.border}`, padding:'0 20px'}}>
              {TOOL_TABS.map((label, i) => (
                <button key={label} onClick={()=>setModalTab(i)}
                  className="flex items-center gap-1.5 py-3 mr-1 text-xs font-semibold transition-all"
                  style={{
                    borderBottom:`2px solid ${modalTab===i ? S.accent : 'transparent'}`,
                    marginBottom:-1,
                    color: modalTab===i ? S.accent : S.text3,
                    background:'none', border:'none', borderBottom:`2px solid ${modalTab===i?S.accent:'transparent'}`,
                    cursor:'pointer', paddingBottom:10, paddingTop:10, paddingLeft:4, paddingRight:12,
                    fontFamily:'inherit',
                  }}>
                  {modalTab===i && <span style={{width:5, height:5, borderRadius:'50%', background:S.accent, display:'inline-block'}}/>}
                  {label}
                </button>
              ))}
            </div>

            {/* Body — panels */}
            <div className="overflow-y-auto" style={{maxHeight:'60vh', padding:20}}>

              {/* TAB 0 — Basics */}
              {modalTab===0 && (
                <>
                  <FieldSection title="Identity">
                    <div>
                      <FL>Tool Name *</FL>
                      <input value={toolForm.name} onChange={e=>setToolForm({...toolForm,name:e.target.value})}
                        placeholder="e.g. QuillBot Premium" {...inputProps}/>
                    </div>
                    <div>
                      <FL>Shop Type *</FL>
                      <div className="flex gap-2">
                        {SHOP_CATS.map(c=>{
                          const sc = SHOP_CAT_COLORS[c]
                          const active = toolForm.category_slug===c
                          return (
                            <button key={c} onClick={()=>setToolForm({...toolForm,category_slug:c})}
                              className="flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all"
                              style={{
                                background: active ? sc.bg : S.surface2,
                                border: `1px solid ${active ? sc.color+'50' : S.border}`,
                                color: active ? sc.color : S.text3,
                                cursor:'pointer', fontFamily:'inherit',
                              }}>
                              {c}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <FL>Category (filter tag)</FL>
                      <select value={toolForm.category_id} onChange={e=>setToolForm({...toolForm,category_id:e.target.value})} {...inputProps as any}>
                        <option value="">— No category —</option>
                        {cats.filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                  </FieldSection>

                  <FieldSection title="Media">
                    <Row>
                      <div>
                        <FL>Image URL</FL>
                        <input value={toolForm.image_url} onChange={e=>setToolForm({...toolForm,image_url:e.target.value})}
                          placeholder="https://…" {...inputProps}/>
                        <Hint>Shown as thumbnail in store cards</Hint>
                      </div>
                      <div>
                        <FL>YouTube Video URL</FL>
                        <input value={toolForm.video_url} onChange={e=>setToolForm({...toolForm,video_url:e.target.value})}
                          placeholder="https://youtube.com/watch?v=…" {...inputProps}/>
                        <Hint>Optional demo video on landing page</Hint>
                      </div>
                    </Row>
                    {toolForm.image_url && (
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{background:S.surface2, border:`1px solid ${S.border}`}}>
                        <img src={toolForm.image_url} alt="" className="w-10 h-10 object-contain rounded-lg" style={{background:S.surface3}}/>
                        <span style={{fontSize:11, color:S.text3}}>Image preview</span>
                      </div>
                    )}
                  </FieldSection>

                  {/* Bundle items picker */}
                  {toolForm.category_slug==='bundle' && (
                    <FieldSection title="Bundle Items">
                      <div>
                        <FL>Select tools to include in this bundle</FL>
                        <div className="rounded-xl overflow-hidden max-h-48 overflow-y-auto" style={{border:`1px solid ${S.border}`}}>
                          {tools.filter(t=>t.category_slug!=='bundle').map(t=>{
                            const checked = bundleItemIds.includes(t.id)
                            return (
                              <label key={t.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
                                style={{borderBottom:`1px solid ${S.border}`, background:checked?'rgba(59,130,246,0.06)':S.surface2}}>
                                <input type="checkbox" checked={checked}
                                  onChange={e=>setBundleItemIds(prev=>e.target.checked?[...prev,t.id]:prev.filter(id=>id!==t.id))}
                                  style={{accentColor:S.blue, width:14, height:14, flexShrink:0}}/>
                                {t.image_url && <img src={t.image_url} className="w-5 h-5 object-contain rounded flex-shrink-0" alt=""/>}
                                <span className="flex-1 truncate" style={{fontSize:12, fontWeight:500, color:checked?S.text1:S.text2}}>{t.name}</span>
                                <span style={{fontSize:10, color:S.text3, flexShrink:0, textTransform:'capitalize'}}>{t.category_slug}</span>
                              </label>
                            )
                          })}
                        </div>
                        <Hint>{bundleItemIds.length} tools selected</Hint>
                      </div>
                    </FieldSection>
                  )}
                </>
              )}

              {/* TAB 1 — Pricing */}
              {modalTab===1 && (
                <>
                  <FieldSection title="Prices">
                    <Row cols={3}>
                      <div>
                        <FL>Price EGP *</FL>
                        <input type="number" value={toolForm.price_egp} onChange={e=>setToolForm({...toolForm,price_egp:e.target.value})} {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      <div>
                        <FL>Price USD</FL>
                        <input type="number" value={toolForm.price_usd} onChange={e=>setToolForm({...toolForm,price_usd:e.target.value})} {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      <div>
                        <FL>Retail EGP</FL>
                        <input type="number" value={toolForm.retail_price_egp} onChange={e=>setToolForm({...toolForm,retail_price_egp:e.target.value})} placeholder="0" {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}}/>
                        <Hint>Shows as strikethrough</Hint>
                      </div>
                    </Row>
                  </FieldSection>

                  <FieldSection title="Duration">
                    <Row>
                      <div>
                        <FL>Duration Label</FL>
                        <input value={toolForm.duration_label} onChange={e=>setToolForm({...toolForm,duration_label:e.target.value})} placeholder="28 Days" {...inputProps}/>
                        <Hint>Shown next to price on store card</Hint>
                      </div>
                      <div>
                        <FL>Duration (days)</FL>
                        <input type="number" value={toolForm.duration_days} onChange={e=>setToolForm({...toolForm,duration_days:e.target.value})} {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}}/>
                        <Hint>Used to calculate expiry date</Hint>
                      </div>
                    </Row>
                  </FieldSection>

                  <FieldSection title="Badges & Delivery">
                    <Row>
                      <div>
                        <FL>Warranty Badge</FL>
                        <select value={(toolForm as any).warranty_label||''} onChange={e=>setToolForm({...toolForm,warranty_label:e.target.value} as any)} {...inputProps as any}>
                          <option value="">No Warranty</option>
                          <option value="Full Warranty">Full Warranty</option>
                          <option value="1 Year Warranty">1 Year Warranty</option>
                          <option value="6 Months Warranty">6 Months Warranty</option>
                          <option value="1 Month Warranty">1 Month Warranty</option>
                          <option value="10 Days Warranty">10 Days Warranty</option>
                        </select>
                        <input value={(toolForm as any).warranty_label||''} onChange={e=>setToolForm({...toolForm,warranty_label:e.target.value} as any)}
                          placeholder="or type custom e.g. '3 Months Warranty'" {...inputProps} style={{...inpStyle, marginTop:6}}/>
                      </div>
                      <div>
                        <FL>Delivery Label</FL>
                        <input value={toolForm.delivery_label} onChange={e=>setToolForm({...toolForm,delivery_label:e.target.value})} placeholder="INSTANT" {...inputProps}/>
                      </div>
                    </Row>
                  </FieldSection>

                  <FieldSection title="Social Proof">
                    <Row cols={3}>
                      <div>
                        <FL>Rating (0–5)</FL>
                        <input type="number" step="0.1" min="0" max="5" value={toolForm.rating} onChange={e=>setToolForm({...toolForm,rating:e.target.value})} {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      <div>
                        <FL>Review Count</FL>
                        <input type="number" value={toolForm.review_count} onChange={e=>setToolForm({...toolForm,review_count:e.target.value})} {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}}/>
                      </div>
                      <div>
                        <FL>Sales Count (base)</FL>
                        <input type="number" min="0" value={(toolForm as any).sales_count} onChange={e=>setToolForm({...toolForm,...{sales_count:e.target.value}} as any)} {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}} placeholder="0"/>
                      </div>
                    </Row>
                  </FieldSection>
                </>
              )}

              {/* TAB 2 — Content */}
              {modalTab===2 && (
                <>
                  <FieldSection title="Description">
                    <Row>
                      <div>
                        <FL>🇬🇧 Description (EN)</FL>
                        <textarea value={toolForm.description} onChange={e=>setToolForm({...toolForm,description:e.target.value})}
                          className={inp} style={{...inpStyle, resize:'vertical', minHeight:80}}
                          onFocus={inpFocus} onBlur={inpBlur}/>
                      </div>
                      <div>
                        <FL>🇪🇬 الوصف (AR)</FL>
                        <textarea value={toolForm.description_ar} onChange={e=>setToolForm({...toolForm,description_ar:e.target.value})}
                          className={inp} style={{...inpStyle, resize:'vertical', minHeight:80}} dir="rtl" placeholder="أدخل الوصف بالعربي…"
                          onFocus={inpFocus} onBlur={inpBlur}/>
                      </div>
                    </Row>
                  </FieldSection>

                  <FieldSection title="Features List">
                    <div>
                      <FL>One feature per line</FL>
                      <textarea value={toolForm.features} onChange={e=>setToolForm({...toolForm,features:e.target.value})}
                        className={inp} style={{...inpStyle, resize:'vertical', minHeight:100}}
                        placeholder={"10 daily downloads\nUnlimited licenses\nPriority support"}
                        onFocus={inpFocus} onBlur={inpBlur}/>
                      <Hint>Displayed as bullet points on the product card</Hint>
                    </div>
                  </FieldSection>
                </>
              )}

              {/* TAB 3 — Meta */}
              {modalTab===3 && (
                <>
                  <FieldSection title="Landing Page">
                    <div>
                      <FL>URL Slug</FL>
                      <input value={toolForm.details_slug} onChange={e=>setToolForm({...toolForm,details_slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')})}
                        placeholder="quillbot-premium" {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}}/>
                      <Hint>URL: /u/{toolForm.details_slug||'slug'} — must be unique, lowercase, hyphens only</Hint>
                    </div>
                    <div>
                      <FL>Official Site URL</FL>
                      <input value={toolForm.details_url} onChange={e=>setToolForm({...toolForm,details_url:e.target.value})}
                        placeholder="https://quillbot.com" {...inputProps}/>
                    </div>
                  </FieldSection>

                  <FieldSection title="Visibility">
                    <div>
                      <FL>Sort Order</FL>
                      <input type="number" value={toolForm.sort_order} onChange={e=>setToolForm({...toolForm,sort_order:e.target.value})}
                        {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace", maxWidth:120}}/>
                      <Hint>Lower numbers appear first in the store</Hint>
                    </div>
                    <label className="flex items-center gap-2.5 p-3 rounded-lg cursor-pointer transition-colors"
                      style={{background:S.surface2, border:`1px solid ${S.border}`}}>
                      <input type="checkbox" checked={toolForm.is_out_of_stock} onChange={e=>setToolForm({...toolForm,is_out_of_stock:e.target.checked})}
                        style={{width:15, height:15, accentColor:S.red, flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:12.5, color:S.text2, fontWeight:500}}>Mark as Out of Stock</div>
                        <div style={{fontSize:10, color:S.text3}}>Hides purchase button, shows "Sold Out" badge</div>
                      </div>
                    </label>
                  </FieldSection>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0" style={{borderTop:`1px solid ${S.border}`}}>
              <button onClick={()=>setModal(null)} className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{background:'none', border:`1px solid ${S.border2}`, color:S.text2, cursor:'pointer', fontFamily:'inherit'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=S.surface2}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='none'}}>
                Cancel
              </button>
              {/* Prev / Next */}
              <div className="flex gap-1.5 ml-auto">
                {modalTab > 0 && (
                  <button onClick={()=>setModalTab(t=>t-1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{background:S.surface2, border:`1px solid ${S.border}`, color:S.text2, cursor:'pointer', fontFamily:'inherit'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=S.surface3}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=S.surface2}}>
                    <ChevronLeft size={11}/>Back
                  </button>
                )}
                {modalTab < 3 && (
                  <button onClick={()=>setModalTab(t=>t+1)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{background:S.surface2, border:`1px solid ${S.border}`, color:S.text2, cursor:'pointer', fontFamily:'inherit'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=S.surface3}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=S.surface2}}>
                    Next<ChevronRight size={11}/>
                  </button>
                )}
              </div>
              <button onClick={saveTool} disabled={saving}
                className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50 transition-opacity"
                style={{background:S.accent, color:'#000', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
                {saving ? <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"/> : <><Check size={13}/>{modal==='add-tool'?'Add Tool':'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CATEGORY MODAL
      ══════════════════════════════════════════ */}
      {(modal==='add-cat'||modal==='edit-cat') && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col" style={{background:S.surface, border:`1px solid ${S.border2}`, maxHeight:'90vh'}}>
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{borderBottom:`1px solid ${S.border}`}}>
              <h3 style={{fontSize:14, fontWeight:700, color:S.text1}}>{modal==='add-cat'?'Add Category':'Edit Category'}</h3>
              <button onClick={()=>setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{background:S.surface2, border:'none', cursor:'pointer', color:S.text2}}>
                <X size={14}/>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {/* Live preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl mb-4"
                style={{background:catForm.color+'12', border:`1px solid ${catForm.color}30`, borderLeft:`3px solid ${catForm.color}`}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden"
                  style={{background:catForm.color+'20'}}>
                  {catForm.image_url ? <img src={catForm.image_url} className="w-full h-full object-cover" alt=""/> : catForm.icon}
                </div>
                <div>
                  <div style={{fontSize:13, fontWeight:700, color:S.text1}}>{catForm.name||'Category Name'}</div>
                  <div style={{fontSize:10, fontFamily:"'JetBrains Mono', monospace", color:S.text3}}>{catForm.slug||'slug'}</div>
                </div>
              </div>

              <FieldSection title="Name">
                <Row>
                  <div>
                    <FL>🇬🇧 Name (EN) *</FL>
                    <input value={catForm.name}
                      onChange={e=>setCatForm({...catForm,name:e.target.value,slug:e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'_')})}
                      placeholder="Writing & AI" {...inputProps}/>
                  </div>
                  <div>
                    <FL>🇪🇬 الاسم (AR)</FL>
                    <input value={catForm.name_ar} onChange={e=>setCatForm({...catForm,name_ar:e.target.value})}
                      placeholder="الكتابة والذكاء" {...inputProps} dir="rtl"/>
                  </div>
                </Row>
                <Row>
                  <div>
                    <FL>Slug</FL>
                    <input value={catForm.slug} onChange={e=>setCatForm({...catForm,slug:e.target.value})}
                      {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace"}}/>
                  </div>
                  <div>
                    <FL>Icon (emoji)</FL>
                    <input value={catForm.icon} onChange={e=>setCatForm({...catForm,icon:e.target.value})}
                      placeholder="✍️" {...inputProps} style={{...inpStyle, textAlign:'center', fontSize:20}}/>
                  </div>
                </Row>
              </FieldSection>

              <FieldSection title="Visual">
                <div>
                  <FL>Accent Color</FL>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_COLORS.map(c=>(
                      <button key={c} onClick={()=>setCatForm({...catForm,color:c})}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                        style={{background:c, outline:catForm.color===c?`2px solid ${c}`:'none', outlineOffset:2, border:'none', cursor:'pointer'}}>
                        {catForm.color===c && <Check size={10} style={{color:'#fff'}}/>}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="color" value={catForm.color} onChange={e=>setCatForm({...catForm,color:e.target.value})}
                      className="rounded-lg border cursor-pointer p-0.5 flex-shrink-0" style={{width:36, height:36, background:'none', border:`1px solid ${S.border}`}}/>
                    <input value={catForm.color} onChange={e=>setCatForm({...catForm,color:e.target.value})}
                      {...inputProps} style={{...inpStyle, flex:1, fontFamily:"'JetBrains Mono', monospace"}}/>
                  </div>
                </div>
                <Row>
                  <div>
                    <FL>Image URL (EN)</FL>
                    <input value={catForm.image_url} onChange={e=>setCatForm({...catForm,image_url:e.target.value})} placeholder="https://…" {...inputProps}/>
                    {catForm.image_url && <div className="mt-1.5 w-full h-14 rounded-lg overflow-hidden" style={{border:`1px solid ${S.border}`}}><img src={catForm.image_url} className="w-full h-full object-cover" alt=""/></div>}
                  </div>
                  <div>
                    <FL>صورة (AR)</FL>
                    <input value={catForm.image_url_ar} onChange={e=>setCatForm({...catForm,image_url_ar:e.target.value})} placeholder="https://…" {...inputProps}/>
                    {catForm.image_url_ar && <div className="mt-1.5 w-full h-14 rounded-lg overflow-hidden" style={{border:`1px solid ${S.border}`}}><img src={catForm.image_url_ar} className="w-full h-full object-cover" alt=""/></div>}
                  </div>
                </Row>
                <div>
                  <FL>Sort Order</FL>
                  <input type="number" value={catForm.sort_order} onChange={e=>setCatForm({...catForm,sort_order:e.target.value})}
                    {...inputProps} style={{...inpStyle, fontFamily:"'JetBrains Mono', monospace", maxWidth:100}}/>
                </div>
              </FieldSection>
            </div>

            <div className="flex gap-2 px-5 pb-5 pt-3 flex-shrink-0" style={{borderTop:`1px solid ${S.border}`}}>
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{background:'none', border:`1px solid ${S.border2}`, color:S.text2, cursor:'pointer', fontFamily:'inherit'}}>
                Cancel
              </button>
              <button onClick={saveCat} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{background:S.accent, color:'#000', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
                {saving ? <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin"/> : <><Check size={13}/>{modal==='add-cat'?'Add Category':'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          LANDING BLOCKS MODAL
      ══════════════════════════════════════════ */}
      {modal==='landing' && landingTool && (
        <div className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto" style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-3xl my-4 rounded-2xl shadow-2xl flex flex-col" style={{background:S.surface, border:`1px solid ${S.border2}`}}>
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 sticky top-0 rounded-t-2xl z-10" style={{background:S.surface, borderBottom:`1px solid ${S.border}`}}>
              <div>
                <h3 style={{fontSize:14, fontWeight:700, color:S.text1}}>Landing Page — {landingTool.name}</h3>
                <p style={{fontSize:11, color:S.text3, marginTop:1}}>Blocks shown below the tool description on the landing page</p>
              </div>
              <button onClick={()=>setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{background:S.surface2, border:'none', cursor:'pointer', color:S.text2}}>
                <X size={14}/>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {landingBlocks.length===0 && (
                <div className="text-center py-10 rounded-xl" style={{border:`2px dashed ${S.border}`}}>
                  <p style={{fontSize:12, color:S.text3}}>No blocks yet. Add your first block below.</p>
                </div>
              )}

              {landingBlocks.map((block, i)=>(
                <div key={block.id} className="rounded-xl p-4 space-y-3" style={{border:`1px solid ${S.border}`, background:S.surface2}}>
                  <div className="flex items-center justify-between">
                    <span style={{fontSize:10, fontWeight:700, color:S.text3, background:S.surface3, padding:'2px 8px', borderRadius:6}}>Block {i+1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>moveBlock(block.id,-1)} disabled={i===0}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{color:S.text3, background:'none', border:'none', cursor:'pointer'}}>
                        <ChevronUp size={13}/>
                      </button>
                      <button onClick={()=>moveBlock(block.id,1)} disabled={i===landingBlocks.length-1}
                        className="w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-30"
                        style={{color:S.text3, background:'none', border:'none', cursor:'pointer'}}>
                        <ChevronDown size={13}/>
                      </button>
                      <button onClick={()=>removeBlock(block.id)}
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{color:S.red, background:'none', border:'none', cursor:'pointer'}}>
                        <X size={13}/>
                      </button>
                    </div>
                  </div>

                  <div>
                    <FL>Layout</FL>
                    <select value={block.layout} onChange={e=>updateBlock(block.id,{layout:e.target.value as any})} {...inputProps as any}>
                      {LAYOUTS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>

                  {(block.layout==='image_left'||block.layout==='image_right'||block.layout==='image_only') && (
                    <div>
                      <FL>Image / GIF URL</FL>
                      <input value={block.image_url||''} onChange={e=>updateBlock(block.id,{image_url:e.target.value})} placeholder="https://…" {...inputProps}/>
                      {block.image_url && <img src={block.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover" style={{border:`1px solid ${S.border}`}}/>}
                    </div>
                  )}

                  {block.layout==='video' && (
                    <div>
                      <FL>YouTube URL</FL>
                      <input value={block.video_url||''} onChange={e=>updateBlock(block.id,{video_url:e.target.value})} placeholder="https://youtube.com/watch?v=…" {...inputProps}/>
                    </div>
                  )}

                  {!['image_only','features_grid','faq'].includes(block.layout) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FL>🇬🇧 Title (EN)</FL>
                        <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Section title" {...inputProps}/>
                      </div>
                      <div>
                        <FL>🇪🇬 عنوان (AR)</FL>
                        <input value={block.title_ar||''} onChange={e=>updateBlock(block.id,{title_ar:e.target.value})} placeholder="عنوان القسم" {...inputProps} dir="rtl"/>
                      </div>
                      <div>
                        <FL>🇬🇧 Body (EN)</FL>
                        <textarea value={block.body_en||''} onChange={e=>updateBlock(block.id,{body_en:e.target.value})} rows={3}
                          placeholder="Description text…" className={inp} style={{...inpStyle, resize:'none'}} onFocus={inpFocus} onBlur={inpBlur}/>
                      </div>
                      <div>
                        <FL>🇪🇬 نص (AR)</FL>
                        <textarea value={block.body_ar||''} onChange={e=>updateBlock(block.id,{body_ar:e.target.value})} rows={3}
                          placeholder="النص بالعربي…" className={inp} style={{...inpStyle, resize:'none'}} dir="rtl" onFocus={inpFocus} onBlur={inpBlur}/>
                      </div>
                    </div>
                  )}

                  {block.layout==='features_grid' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FL>🇬🇧 Title (EN)</FL>
                          <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Why choose us" {...inputProps}/>
                        </div>
                        <div>
                          <FL>🇪🇬 عنوان (AR)</FL>
                          <input value={block.title_ar||''} onChange={e=>updateBlock(block.id,{title_ar:e.target.value})} placeholder="لماذا تختارنا" {...inputProps} dir="rtl"/>
                        </div>
                      </div>
                      <div>
                        <FL>Feature Items</FL>
                        {(block.features||[]).map((f,fi)=>(
                          <div key={fi} className="flex items-center gap-2 mb-2">
                            <input value={f.icon} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,icon:e.target.value}; updateBlock(block.id,{features:fs}) }}
                              placeholder="⚡" {...inputProps} style={{...inpStyle, width:52, textAlign:'center', fontSize:18}}/>
                            <input value={f.en} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,en:e.target.value}; updateBlock(block.id,{features:fs}) }}
                              placeholder="Feature EN" {...inputProps} style={{...inpStyle, flex:1}}/>
                            <input value={f.ar} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,ar:e.target.value}; updateBlock(block.id,{features:fs}) }}
                              placeholder="ميزة AR" {...inputProps} style={{...inpStyle, flex:1}} dir="rtl"/>
                            <button onClick={()=>{ const fs=(block.features||[]).filter((_,j)=>j!==fi); updateBlock(block.id,{features:fs}) }}
                              className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                              style={{color:S.red, background:'none', border:'none', cursor:'pointer'}}>
                              <X size={12}/>
                            </button>
                          </div>
                        ))}
                        <button onClick={()=>updateBlock(block.id,{features:[...(block.features||[]),{icon:'⭐',en:'',ar:''}]})}
                          className="text-xs flex items-center gap-1 mt-1"
                          style={{color:S.blue, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
                          <Plus size={11}/>Add Feature
                        </button>
                      </div>
                    </div>
                  )}

                  {block.layout==='faq' && (
                    <div className="space-y-3">
                      <div>
                        <FL>Section Title (EN)</FL>
                        <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Frequently Asked Questions" {...inputProps}/>
                      </div>
                      <div>
                        <FL>FAQ Items</FL>
                        {(block.faqs||[]).map((faq,fi)=>(
                          <div key={fi} className="rounded-lg p-3 mb-2 space-y-2" style={{border:`1px solid ${S.border}`, background:S.surface3}}>
                            <div className="flex items-center justify-between mb-1">
                              <span style={{fontSize:10, fontWeight:700, color:S.text3}}>Q{fi+1}</span>
                              <button onClick={()=>{ const fs=(block.faqs||[]).filter((_,j)=>j!==fi); updateBlock(block.id,{faqs:fs}) }}
                                className="w-5 h-5 rounded flex items-center justify-center"
                                style={{color:S.red, background:'none', border:'none', cursor:'pointer'}}>
                                <X size={10}/>
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={faq.q_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_en:e.target.value}; updateBlock(block.id,{faqs:fs}) }} placeholder="Question EN" {...inputProps}/>
                              <input value={faq.q_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_ar:e.target.value}; updateBlock(block.id,{faqs:fs}) }} placeholder="السؤال AR" {...inputProps} dir="rtl"/>
                              <textarea value={faq.a_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_en:e.target.value}; updateBlock(block.id,{faqs:fs}) }} rows={2} placeholder="Answer EN"
                                className={inp} style={{...inpStyle, resize:'none'}} onFocus={inpFocus} onBlur={inpBlur}/>
                              <textarea value={faq.a_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_ar:e.target.value}; updateBlock(block.id,{faqs:fs}) }} rows={2} placeholder="الإجابة AR"
                                className={inp} style={{...inpStyle, resize:'none'}} dir="rtl" onFocus={inpFocus} onBlur={inpBlur}/>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>updateBlock(block.id,{faqs:[...(block.faqs||[]),{q_en:'',q_ar:'',a_en:'',a_ar:''}]})}
                          className="text-xs flex items-center gap-1"
                          style={{color:S.blue, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
                          <Plus size={11}/>Add Question
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addBlock}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{border:`2px dashed ${S.border}`, color:S.text3, background:'none', cursor:'pointer', fontFamily:'inherit'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(59,130,246,0.4)';(e.currentTarget as HTMLElement).style.color=S.blue}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=S.border;(e.currentTarget as HTMLElement).style.color=S.text3}}>
                <Plus size={14}/>Add Block
              </button>
            </div>

            <div className="flex gap-2 px-5 pb-5" style={{borderTop:`1px solid ${S.border}`, paddingTop:14}}>
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{background:'none', border:`1px solid ${S.border2}`, color:S.text2, cursor:'pointer', fontFamily:'inherit'}}>
                Cancel
              </button>
              <button onClick={saveLandingBlocks} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{background:S.green, color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check size={13}/>Save Landing Page</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DELETE CONFIRM
      ══════════════════════════════════════════ */}
      {delItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-sm rounded-2xl p-7 text-center shadow-2xl" style={{background:S.surface, border:`1px solid ${S.border2}`}}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{background:'rgba(239,68,68,0.12)'}}>
              <Trash2 size={20} style={{color:S.red}}/>
            </div>
            <h3 style={{fontSize:15, fontWeight:700, color:S.text1, marginBottom:6}}>Delete {delType==='tool'?'Tool':'Category'}?</h3>
            <p style={{fontSize:13, color:S.text2, marginBottom:22}}>
              <span style={{fontWeight:600, color:S.text1}}>{delItem.name}</span>
              {' '}will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button onClick={()=>setDel(null)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                style={{background:'none', border:`1px solid ${S.border2}`, color:S.text2, cursor:'pointer', fontFamily:'inherit'}}>
                Cancel
              </button>
              <button onClick={del} className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{background:S.red, color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
