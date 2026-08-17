'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Pencil, Trash2, Copy, X, Check, AlertCircle, ToggleLeft, ToggleRight, Star, Package, Tag, Layout, ChevronUp, ChevronDown, MessageCircle, ThumbsUp, ThumbsDown, Globe2 } from 'lucide-react'
import { v4 as uuid } from 'uuid'

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
interface Review {
  id: string; tool_id: string; member_name: string; stars: number
  comment?: string; approved: boolean; created_at: string
  shop_tools?: { name: string }
}

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

function StarRow({ n }: { n: number }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i=><Star key={i} size={12} fill={i<=n?'#F59E0B':'none'} stroke={i<=n?'#F59E0B':'#D1D5DB'}/>)}</div>
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"
const SHOP_CATS = ['shared','private','bundle']
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

export default function ShopAdminPage() {
  const [tab,      setTab]      = useState<'tools'|'categories'|'reviews'>('tools')
  const [tools,    setTools]    = useState<Tool[]>([])
  const [cats,     setCats]     = useState<Category[]>([])
  const [reviews,  setReviews]  = useState<Review[]>([])
  const [revLoad,  setRevLoad]  = useState(false)
  const [toolCat,  setToolCat]  = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'add-tool'|'edit-tool'|'add-cat'|'edit-cat'|'landing'|null>(null)
  const [editItem, setEdit]     = useState<any>(null)
  const [toast,    setToast]    = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving,   setSaving]   = useState(false)
  const [delItem,  setDel]      = useState<any>(null)
  const [delType,  setDelType]  = useState<'tool'|'cat'>('tool')

  // Landing blocks state
  const [landingTool,   setLandingTool]   = useState<Tool|null>(null)
  const [landingBlocks, setLandingBlocks] = useState<LandingBlock[]>([])

  // Tool form
  const emptyTool = { name:'',description:'',image_url:'',category_slug:'shared',category_id:'',price_egp:'',price_usd:'',retail_price_egp:'',duration_label:'28 Days',duration_days:'28',delivery_label:'INSTANT',rating:'5.0',review_count:'0',video_url:'',features:'',sort_order:'0',is_out_of_stock:false,details_url:'' }
  const [toolForm, setToolForm] = useState(emptyTool)

  // Category form
  const emptyCat = { name:'', name_ar:'', slug:'', color:'#3B82F6', icon:'🔧', image_url:'', sort_order:'0' }
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

  const loadReviews = useCallback(async()=>{
    setRevLoad(true)
    const res = await fetch('/api/admin/reviews')
    const d   = await res.json()
    setReviews(d.reviews||[])
    setRevLoad(false)
  },[])

  useEffect(()=>{load()},[load])
  useEffect(()=>{ if(tab==='reviews') loadReviews() },[tab,loadReviews])

  // ── Tool CRUD ──
  const openAddTool  = ()=>{ setToolForm(emptyTool); setEdit(null); setModal('add-tool') }
  const openEditTool = (t:Tool)=>{
    setToolForm({name:t.name,description:t.description||'',image_url:t.image_url||'',category_slug:t.category_slug,category_id:t.category_id||'',price_egp:String(t.price_egp),price_usd:String(t.price_usd||''),retail_price_egp:String(t.retail_price_egp||''),duration_label:t.duration_label,duration_days:String(t.duration_days),delivery_label:t.delivery_label,rating:String(t.rating),review_count:String(t.review_count),video_url:t.video_url||'',features:(t.features||[]).join('\n'),sort_order:String(t.sort_order),is_out_of_stock:t.is_out_of_stock,details_url:(t as any).details_url||''})
    setEdit(t); setModal('edit-tool')
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
      name:toolForm.name, description:toolForm.description||null, image_url:toolForm.image_url||null,
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
    }
    const res = editItem
      ? await supabase.from('shop_tools').update(payload).eq('id',editItem.id)
      : await supabase.from('shop_tools').insert(payload)
    setSaving(false)
    if(res.error){setToast({msg:res.error.message,type:'err'});return}
    setToast({msg:editItem?'Tool updated':'Tool added',type:'ok'})
    setModal(null); load()
  }

  const toggleTool = async(t:Tool, field:'is_active'|'is_out_of_stock')=>{
    await supabase.from('shop_tools').update({[field]:!t[field]}).eq('id',t.id)
    setToast({msg:'Updated',type:'ok'}); load()
  }

  // ── Landing Blocks ──
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

  const removeBlock = (id:string)=>{
    setLandingBlocks(b=>b.filter(bl=>bl.id!==id))
  }

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

  // ── Category CRUD ──
  const openAddCat  = ()=>{ setCatForm(emptyCat); setEdit(null); setModal('add-cat') }
  const openEditCat = (c:Category)=>{
    setCatForm({name:c.name,name_ar:(c as any).name_ar||'',slug:c.slug,color:c.color,icon:c.icon,image_url:(c as any).image_url||'',sort_order:String(c.sort_order)})
    setEdit(c); setModal('edit-cat')
  }

  const saveCat = async()=>{
    if(!catForm.name) return
    setSaving(true)
    const slug = catForm.slug||catForm.name.toLowerCase().replace(/[^a-z0-9]/g,'_')
    const payload = {name:catForm.name,name_ar:catForm.name_ar||null,slug,color:catForm.color,icon:catForm.icon,image_url:catForm.image_url||null,sort_order:parseInt(catForm.sort_order)||0}
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

  // ── Reviews ──
  const approveReview = async(id:string, approved:boolean)=>{
    await fetch(`/api/admin/reviews/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({approved})})
    setToast({msg:approved?'Approved ✓':'Hidden',type:'ok'})
    loadReviews()
  }
  const deleteReview = async(id:string)=>{
    await fetch(`/api/admin/reviews/${id}`,{method:'DELETE'})
    setToast({msg:'Deleted',type:'ok'})
    loadReviews()
  }

  const filtered = toolCat==='all'?tools:tools.filter(t=>t.category_slug===toolCat)
  const counts:any={}; SHOP_CATS.forEach(c=>{counts[c]=tools.filter(t=>t.category_slug===c).length})
  const catName = (id?:string) => cats.find(c=>c.id===id)?.name||'—'
  const pendingReviews = reviews.filter(r=>!r.approved).length

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Shop Manager" subtitle="Manage tools, categories & reviews"/>

        {/* Top tabs */}
        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={()=>setTab('tools')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='tools'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              <Package size={12}/>Tools ({tools.length})
            </button>
            <button onClick={()=>setTab('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='categories'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              <Tag size={12}/>Categories ({cats.length})
            </button>
            <button onClick={()=>setTab('reviews')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab==='reviews'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
              <MessageCircle size={12}/>Reviews
              {pendingReviews>0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-red-500">{pendingReviews}</span>}
            </button>
          </div>

          {tab==='tools' ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {[['all','All'],['shared','Shared'],['private','Private'],['bundle','Bundle']].map(([id,label])=>(
                  <button key={id} onClick={()=>setToolCat(id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${toolCat===id?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500'}`}>
                    {label}{id!=='all'?` (${counts[id]||0})`:''}
                  </button>
                ))}
              </div>
              <button onClick={openAddTool} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
                <Plus size={13}/>Add Tool
              </button>
            </div>
          ) : tab==='categories' ? (
            <button onClick={openAddCat} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
              <Plus size={13}/>Add Category
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-auto p-5">

          {/* ── Tools table ── */}
          {tab==='tools' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {['Tool','Shop Type','Category','Price','Rating','Landing','Status','Actions'].map(h=>(
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading&&<tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">Loading...</td></tr>}
                  {!loading&&filtered.length===0&&(
                    <tr><td colSpan={8} className="text-center py-12">
                      <Package size={28} className="text-gray-200 mx-auto mb-3"/>
                      <p className="text-sm text-gray-400 mb-3">No tools yet</p>
                      <button onClick={openAddTool} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600">
                        <Plus size={12}/>Add First Tool
                      </button>
                    </td></tr>
                  )}
                  {filtered.map(t=>{
                    const CAT_COLORS:any={shared:'#3B82F6',private:'#8B5CF6',bundle:'#F59E0B'}
                    const hasLanding = Array.isArray(t.landing_blocks) && t.landing_blocks.length > 0
                    return (
                      <tr key={t.id} className={`border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${!t.is_active?'opacity-50':''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {t.image_url?<img src={t.image_url} alt={t.name} className="w-7 h-7 object-contain"/>:<span className="text-[10px] font-bold text-gray-400">{t.name.slice(0,2).toUpperCase()}</span>}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{t.name}</div>
                              <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{t.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{background:CAT_COLORS[t.category_slug]+'20',color:CAT_COLORS[t.category_slug]}}>
                            {t.category_slug}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {t.category_id ? (
                            <div className="flex items-center gap-1.5">
                              <span>{cats.find(c=>c.id===t.category_id)?.icon}</span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">{catName(t.category_id)}</span>
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{Number(t.price_egp).toLocaleString()} EGP</div>
                          {t.price_usd&&<div className="text-[10px] text-gray-400">${t.price_usd}</div>}
                          <div className="text-[10px] text-gray-400">/{t.duration_label}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star size={11} fill="#F59E0B" stroke="#F59E0B"/>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t.rating}</span>
                            <span className="text-[10px] text-gray-400">({t.review_count})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={()=>openLanding(t)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${hasLanding?'bg-emerald-50 text-emerald-600 border border-emerald-200':'bg-gray-50 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-500'}`}>
                            <Layout size={10}/>{hasLanding?`${t.landing_blocks!.length} blocks`:'+ Add'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <button onClick={()=>toggleTool(t,'is_active')} className="flex items-center gap-1">
                              {t.is_active?<ToggleRight size={18} className="text-emerald-500"/>:<ToggleLeft size={18} className="text-gray-300"/>}
                              <span className="text-[10px] text-gray-500">{t.is_active?'Active':'Off'}</span>
                            </button>
                            <button onClick={()=>toggleTool(t,'is_out_of_stock')} className="flex items-center gap-1">
                              {t.is_out_of_stock?<ToggleRight size={18} className="text-red-500"/>:<ToggleLeft size={18} className="text-gray-300"/>}
                              <span className="text-[10px] text-gray-500">{t.is_out_of_stock?'OOS':'In Stock'}</span>
                            </button>
                          </div>
                        </td>
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

          {/* ── Categories grid ── */}
          {tab==='categories' && (
            <div className="grid grid-cols-4 gap-4">
              {loading&&<div className="col-span-4 flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
              {cats.map(c=>{
                const toolCount = tools.filter(t=>t.category_id===c.id).length
                return (
                  <div key={c.id} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden ${!c.is_active?'opacity-60':''}`}>
                    <div className="h-1.5" style={{background:c.color}}/>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden" style={{background:c.color+'15'}}>
                          {(c as any).image_url ? <img src={(c as any).image_url} className="w-full h-full object-cover" alt=""/> : c.icon}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>openEditCat(c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={12}/></button>
                          <button onClick={()=>{setDel(c);setDelType('cat')}} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12}/></button>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">{c.name}</div>
                      {(c as any).name_ar && <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5" dir="rtl">{(c as any).name_ar}</div>}
                      <div className="text-[10px] font-mono text-gray-400 mb-3">{c.slug}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400"><span className="font-bold text-gray-700 dark:text-gray-300">{toolCount}</span> tools</span>
                        <button onClick={()=>toggleCat(c)}>{c.is_active?<ToggleRight size={20} style={{color:c.color}}/>:<ToggleLeft size={20} className="text-gray-300"/>}</button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {!loading&&cats.length===0&&(
                <div className="col-span-4 text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                  <Tag size={28} className="text-gray-200 mx-auto mb-3"/>
                  <p className="text-sm text-gray-400 mb-3">No categories yet</p>
                  <button onClick={openAddCat} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600"><Plus size={12}/>Add Category</button>
                </div>
              )}
            </div>
          )}

          {/* ── Reviews tab ── */}
          {tab==='reviews' && (
            <div className="space-y-4">
              {revLoad && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
              {!revLoad && reviews.length===0 && (
                <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm text-gray-400">
                  <MessageCircle size={28} className="text-gray-200 mx-auto mb-3"/>No reviews yet
                </div>
              )}
              {!revLoad && reviews.map(r=>(
                <div key={r.id} className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-start gap-4 ${!r.approved?'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10':'border-gray-100 dark:border-gray-800'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{r.member_name}</span>
                      <StarRow n={r.stars}/>
                      {!r.approved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
                      {r.approved  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Approved</span>}
                      <span className="text-[10px] text-gray-400 ms-auto">{r.shop_tools?.name}</span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">{r.comment}</p>}
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5">{new Date(r.created_at).toLocaleString('en-GB')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!r.approved && (
                      <button onClick={()=>approveReview(r.id,true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors">
                        <ThumbsUp size={12}/>Approve
                      </button>
                    )}
                    {r.approved && (
                      <button onClick={()=>approveReview(r.id,false)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-colors">
                        <ThumbsDown size={12}/>Hide
                      </button>
                    )}
                    <button onClick={()=>deleteReview(r.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Landing Blocks Modal ── */}
      {modal==='landing' && landingTool && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl shadow-2xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Landing Page — {landingTool.name}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Blocks show below the tool description on the landing page</p>
              </div>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>

            <div className="p-5 space-y-4">
              {landingBlocks.length===0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400">
                  No blocks yet. Add your first block below.
                </div>
              )}

              {landingBlocks.map((block, i)=>(
                <div key={block.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                  {/* Block header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Block {i+1}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>moveBlock(block.id,-1)} disabled={i===0} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={13}/></button>
                      <button onClick={()=>moveBlock(block.id,1)} disabled={i===landingBlocks.length-1} className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={13}/></button>
                      <button onClick={()=>removeBlock(block.id)} className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50"><X size={13}/></button>
                    </div>
                  </div>

                  {/* Layout picker */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Layout</label>
                    <select value={block.layout} onChange={e=>updateBlock(block.id,{layout:e.target.value as any})} className={inp}>
                      {LAYOUTS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>

                  {/* Image URL */}
                  {(block.layout==='image_left'||block.layout==='image_right'||block.layout==='image_only') && (
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Image / GIF URL</label>
                      <input value={block.image_url||''} onChange={e=>updateBlock(block.id,{image_url:e.target.value})} placeholder="https://..." className={inp}/>
                      {block.image_url && <img src={block.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover border border-gray-100 dark:border-gray-700"/>}
                    </div>
                  )}

                  {/* Video URL */}
                  {block.layout==='video' && (
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">YouTube URL</label>
                      <input value={block.video_url||''} onChange={e=>updateBlock(block.id,{video_url:e.target.value})} placeholder="https://youtube.com/watch?v=..." className={inp}/>
                    </div>
                  )}

                  {/* Title + Body (most layouts) */}
                  {!['image_only','features_grid','faq'].includes(block.layout) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 flex items-center gap-1 block"><Globe2 size={9}/>Title (EN)</label>
                        <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Section title" className={inp}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 flex items-center gap-1 block"><Globe2 size={9}/>عنوان (AR)</label>
                        <input value={block.title_ar||''} onChange={e=>updateBlock(block.id,{title_ar:e.target.value})} placeholder="عنوان القسم" className={inp+" text-right"} dir="rtl"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Body (EN)</label>
                        <textarea value={block.body_en||''} onChange={e=>updateBlock(block.id,{body_en:e.target.value})} rows={3} placeholder="Description text..." className={inp+" resize-none"}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">نص (AR)</label>
                        <textarea value={block.body_ar||''} onChange={e=>updateBlock(block.id,{body_ar:e.target.value})} rows={3} placeholder="النص بالعربي..." className={inp+" resize-none text-right"} dir="rtl"/>
                      </div>
                    </div>
                  )}

                  {/* Features Grid */}
                  {block.layout==='features_grid' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Title (EN)</label>
                          <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Why choose us" className={inp}/>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">عنوان (AR)</label>
                          <input value={block.title_ar||''} onChange={e=>updateBlock(block.id,{title_ar:e.target.value})} placeholder="لماذا تختارنا" className={inp+" text-right"} dir="rtl"/>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-2 block">Feature Items</label>
                        {(block.features||[]).map((f,fi)=>(
                          <div key={fi} className="flex items-center gap-2 mb-2">
                            <input value={f.icon} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,icon:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="⚡" className={inp+" w-14 text-center text-lg"}/>
                            <input value={f.en} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,en:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="Feature EN" className={inp+" flex-1"}/>
                            <input value={f.ar} onChange={e=>{ const fs=[...(block.features||[])]; fs[fi]={...f,ar:e.target.value}; updateBlock(block.id,{features:fs}) }} placeholder="ميزة AR" className={inp+" flex-1 text-right"} dir="rtl"/>
                            <button onClick={()=>{ const fs=(block.features||[]).filter((_,j)=>j!==fi); updateBlock(block.id,{features:fs}) }} className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-50 flex-shrink-0"><X size={12}/></button>
                          </div>
                        ))}
                        <button onClick={()=>updateBlock(block.id,{features:[...(block.features||[]),{icon:'⭐',en:'',ar:''}]})}
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"><Plus size={11}/>Add Feature</button>
                      </div>
                    </div>
                  )}

                  {/* FAQ */}
                  {block.layout==='faq' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Section Title (EN)</label>
                        <input value={block.title_en||''} onChange={e=>updateBlock(block.id,{title_en:e.target.value})} placeholder="Frequently Asked Questions" className={inp}/>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-gray-400 mb-2 block">FAQ Items</label>
                        {(block.faqs||[]).map((faq,fi)=>(
                          <div key={fi} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-2 space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-gray-400">Q{fi+1}</span>
                              <button onClick={()=>{ const fs=(block.faqs||[]).filter((_,j)=>j!==fi); updateBlock(block.id,{faqs:fs}) }} className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-50"><X size={10}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={faq.q_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_en:e.target.value}; updateBlock(block.id,{faqs:fs}) }} placeholder="Question EN" className={inp}/>
                              <input value={faq.q_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,q_ar:e.target.value}; updateBlock(block.id,{faqs:fs}) }} placeholder="السؤال AR" className={inp+" text-right"} dir="rtl"/>
                              <textarea value={faq.a_en} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_en:e.target.value}; updateBlock(block.id,{faqs:fs}) }} rows={2} placeholder="Answer EN" className={inp+" resize-none"}/>
                              <textarea value={faq.a_ar} onChange={e=>{ const fs=[...(block.faqs||[])]; fs[fi]={...faq,a_ar:e.target.value}; updateBlock(block.id,{faqs:fs}) }} rows={2} placeholder="الإجابة AR" className={inp+" resize-none text-right"} dir="rtl"/>
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

            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={saveLandingBlocks} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>Save Landing Page</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Tool Modal ── */}
      {(modal==='add-tool'||modal==='edit-tool') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add-tool'?'Add Tool':'Edit Tool'}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Tool Name *</label>
                <input value={toolForm.name} onChange={e=>setToolForm({...toolForm,name:e.target.value})} placeholder="QuillBot Premium - Lite" className={inp}/>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Description</label>
                <textarea value={toolForm.description} onChange={e=>setToolForm({...toolForm,description:e.target.value})} className={inp+" resize-none h-16"}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Shop Type</label>
                <select value={toolForm.category_slug} onChange={e=>setToolForm({...toolForm,category_slug:e.target.value})} className={inp+" cursor-pointer"}>
                  {SHOP_CATS.map(c=><option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Category (للفلتر)</label>
                <select value={toolForm.category_id} onChange={e=>setToolForm({...toolForm,category_id:e.target.value})} className={inp+" cursor-pointer"}>
                  <option value="">— No category —</option>
                  {cats.filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Image URL</label>
                <input value={toolForm.image_url} onChange={e=>setToolForm({...toolForm,image_url:e.target.value})} placeholder="https://..." className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Video URL (YouTube)</label>
                <input value={toolForm.video_url} onChange={e=>setToolForm({...toolForm,video_url:e.target.value})} placeholder="https://youtube.com/watch?v=..." className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Price EGP *</label>
                <input type="number" value={toolForm.price_egp} onChange={e=>setToolForm({...toolForm,price_egp:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Price USD</label>
                <input type="number" value={toolForm.price_usd} onChange={e=>setToolForm({...toolForm,price_usd:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Retail Price EGP</label>
                <input type="number" value={toolForm.retail_price_egp} onChange={e=>setToolForm({...toolForm,retail_price_egp:e.target.value})} placeholder="0" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Duration Label</label>
                <input value={toolForm.duration_label} onChange={e=>setToolForm({...toolForm,duration_label:e.target.value})} placeholder="28 Days" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Duration (days)</label>
                <input type="number" value={toolForm.duration_days} onChange={e=>setToolForm({...toolForm,duration_days:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Delivery Label</label>
                <input value={toolForm.delivery_label} onChange={e=>setToolForm({...toolForm,delivery_label:e.target.value})} placeholder="INSTANT" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Sort Order</label>
                <input type="number" value={toolForm.sort_order} onChange={e=>setToolForm({...toolForm,sort_order:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Rating (0-5)</label>
                <input type="number" step="0.1" min="0" max="5" value={toolForm.rating} onChange={e=>setToolForm({...toolForm,rating:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Review Count</label>
                <input type="number" value={toolForm.review_count} onChange={e=>setToolForm({...toolForm,review_count:e.target.value})} className={inp}/>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Features (سطر لكل feature)</label>
                <textarea value={toolForm.features} onChange={e=>setToolForm({...toolForm,features:e.target.value})}
                  placeholder={"10 daily downloads\nUnlimited licenses"} className={inp+" resize-none h-20"}/>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Details URL (رابط صفحة التفاصيل)</label>
                <input value={toolForm.details_url} onChange={e=>setToolForm({...toolForm,details_url:e.target.value})} placeholder="https://claude.ai — يظهر في صفحة تفاصيل المنتج" className={inp}/>
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={toolForm.is_out_of_stock} onChange={e=>setToolForm({...toolForm,is_out_of_stock:e.target.checked})} className="rounded"/>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={saveTool} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add-tool'?'Add Tool':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Category Modal ── */}
      {(modal==='add-cat'||modal==='edit-cat') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add-cat'?'Add Category':'Edit Category'}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:catForm.color+'15',border:`1px solid ${catForm.color}30`}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden" style={{background:catForm.color+'20'}}>
                  {catForm.image_url ? <img src={catForm.image_url} className="w-full h-full object-cover" alt=""/> : catForm.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{catForm.name||'Category Name'}</div>
                  <div className="text-[10px] font-mono text-gray-400">{catForm.slug||'slug'}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Name (EN) *</label>
                  <input value={catForm.name} onChange={e=>setCatForm({...catForm,name:e.target.value,slug:e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'_')})} placeholder="Writing & AI" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Icon</label>
                  <input value={catForm.icon} onChange={e=>setCatForm({...catForm,icon:e.target.value})} placeholder="✍️" className={inp+" text-center text-xl"}/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">الاسم بالعربي</label>
                <input value={catForm.name_ar} onChange={e=>setCatForm({...catForm,name_ar:e.target.value})} placeholder="الكتابة والذكاء الاصطناعي" className={inp} dir="rtl"/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Category Image URL</label>
                <input value={catForm.image_url} onChange={e=>setCatForm({...catForm,image_url:e.target.value})} placeholder="https://..." className={inp}/>
                {catForm.image_url && (
                  <div className="mt-2 w-full h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={catForm.image_url} className="w-full h-full object-cover" alt="preview"/>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Slug</label>
                <input value={catForm.slug} onChange={e=>setCatForm({...catForm,slug:e.target.value})} className={inp+" font-mono"}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map(c=>(
                    <button key={c} onClick={()=>setCatForm({...catForm,color:c})}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{background:c,outline:catForm.color===c?`2px solid ${c}`:'none',outlineOffset:2}}>
                      {catForm.color===c&&<Check size={12} className="text-white"/>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="color" value={catForm.color} onChange={e=>setCatForm({...catForm,color:e.target.value})} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                  <input value={catForm.color} onChange={e=>setCatForm({...catForm,color:e.target.value})} className={inp+" flex-1 font-mono"}/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Sort Order</label>
                <input type="number" value={catForm.sort_order} onChange={e=>setCatForm({...catForm,sort_order:e.target.value})} className={inp}/>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={saveCat} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add-cat'?'Add':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><Trash2 size={18} className="text-red-500"/></div>
            <h3 className="font-bold text-center mb-1">Delete {delType==='tool'?'Tool':'Category'}?</h3>
            <p className="text-xs text-center text-gray-400 mb-5"><span className="font-semibold text-gray-700 dark:text-gray-300">{delItem.name}</span></p>
            <div className="flex gap-2">
              <button onClick={()=>setDel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={del} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
