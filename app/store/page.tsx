'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Copy, X, Check, AlertCircle, ToggleLeft, ToggleRight, Package, Tag, Layout, ChevronUp, ChevronDown, Star, Globe, ChevronLeft, ChevronRight } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import BundlesTab from '@/components/admin/BundlesTab'
import ImageUploadInput from '@/components/admin/ImageUploadInput'

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
    <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"

const SHOP_CATS = ['shared','private','bundle']
const SHOP_CAT_STYLES: Record<string, { light: string; dark: string; dot: string }> = {
  shared:  { light:'bg-blue-50 text-blue-600',   dark:'dark:bg-blue-900/20 dark:text-blue-400',   dot:'bg-blue-500' },
  private: { light:'bg-purple-50 text-purple-600',dark:'dark:bg-purple-900/20 dark:text-purple-400',dot:'bg-purple-500' },
  bundle:  { light:'bg-amber-50 text-amber-600',  dark:'dark:bg-amber-900/20 dark:text-amber-400',  dot:'bg-amber-500' },
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

// ── Shared label ──
function FL({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">{children}</div>
}

// ── Section card for modal ──
function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden mb-3">
      <div className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 border-l-2 border-l-amber-400 px-3.5 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{title}</span>
      </div>
      <div className="p-3.5 flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Row({ cols=2, children }: { cols?:2|3; children: React.ReactNode }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns: cols===3 ? '1fr 1fr 1fr' : '1fr 1fr', gap:10 }}>
      {children}
    </div>
  )
}

const TOOL_TABS = ['Basics', 'Pricing', 'Content', 'Meta']

