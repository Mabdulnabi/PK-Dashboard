'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Pencil, Trash2, X, Check, AlertCircle, ToggleLeft, ToggleRight, Star, Package, Tag } from 'lucide-react'

interface Category { id:string; name:string; slug:string; color:string; icon:string; sort_order:number; is_active:boolean }
interface Tool {
  id:string; name:string; description:string; image_url?:string
  category_slug:string; category_id?:string; price_egp:number; price_usd?:number; retail_price_egp?:number
  duration_label:string; duration_days:number; delivery_label:string
  rating:number; review_count:number; video_url?:string
  features:string[]; is_active:boolean; is_out_of_stock:boolean; sort_order:number
}

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

const inp = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"
const SHOP_CATS = ['shared','private','bundle']
const PRESET_COLORS = ['#3B82F6','#8B5CF6','#EC4899','#EF4444','#F59E0B','#10B981','#06B6D4','#6B7280','#F97316','#14B8A6']

export default function ShopAdminPage() {
  const [tab,      setTab]      = useState<'tools'|'categories'>('tools')
  const [tools,    setTools]    = useState<Tool[]>([])
  const [cats,     setCats]     = useState<Category[]>([])
  const [toolCat,  setToolCat]  = useState('all')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'add-tool'|'edit-tool'|'add-cat'|'edit-cat'|null>(null)
  const [editItem, setEdit]     = useState<any>(null)
  const [toast,    setToast]    = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving,   setSaving]   = useState(false)
  const [delItem,  setDel]      = useState<any>(null)
  const [delType,  setDelType]  = useState<'tool'|'cat'>('tool')

  // Tool form
  const emptyTool = { name:'',description:'',image_url:'',category_slug:'shared',category_id:'',price_egp:'',price_usd:'',retail_price_egp:'',duration_label:'28 Days',duration_days:'28',delivery_label:'INSTANT',rating:'5.0',review_count:'0',video_url:'',features:'',sort_order:'0',is_out_of_stock:false }
  const [toolForm, setToolForm] = useState(emptyTool)

  // Category form
  const emptyCat = { name:'', slug:'', color:'#3B82F6', icon:'🔧', sort_order:'0' }
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

  // ── Tool CRUD ──
  const openAddTool  = ()=>{ setToolForm(emptyTool); setEdit(null); setModal('add-tool') }
  const openEditTool = (t:Tool)=>{
    setToolForm({name:t.name,description:t.description||'',image_url:t.image_url||'',category_slug:t.category_slug,category_id:t.category_id||'',price_egp:String(t.price_egp),price_usd:String(t.price_usd||''),retail_price_egp:String(t.retail_price_egp||''),duration_label:t.duration_label,duration_days:String(t.duration_days),delivery_label:t.delivery_label,rating:String(t.rating),review_count:String(t.review_count),video_url:t.video_url||'',features:(t.features||[]).join('\n'),sort_order:String(t.sort_order),is_out_of_stock:t.is_out_of_stock})
    setEdit(t); setModal('edit-tool')
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

  // ── Category CRUD ──
  const openAddCat  = ()=>{ setCatForm(emptyCat); setEdit(null); setModal('add-cat') }
  const openEditCat = (c:Category)=>{
    setCatForm({name:c.name,slug:c.slug,color:c.color,icon:c.icon,sort_order:String(c.sort_order)})
    setEdit(c); setModal('edit-cat')
  }

  const saveCat = async()=>{
    if(!catForm.name) return
    setSaving(true)
    const slug = catForm.slug||catForm.name.toLowerCase().replace(/[^a-z0-9]/g,'_')
    const payload = {name:catForm.name,slug,color:catForm.color,icon:catForm.icon,sort_order:parseInt(catForm.sort_order)||0}
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

  // Get category name from id
  const catName = (id?:string) => cats.find(c=>c.id===id)?.name||'—'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Shop Manager" subtitle="Manage tools & categories shown in user dashboard"/>

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
          </div>

          {tab==='tools' ? (
            <div className="flex items-center gap-2">
              {/* Filter by shop category */}
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
          ) : (
            <button onClick={openAddCat} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
              <Plus size={13}/>Add Category
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5">

          {/* ── Tools table ── */}
          {tab==='tools' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {['Tool','Shop Type','Category','Price','Rating','Status','Actions'].map(h=>(
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading&&<tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">Loading...</td></tr>}
                  {!loading&&filtered.length===0&&(
                    <tr><td colSpan={7} className="text-center py-12">
                      <Package size={28} className="text-gray-200 mx-auto mb-3"/>
                      <p className="text-sm text-gray-400 mb-3">No tools yet</p>
                      <button onClick={openAddTool} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600">
                        <Plus size={12}/>Add First Tool
                      </button>
                    </td></tr>
                  )}
                  {filtered.map(t=>{
                    const CAT_COLORS:any={shared:'#3B82F6',private:'#8B5CF6',bundle:'#F59E0B'}
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
                            <button onClick={()=>openEditTool(t)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={12}/></button>
                            <button onClick={()=>{setDel(t);setDelType('tool')}} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12}/></button>
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
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:c.color+'15'}}>
                          {c.icon}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={()=>openEditCat(c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={12}/></button>
                          <button onClick={()=>{setDel(c);setDelType('cat')}} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12}/></button>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">{c.name}</div>
                      <div className="text-[10px] font-mono text-gray-400 mb-3">{c.slug}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400"><span className="font-bold text-gray-700 dark:text-gray-300">{toolCount}</span> tools</span>
                        <button onClick={()=>toggleCat(c)}>
                          {c.is_active?<ToggleRight size={20} style={{color:c.color}}/>:<ToggleLeft size={20} className="text-gray-300"/>}
                        </button>
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
        </div>
      </main>

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
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Shop Type (shared/private/bundle)</label>
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
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Retail Price EGP <span className="text-gray-500 normal-case">(original market price)</span></label>
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
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:catForm.color+'15',border:`1px solid ${catForm.color}30`}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:catForm.color+'20'}}>{catForm.icon}</div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{catForm.name||'Category Name'}</div>
                  <div className="text-[10px] font-mono text-gray-400">{catForm.slug||'slug'}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Name *</label>
                  <input value={catForm.name} onChange={e=>setCatForm({...catForm,name:e.target.value,slug:e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'_')})} placeholder="Writing & AI" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Icon</label>
                  <input value={catForm.icon} onChange={e=>setCatForm({...catForm,icon:e.target.value})} placeholder="✍️" className={inp+" text-center text-xl"}/>
                </div>
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