export default function ShopAdminPage() {
  const router = useRouter()
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

  const emptyTool = { name:'',description:'',description_ar:'',image_url:'',category_slug:'shared',category_id:'',price_egp:'',price_usd:'',retail_price_egp:'',duration_label:'28 Days',duration_days:'28',delivery_label:'INSTANT',warranty_label:'',rating:'5.0',review_count:'0',video_url:'',features:'',sort_order:'0',is_out_of_stock:false,details_url:'',details_slug:'',sales_count:'0' }
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
    setToolForm({name:t.name,description:t.description||'',description_ar:(t as any).description_ar||'',image_url:t.image_url||'',category_slug:t.category_slug,category_id:t.category_id||'',price_egp:String(t.price_egp),price_usd:String(t.price_usd||''),retail_price_egp:String(t.retail_price_egp||''),duration_label:t.duration_label,duration_days:String(t.duration_days),delivery_label:t.delivery_label,warranty_label:(t as any).warranty_label||'',rating:String(t.rating),review_count:String(t.review_count),video_url:t.video_url||'',features:(t.features||[]).join('\n'),sort_order:String(t.sort_order),is_out_of_stock:t.is_out_of_stock,details_url:(t as any).details_url||'',details_slug:(t as any).details_slug||'',sales_count:String((t as any).sales_count||0)})
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
      warranty_label:toolForm.warranty_label||null,
      rating:parseFloat(toolForm.rating)||5.0, review_count:parseInt(toolForm.review_count)||0,
      video_url:toolForm.video_url||null,
      features:toolForm.features.split('\n').map(f=>f.trim()).filter(Boolean),
      sort_order:parseInt(toolForm.sort_order)||0, is_out_of_stock:toolForm.is_out_of_stock,
      details_url:toolForm.details_url||null,
      details_slug:toolForm.details_slug||null,
      sales_count:parseInt((toolForm as any).sales_count)||0,
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
    router.push(`/store/landing/${t.id}`)
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Store Manager" subtitle="Manage tools, categories & deals"/>

        {/* ── Tab bar + toolbar ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {([['tools',`Tools (${tools.length})`],['categories',`Categories (${cats.length})`],['bundles','Bundles'],['deals','Deals']] as const).map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab===id?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
                {id==='tools'&&<Package size={11}/>}{id==='categories'&&<Tag size={11}/>}
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {tab==='tools' && (
              <>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  {([['all','All'],['shared','Shared'],['private','Private'],['bundle','Bundle']] as const).map(([id,label])=>(
                    <button key={id} onClick={()=>setToolCat(id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${toolCat===id?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
                      {label}{id!=='all'?` (${counts[id]||0})`:''}
                    </button>
                  ))}
                </div>
                <button onClick={openAddTool} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors">
                  <Plus size={12}/>Add Tool
                </button>
              </>
            )}
            {tab==='categories' && (
              <button onClick={openAddCat} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors">
                <Plus size={12}/>Add Category
              </button>
            )}
            {tab==='deals' && (
              <button onClick={saveDeals} disabled={dealSaving} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold transition-colors">
                <Check size={12}/>{dealSaving ? 'Saving…' : 'Save Deals'}
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto p-5">

          {/* ── Tools table ── */}
          {tab==='tools' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-amber-500 rounded-full animate-spin"/>
                </div>
              )}
              {!loading && (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{borderCollapse:'collapse'}}>
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        {['Tool','Type','Category','Price','Rating','Landing','Status','Actions'].map(h=>(
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length===0 && (
                        <tr><td colSpan={8} className="text-center py-16">
                          <Package size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-3"/>
                          <p className="text-sm text-gray-400 mb-3">No tools yet</p>
                          <button onClick={openAddTool} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600">
                            <Plus size={12}/>Add First Tool
                          </button>
                        </td></tr>
                      )}
                      {filtered.map(t=>{
                        const sc = SHOP_CAT_STYLES[t.category_slug] || SHOP_CAT_STYLES.shared
                        const hasLanding = Array.isArray(t.landing_blocks) && t.landing_blocks.length > 0
                        return (
                          <tr key={t.id} className={`border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${!t.is_active?'opacity-50':''}`}>
                            {/* Tool */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {t.image_url?<img src={t.image_url} alt={t.name} className="w-7 h-7 object-contain"/>:<span className="text-[10px] font-bold text-gray-400">{t.name.slice(0,2).toUpperCase()}</span>}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t.name}</div>
                                  <div className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[140px] truncate">{t.description}</div>
                                </div>
                              </div>
                            </td>
                            {/* Type badge */}
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${sc.light} ${sc.dark}`}>
                                {t.category_slug}
                              </span>
                            </td>
                            {/* Category */}
                            <td className="px-4 py-3">
                              {t.category_id ? (
                                <div className="flex items-center gap-1.5">
                                  <span>{cats.find(c=>c.id===t.category_id)?.icon}</span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400">{catName(t.category_id)}</span>
                                </div>
                              ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            {/* Price */}
                            <td className="px-4 py-3 font-mono">
                              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{Number(t.price_egp).toLocaleString()} EGP</div>
                              {t.price_usd&&<div className="text-[10px] text-gray-400">${t.price_usd}</div>}
                              <div className="text-[10px] text-gray-400">/{t.duration_label}</div>
                            </td>
                            {/* Rating */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Star size={11} fill="#F59E0B" stroke="#F59E0B"/>
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t.rating}</span>
                                <span className="text-[10px] text-gray-400">({t.review_count})</span>
                              </div>
                            </td>
                            {/* Landing */}
                            <td className="px-4 py-3">
                              <button onClick={()=>openLanding(t)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${hasLanding?'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800':'bg-gray-50 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-500'}`}>
                                <Layout size={10}/>{hasLanding?`${t.landing_blocks!.length} blocks`:'+ Add'}
                              </button>
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <button onClick={()=>toggleTool(t,'is_active')} className="flex items-center gap-1.5">
                                  {t.is_active?<ToggleRight size={18} className="text-emerald-500"/>:<ToggleLeft size={18} className="text-gray-300 dark:text-gray-600"/>}
                                  <span className="text-[10px] text-gray-500">{t.is_active?'Active':'Off'}</span>
                                </button>
                                <button onClick={()=>toggleTool(t,'is_out_of_stock')} className="flex items-center gap-1.5">
                                  {t.is_out_of_stock?<ToggleRight size={18} className="text-red-500"/>:<ToggleLeft size={18} className="text-gray-300 dark:text-gray-600"/>}
                                  <span className="text-[10px] text-gray-500">{t.is_out_of_stock?'OOS':'In Stock'}</span>
                                </button>
                              </div>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={()=>openEditTool(t)} title="Edit" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={12}/></button>
                                <button onClick={()=>duplicateTool(t)} title="Duplicate" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"><Copy size={12}/></button>
                                <button onClick={()=>{setDel(t);setDelType('tool')}} title="Delete" className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 size={12}/></button>
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
              {loading&&<div className="col-span-4 flex justify-center py-16"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"/></div>}
              {cats.map(c=>{
                const toolCount = tools.filter(t=>t.category_id===c.id).length
                return (
                  <div key={c.id} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-opacity ${!c.is_active?'opacity-50':''}`}>
                    <div className="h-1" style={{background:c.color}}/>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden" style={{background:c.color+'18'}}>
                          {(c as any).image_url ? <img src={(c as any).image_url} className="w-full h-full object-cover" alt=""/> : c.icon}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>openEditCat(c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={12}/></button>
                          <button onClick={()=>{setDel(c);setDelType('cat')}} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 size={12}/></button>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{c.name}</div>
                      {(c as any).name_ar && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" dir="rtl">{(c as any).name_ar}</div>}
                      <div className="text-[10px] font-mono text-gray-400 mt-0.5 mb-3">{c.slug}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400"><span className="font-bold text-gray-700 dark:text-gray-300">{toolCount}</span> tools</span>
                        <button onClick={()=>toggleCat(c)}>
                          {c.is_active?<ToggleRight size={20} style={{color:c.color}}/>:<ToggleLeft size={20} className="text-gray-300 dark:text-gray-600"/>}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {!loading&&cats.length===0&&(
                <div className="col-span-4 text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                  <Tag size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-3"/>
                  <p className="text-sm text-gray-400 mb-3">No categories yet</p>
                  <button onClick={openAddCat} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"><Plus size={12}/>Add Category</button>
                </div>
              )}
            </div>
          )}

          {/* ── Deals tab ── */}
          {tab==='deals' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">⭐ Featured Products</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Shown as "Top Picks" on Deals tab ({featuredIds.length} selected)</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {tools.filter(t=>t.is_active).map(t=>{
                    const sel = featuredIds.includes(t.id)
                    return (
                      <button key={t.id} onClick={()=>toggleFeatured(t.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 text-start transition-all ${sel?'border-amber-400 bg-amber-50 dark:bg-amber-900/10':'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}`}>
                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {t.image_url?<img src={t.image_url} alt={t.name} className="w-6 h-6 object-contain"/>:<span className="text-[9px] font-bold text-gray-400">{t.name.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{t.name}</div>
                          <div className="text-[10px] text-gray-400 capitalize">{t.category_slug}</div>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${sel?'bg-amber-400':'bg-gray-100 dark:bg-gray-800'}`}>
                          {sel && <Check size={10} className="text-white"/>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">📂 Product Sections</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Curated sections on Deals tab</p>
                  </div>
                  <button onClick={addSection} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-colors">
                    <Plus size={12}/>Add Section
                  </button>
                </div>
                {dealSections.length===0 && (
                  <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400">
                    No sections yet. Click "Add Section" to create one.
                  </div>
                )}
                <div className="space-y-4">
                  {dealSections.map((sec, si) => (
                    <div key={sec.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">Section #{si+1}</span>
                        <button onClick={()=>removeSection(sec.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs transition-colors">
                          <Trash2 size={11}/>Remove
                        </button>
                      </div>
                      <div className="mb-3">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Emoji</label>
                        <input type="text" value={sec.emoji} onChange={e=>updateSection(sec.id,'emoji',e.target.value)} placeholder="🔖" className={`${inp} w-16 text-center text-lg`}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Title (EN)</label>
                          <input value={sec.title_en} onChange={e=>updateSection(sec.id,'title_en',e.target.value)} placeholder="Section title" className={inp}/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 text-right">العنوان (AR)</label>
                          <input value={sec.title_ar} onChange={e=>updateSection(sec.id,'title_ar',e.target.value)} placeholder="عنوان القسم" dir="rtl" className={inp}/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Subtitle (EN)</label>
                          <input value={sec.subtitle_en} onChange={e=>updateSection(sec.id,'subtitle_en',e.target.value)} placeholder="Short description…" className={inp}/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 text-right">العنوان الفرعي (AR)</label>
                          <input value={sec.subtitle_ar} onChange={e=>updateSection(sec.id,'subtitle_ar',e.target.value)} placeholder="وصف مختصر…" dir="rtl" className={inp}/>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-2">Products ({sec.tool_ids.length} selected):</p>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {tools.filter(t=>t.is_active).map(t=>{
                          const sel = sec.tool_ids.includes(t.id)
                          return (
                            <button key={t.id} onClick={()=>toggleSectionTool(sec.id, t.id)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-start transition-all text-xs ${sel?'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/10':'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}`}>
                              <div className="w-6 h-6 rounded-md bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {t.image_url?<img src={t.image_url} alt="" className="w-5 h-5 object-contain"/>:<span className="text-[8px] text-gray-400">{t.name.slice(0,2)}</span>}
                              </div>
                              <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{t.name}</span>
                              {sel && <Check size={10} className="text-indigo-500 flex-shrink-0"/>}
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
          TOOL MODAL — 4-tab design
      ══════════════════════════════════════════ */}
      {(modal==='add-tool'||modal==='edit-tool') && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto" style={{backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-2xl my-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add-tool'?'Add Tool':'Edit Tool'}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Fill in fields across each tab</p>
              </div>
              <button onClick={()=>setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={14}/>
              </button>
            </div>

            {/* Tab strip */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 px-5 flex-shrink-0">
              {TOOL_TABS.map((label, i) => (
                <button key={label} onClick={()=>setModalTab(i)}
                  className={`py-2.5 px-4 text-xs font-semibold transition-all border-b-2 -mb-px ${modalTab===i?'border-amber-400 text-amber-600 dark:text-amber-400':'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5" style={{maxHeight:'60vh'}}>

              {/* TAB 0 — Basics */}
              {modalTab===0 && (
                <>
                  <FieldSection title="Identity">
                    <div>
                      <FL>Tool Name *</FL>
                      <input value={toolForm.name} onChange={e=>setToolForm({...toolForm,name:e.target.value})} placeholder="e.g. QuillBot Premium" className={inp}/>
                    </div>
                    <div>
                      <FL>Shop Type *</FL>
                      <div className="flex gap-2">
                        {SHOP_CATS.map(c=>{
                          const sc = SHOP_CAT_STYLES[c]
                          const active = toolForm.category_slug===c
                          return (
                            <button key={c} onClick={()=>setToolForm({...toolForm,category_slug:c})}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize border-2 transition-all ${active?`${sc.light} ${sc.dark} border-current`:'border-gray-100 dark:border-gray-800 text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'}`}>
                              {c}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <FL>Category (filter tag)</FL>
                      <select value={toolForm.category_id} onChange={e=>setToolForm({...toolForm,category_id:e.target.value})} className={inp}>
                        <option value="">— No category —</option>
                        {cats.filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                  </FieldSection>

                  <FieldSection title="Media">
                    <Row>
                      <ImageUploadInput
                        label="Product Image"
                        value={toolForm.image_url}
                        onChange={url=>setToolForm({...toolForm,image_url:url})}
                        folder="tools"
                      />
                      <div>
                        <FL>YouTube Video URL</FL>
                        <input value={toolForm.video_url} onChange={e=>setToolForm({...toolForm,video_url:e.target.value})} placeholder="https://youtube.com/watch?v=…" className={inp}/>
                        <p className="text-[10px] text-gray-400 mt-1">Optional demo video on landing page</p>
                      </div>
                    </Row>
                  </FieldSection>

                  {toolForm.category_slug==='bundle' && (
                    <FieldSection title="Bundle Items">
                      <div>
                        <FL>Select tools to include</FL>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                          {tools.filter(t=>t.category_slug!=='bundle').map(t=>{
                            const checked = bundleItemIds.includes(t.id)
                            return (
                              <label key={t.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 ${checked?'bg-blue-50/50 dark:bg-blue-900/10':'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                <input type="checkbox" checked={checked}
                                  onChange={e=>setBundleItemIds(prev=>e.target.checked?[...prev,t.id]:prev.filter(id=>id!==t.id))}
                                  className="rounded accent-blue-500"/>
                                {t.image_url&&<img src={t.image_url} className="w-5 h-5 object-contain rounded flex-shrink-0" alt=""/>}
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">{t.name}</span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0 capitalize">{t.category_slug}</span>
                              </label>
                            )
                          })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{bundleItemIds.length} tools selected</p>
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
                        <input type="number" value={toolForm.price_egp} onChange={e=>setToolForm({...toolForm,price_egp:e.target.value})} className={inp}/>
                      </div>
                      <div>
                        <FL>Price USD</FL>
                        <input type="number" value={toolForm.price_usd} onChange={e=>setToolForm({...toolForm,price_usd:e.target.value})} className={inp}/>
                      </div>
                      <div>
                        <FL>Retail EGP</FL>
                        <input type="number" value={toolForm.retail_price_egp} onChange={e=>setToolForm({...toolForm,retail_price_egp:e.target.value})} placeholder="0" className={inp}/>
                        <p className="text-[10px] text-gray-400 mt-1">Shown as strikethrough</p>
                      </div>
                    </Row>
                  </FieldSection>

                  <FieldSection title="Duration">
                    <Row>
                      <div>
                        <FL>Duration Label</FL>
                        <input value={toolForm.duration_label} onChange={e=>setToolForm({...toolForm,duration_label:e.target.value})} placeholder="28 Days" className={inp}/>
                        <p className="text-[10px] text-gray-400 mt-1">Shown next to price on card</p>
                      </div>
                      <div>
                        <FL>Duration (days)</FL>
                        <input type="number" value={toolForm.duration_days} onChange={e=>setToolForm({...toolForm,duration_days:e.target.value})} className={inp}/>
                        <p className="text-[10px] text-gray-400 mt-1">Used to calculate expiry date</p>
                      </div>
                    </Row>
                  </FieldSection>

                  <FieldSection title="Badges & Delivery">
                    <Row>
                      <div>
                        <FL>Warranty Badge</FL>
                        <select value={(toolForm as any).warranty_label||''} onChange={e=>setToolForm({...toolForm,warranty_label:e.target.value} as any)} className={inp}>
                          <option value="">No Warranty</option>
                          <option value="Full Warranty">Full Warranty</option>
                          <option value="1 Year Warranty">1 Year Warranty</option>
                          <option value="6 Months Warranty">6 Months Warranty</option>
                          <option value="1 Month Warranty">1 Month Warranty</option>
                          <option value="10 Days Warranty">10 Days Warranty</option>
                        </select>
                        <input value={(toolForm as any).warranty_label||''} onChange={e=>setToolForm({...toolForm,warranty_label:e.target.value} as any)}
                          placeholder="or type custom…" className={`${inp} mt-1.5`}/>
                      </div>
                      <div>
                        <FL>Delivery Label</FL>
                        <input value={toolForm.delivery_label} onChange={e=>setToolForm({...toolForm,delivery_label:e.target.value})} placeholder="INSTANT" className={inp}/>
                      </div>
                    </Row>
                  </FieldSection>

                  <FieldSection title="Social Proof">
                    <Row cols={3}>
                      <div>
                        <FL>Rating (0–5)</FL>
                        <input type="number" step="0.1" min="0" max="5" value={toolForm.rating} onChange={e=>setToolForm({...toolForm,rating:e.target.value})} className={inp}/>
                      </div>
                      <div>
                        <FL>Review Count</FL>
                        <input type="number" value={toolForm.review_count} onChange={e=>setToolForm({...toolForm,review_count:e.target.value})} className={inp}/>
                      </div>
                      <div>
                        <FL>Sales Count (base)</FL>
                        <input type="number" min="0" value={(toolForm as any).sales_count} onChange={e=>setToolForm({...toolForm,...{sales_count:e.target.value}} as any)} className={inp} placeholder="0"/>
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
                        <textarea value={toolForm.description} onChange={e=>setToolForm({...toolForm,description:e.target.value})} className={`${inp} resize-none`} rows={4}/>
                      </div>
                      <div>
                        <FL>🇪🇬 الوصف (AR)</FL>
                        <textarea value={toolForm.description_ar} onChange={e=>setToolForm({...toolForm,description_ar:e.target.value})} className={`${inp} resize-none`} rows={4} dir="rtl" placeholder="أدخل الوصف بالعربي…"/>
                      </div>
                    </Row>
                  </FieldSection>

                  <FieldSection title="Features List">
                    <div>
                      <FL>One feature per line</FL>
                      <textarea value={toolForm.features} onChange={e=>setToolForm({...toolForm,features:e.target.value})}
                        className={`${inp} resize-none`} rows={5}
                        placeholder={"10 daily downloads\nUnlimited licenses\nPriority support"}/>
                      <p className="text-[10px] text-gray-400 mt-1">Displayed as bullet points on the product card</p>
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
                        placeholder="quillbot-premium" className={`${inp} font-mono`}/>
                      <p className="text-[10px] text-gray-400 mt-1">URL: /u/{toolForm.details_slug||'slug'} — unique, lowercase, hyphens only</p>
                    </div>
                    <div>
                      <FL>Official Site URL</FL>
                      <input value={toolForm.details_url} onChange={e=>setToolForm({...toolForm,details_url:e.target.value})} placeholder="https://quillbot.com" className={inp}/>
                    </div>
                  </FieldSection>

                  <FieldSection title="Visibility">
                    <div>
                      <FL>Sort Order</FL>
                      <input type="number" value={toolForm.sort_order} onChange={e=>setToolForm({...toolForm,sort_order:e.target.value})} className={`${inp} max-w-[120px]`}/>
                      <p className="text-[10px] text-gray-400 mt-1">Lower numbers appear first in the store</p>
                    </div>
                    <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/60">
                      <input type="checkbox" checked={toolForm.is_out_of_stock} onChange={e=>setToolForm({...toolForm,is_out_of_stock:e.target.checked})}
                        className="w-4 h-4 rounded accent-red-500"/>
                      <div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">Mark as Out of Stock</div>
                        <div className="text-[10px] text-gray-400">Hides purchase button, shows "Sold Out" badge</div>
                      </div>
                    </label>
                  </FieldSection>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
              <button onClick={()=>setModal(null)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <div className="flex gap-1.5 ml-auto">
                {modalTab > 0 && (
                  <button onClick={()=>setModalTab(t=>t-1)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <ChevronLeft size={11}/>Back
                  </button>
                )}
                {modalTab < 3 && (
                  <button onClick={()=>setModalTab(t=>t+1)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Next<ChevronRight size={11}/>
                  </button>
                )}
              </div>
              <button onClick={saveTool} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-60 transition-colors">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add-tool'?'Add Tool':'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          CATEGORY MODAL
      ══════════════════════════════════════════ */}
      {(modal==='add-cat'||modal==='edit-cat') && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" style={{backdropFilter:'blur(4px)'}}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col" style={{maxHeight:'90vh'}}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add-cat'?'Add Category':'Edit Category'}</h3>
              <button onClick={()=>setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={14}/></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
              {/* Live preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl border-l-4" style={{background:catForm.color+'12', borderColor:catForm.color, borderLeft:`4px solid ${catForm.color}`, border:`1px solid ${catForm.color}25`, borderLeftWidth:4}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden" style={{background:catForm.color+'20'}}>
                  {catForm.image_url ? <img src={catForm.image_url} className="w-full h-full object-cover" alt=""/> : catForm.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{catForm.name||'Category Name'}</div>
                  <div className="text-[10px] font-mono text-gray-400">{catForm.slug||'slug'}</div>
                </div>
              </div>

              <FieldSection title="Name">
                <Row>
                  <div>
                    <FL>🇬🇧 Name (EN) *</FL>
                    <input value={catForm.name} onChange={e=>setCatForm({...catForm,name:e.target.value,slug:e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'_')})} placeholder="Writing & AI" className={inp}/>
                  </div>
                  <div>
                    <FL>🇪🇬 الاسم (AR)</FL>
                    <input value={catForm.name_ar} onChange={e=>setCatForm({...catForm,name_ar:e.target.value})} placeholder="الكتابة والذكاء" className={inp} dir="rtl"/>
                  </div>
                </Row>
                <Row>
                  <div>
                    <FL>Slug</FL>
                    <input value={catForm.slug} onChange={e=>setCatForm({...catForm,slug:e.target.value})} className={`${inp} font-mono`}/>
                  </div>
                  <div>
                    <FL>Icon (emoji)</FL>
                    <input value={catForm.icon} onChange={e=>setCatForm({...catForm,icon:e.target.value})} placeholder="✍️" className={`${inp} text-center text-xl`}/>
                  </div>
                </Row>
              </FieldSection>

              <FieldSection title="Images">
                <Row>
                  <ImageUploadInput
                    label="Image (EN)"
                    value={catForm.image_url}
                    onChange={url=>setCatForm({...catForm,image_url:url})}
                    folder="categories"
                  />
                  <ImageUploadInput
                    label="صورة (AR)"
                    value={catForm.image_url_ar}
                    onChange={url=>setCatForm({...catForm,image_url_ar:url})}
                    folder="categories"
                  />
                </Row>
              </FieldSection>

              <FieldSection title="Visual">
                <div>
                  <FL>Accent Color</FL>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_COLORS.map(c=>(
                      <button key={c} onClick={()=>setCatForm({...catForm,color:c})}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                        style={{background:c, outline:catForm.color===c?`2px solid ${c}`:'none', outlineOffset:2}}>
                        {catForm.color===c&&<Check size={10} className="text-white"/>}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="color" value={catForm.color} onChange={e=>setCatForm({...catForm,color:e.target.value})} className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 flex-shrink-0"/>
                    <input value={catForm.color} onChange={e=>setCatForm({...catForm,color:e.target.value})} className={`${inp} font-mono flex-1`}/>
                  </div>
                </div>
                <div>
                  <FL>Sort Order</FL>
                  <input type="number" value={catForm.sort_order} onChange={e=>setCatForm({...catForm,sort_order:e.target.value})} className={`${inp} max-w-[100px]`}/>
                </div>
              </FieldSection>
            </div>

            <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={saveCat} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add-cat'?'Add Category':'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          LANDING BLOCKS MODAL
      ══════════════════════════════════════════ */}
      {modal==='landing' && landingTool && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto" style={{backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-3xl my-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Landing Page — {landingTool.name}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Blocks shown below the tool description on the landing page</p>
              </div>
              <button onClick={()=>setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={14}/></button>
            </div>

            <div className="p-5 space-y-4">
              {landingBlocks.length===0 && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400">
                  No blocks yet. Add your first block below.
                </div>
              )}
              {landingBlocks.map((block, i)=>(
                <div key={block.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50/30 dark:bg-gray-800/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Block {i+1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>moveBlock(block.id,-1)} disabled={i===0} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"><ChevronUp size={13}/></button>
                      <button onClick={()=>moveBlock(block.id,1)} disabled={i===landingBlocks.length-1} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"><ChevronDown size={13}/></button>
                      <button onClick={()=>removeBlock(block.id)} className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><X size={13}/></button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Layout</label>
                    <select value={block.layout} onChange={e=>updateBlock(block.id,{layout:e.target.value as any})} className={inp}>
                      {LAYOUTS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>

                  {(block.layout==='image_left'||block.layout==='image_right'||block.layout==='image_only') && (
                    <ImageUploadInput
                      label="Image / GIF"
                      value={block.image_url||''}
                      onChange={url=>updateBlock(block.id,{image_url:url})}
                      folder="landing-blocks"
                    />
                  )}

                  {block.layout==='video' && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">YouTube URL</label>
                      <input value={block.video_url||''} onChange={e=>updateBlock(block.id,{video_url:e.target.value})} placeholder="https://youtube.com/watch?v=..." className={inp}/>
                    </div>
                  )}

                  {!['image_only','features_grid','faq'].includes(block.layout) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1 block"><Globe size={9}/>Title (EN)</label>
                        <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Section title" className={inp}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1 block"><Globe size={9}/>عنوان (AR)</label>
                        <input value={block.title_ar||''} onChange={e=>updateBlock(block.id,{title_ar:e.target.value})} placeholder="عنوان القسم" className={inp} dir="rtl"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Body (EN)</label>
                        <textarea value={block.body_en||''} onChange={e=>updateBlock(block.id,{body_en:e.target.value})} rows={3} placeholder="Description text..." className={`${inp} resize-none`}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">نص (AR)</label>
                        <textarea value={block.body_ar||''} onChange={e=>updateBlock(block.id,{body_ar:e.target.value})} rows={3} placeholder="النص بالعربي..." className={`${inp} resize-none`} dir="rtl"/>
                      </div>
                    </div>
                  )}

                  {block.layout==='features_grid' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Title (EN)</label>
                          <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Why choose us" className={inp}/>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">عنوان (AR)</label>
                          <input value={block.title_ar||''} onChange={e=>updateBlock(block.id,{title_ar:e.target.value})} placeholder="لماذا تختارنا" className={inp} dir="rtl"/>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">Feature Items</label>
                        {(block.features||[]).map((f,fi)=>(
                          <div key={fi} className="flex items-center gap-2 mb-2">
                            <input value={f.icon} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,icon:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="⚡" className={`${inp} w-14 text-center text-lg`}/>
                            <input value={f.en} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,en:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="Feature EN" className={`${inp} flex-1`}/>
                            <input value={f.ar} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,ar:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="ميزة AR" className={`${inp} flex-1`} dir="rtl"/>
                            <button onClick={()=>{ const fs=(block.features||[]).filter((_,j)=>j!==fi); updateBlock(block.id,{features:fs}) }} className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0 transition-colors"><X size={12}/></button>
                          </div>
                        ))}
                        <button onClick={()=>updateBlock(block.id,{features:[...(block.features||[]),{icon:'⭐',en:'',ar:''}]})}
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Plus size={11}/>Add Feature</button>
                      </div>
                    </div>
                  )}

                  {block.layout==='faq' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Section Title (EN)</label>
                        <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Frequently Asked Questions" className={inp}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 block">FAQ Items</label>
                        {(block.faqs||[]).map((faq,fi)=>(
                          <div key={fi} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 space-y-2 bg-white dark:bg-gray-800/50">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-400">Q{fi+1}</span>
                              <button onClick={()=>{ const fs=(block.faqs||[]).filter((_,j)=>j!==fi); updateBlock(block.id,{faqs:fs}) }} className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><X size={10}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={faq.q_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_en:e.target.value}; updateBlock(block.id,{faqs:fs}) }} placeholder="Question EN" className={inp}/>
                              <input value={faq.q_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_ar:e.target.value}; updateBlock(block.id,{faqs:fs}) }} placeholder="السؤال AR" className={inp} dir="rtl"/>
                              <textarea value={faq.a_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_en:e.target.value}; updateBlock(block.id,{faqs:fs}) }} rows={2} placeholder="Answer EN" className={`${inp} resize-none`}/>
                              <textarea value={faq.a_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_ar:e.target.value}; updateBlock(block.id,{faqs:fs}) }} rows={2} placeholder="الإجابة AR" className={`${inp} resize-none`} dir="rtl"/>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>updateBlock(block.id,{faqs:[...(block.faqs||[]),{q_en:'',q_ar:'',a_en:'',a_ar:''}]})}
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Plus size={11}/>Add Question</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addBlock}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2">
                <Plus size={14}/>Add Block
              </button>
            </div>

            <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={saveLandingBlocks} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>Save Landing Page</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DELETE CONFIRM
      ══════════════════════════════════════════ */}
      {delItem && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" style={{backdropFilter:'blur(4px)'}}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500"/>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Delete {delType==='tool'?'Tool':'Category'}?</h3>
            <p className="text-xs text-gray-400 mb-6"><span className="font-semibold text-gray-700 dark:text-gray-300">{delItem.name}</span> will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={()=>setDel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={del} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
