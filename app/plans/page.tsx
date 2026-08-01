'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Pencil, Trash2, X, Check, AlertCircle, ToggleLeft, ToggleRight, Package, Star } from 'lucide-react'

interface Tool { id:string; name:string; image_url?:string; category_slug:string }
interface Bundle {
  id:string; name:string; name_ar?:string; slug:string
  price_egp:number; duration_days:number; description?:string
  features:string[]; badge?:string; highlight?:boolean; image_url?:string
  tool_ids:string[]; is_active:boolean; sort_order:number
}

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 transition-all"

export default function BundlesPage() {
  const [bundles,  setBundles]  = useState<Bundle[]>([])
  const [tools,    setTools]    = useState<Tool[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'add'|'edit'|null>(null)
  const [editItem, setEdit]     = useState<Bundle|null>(null)
  const [toast,    setToast]    = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving,   setSaving]   = useState(false)
  const [delItem,  setDel]      = useState<Bundle|null>(null)

  const empty = { name:'', name_ar:'', slug:'', price_egp:'', duration_days:'30', description:'', features:'', badge:'', highlight:false, image_url:'', tool_ids:[] as string[], sort_order:'0' }
  const [form, setForm] = useState(empty)

  const load = useCallback(async()=>{
    const [bRes, tRes] = await Promise.all([
      supabase.from('membership_plans').select('*').order('sort_order'),
      supabase.from('shop_tools').select('id,name,image_url,category_slug').eq('is_active',true).eq('category_slug','shared').order('sort_order'),
    ])
    if(bRes.data) setBundles(bRes.data)
    if(tRes.data) setTools(tRes.data)
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  const openAdd  = ()=>{ setForm(empty); setEdit(null); setModal('add') }
  const openEdit = (b:Bundle)=>{
    setForm({
      name:b.name, name_ar:b.name_ar||'', slug:b.slug,
      price_egp:String(b.price_egp), duration_days:String(b.duration_days),
      description:b.description||'', features:(b.features||[]).join('\n'),
      badge:b.badge||'', highlight:b.highlight||false, image_url:b.image_url||'',
      tool_ids:b.tool_ids||[], sort_order:String(b.sort_order),
    })
    setEdit(b); setModal('edit')
  }

  const toggleTool = (id:string) => {
    setForm(f=>({
      ...f,
      tool_ids: f.tool_ids.includes(id) ? f.tool_ids.filter(x=>x!==id) : [...f.tool_ids, id]
    }))
  }

  const save = async()=>{
    if(!form.name||!form.price_egp) return
    setSaving(true)
    const payload = {
      name:form.name, name_ar:form.name_ar||null,
      slug:form.slug||form.name.toLowerCase().replace(/\s+/g,'_'),
      price_egp:parseFloat(form.price_egp), duration_days:parseInt(form.duration_days)||30,
      description:form.description||null, sort_order:parseInt(form.sort_order)||0,
      features:form.features.split('\n').map(f=>f.trim()).filter(Boolean),
      badge:form.badge||null, highlight:form.highlight,
      image_url:form.image_url||null, tool_ids:form.tool_ids,
    }
    const res = editItem
      ? await supabase.from('membership_plans').update(payload).eq('id',editItem.id)
      : await supabase.from('membership_plans').insert(payload)
    setSaving(false)
    if(res.error){setToast({msg:res.error.message,type:'err'});return}
    setToast({msg:editItem?'Bundle updated':'Bundle added',type:'ok'})
    setModal(null); load()
  }

  const toggle = async(b:Bundle)=>{
    await supabase.from('membership_plans').update({is_active:!b.is_active}).eq('id',b.id)
    setToast({msg:b.is_active?'Deactivated':'Activated',type:'ok'}); load()
  }

  const del = async()=>{
    if(!delItem) return
    const res = await supabase.from('membership_plans').delete().eq('id',delItem.id)
    if(res.error){setToast({msg:'Cannot delete',type:'err'});setDel(null);return}
    setToast({msg:'Deleted',type:'ok'}); setDel(null); load()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Bundle Tools" subtitle="Curated tool packages shown in the Bundle tab" onAdd={openAdd} addLabel="New Bundle"/>
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && <div className="col-span-3 flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
            {bundles.map(b => {
              const included = (b.tool_ids||[]).map(id=>tools.find(t=>t.id===id)).filter(Boolean) as Tool[]
              return (
                <div key={b.id} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden relative ${!b.is_active?'opacity-60':''}`}>
                  {b.highlight && (
                    <div className="absolute top-2 end-2 z-10">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-black" style={{background:'linear-gradient(90deg,#d99401,#f59e0b)'}}>
                        <Star size={9} fill="black"/>Featured
                      </span>
                    </div>
                  )}
                  <div className="h-1" style={{background:'linear-gradient(90deg,#d99401,#f59e0b)'}}/>
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        {b.image_url
                          ? <img src={b.image_url} className="w-full h-full object-cover" alt=""/>
                          : <Package size={18} className="text-gray-300"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 pe-12">{b.name}</div>
                        {b.name_ar && <div className="text-xs text-gray-500 dark:text-gray-400" dir="rtl">{b.name_ar}</div>}
                        <div className="text-[10px] font-mono text-gray-400">{b.slug}</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={()=>openEdit(b)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={12}/></button>
                        <button onClick={()=>setDel(b)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12}/></button>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                      {b.price_egp.toLocaleString()} <span className="text-xs font-normal text-gray-400">EGP</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-3">per {b.duration_days} days</div>
                    {included.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {included.map(t=>(
                          <div key={t.id} className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700">
                            {t.image_url ? <img src={t.image_url} className="w-3 h-3 rounded object-contain" alt=""/> : null}
                            {t.name}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400">#{b.sort_order} · {included.length} tools</span>
                      <button onClick={()=>toggle(b)}>
                        {b.is_active
                          ? <ToggleRight size={20} style={{color:'#d99401'}}/>
                          : <ToggleLeft size={20} className="text-gray-300"/>}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {!loading && bundles.length === 0 && (
              <div className="col-span-3 text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                <Package size={28} className="text-gray-200 mx-auto mb-3"/>
                <p className="text-sm text-gray-400 mb-3">No bundles yet</p>
                <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600">
                  <Plus size={12}/>Add Bundle
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {(modal==='add'||modal==='edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm">{modal==='add'?'New Bundle':'Edit Bundle'}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">

              {/* Name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Name (EN) *</label>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Pro Bundle" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">الاسم بالعربي</label>
                  <input value={form.name_ar} onChange={e=>setForm({...form,name_ar:e.target.value})} placeholder="الحزمة الاحترافية" className={inp} dir="rtl"/>
                </div>
              </div>

              {/* Price / Duration / Order */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Price EGP *</label>
                  <input type="number" value={form.price_egp} onChange={e=>setForm({...form,price_egp:e.target.value})} className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Days</label>
                  <input type="number" value={form.duration_days} onChange={e=>setForm({...form,duration_days:e.target.value})} className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Sort</label>
                  <input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})} className={inp}/>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Description</label>
                <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className={inp}/>
              </div>

              {/* Image + Badge */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Image URL</label>
                  <input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://..." className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Badge label</label>
                  <input value={form.badge} onChange={e=>setForm({...form,badge:e.target.value})} placeholder="Most Popular" className={inp}/>
                </div>
              </div>

              {/* Featured toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.highlight?'bg-yellow-400':'bg-gray-200 dark:bg-gray-700'}`}
                  onClick={()=>setForm(f=>({...f,highlight:!f.highlight}))}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.highlight?'left-4':'left-0.5'}`}/>
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">⭐ Featured — shown as hero bundle</span>
              </label>

              {/* Features */}
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Features (one per line)</label>
                <textarea value={form.features} onChange={e=>setForm({...form,features:e.target.value})}
                  placeholder={"Access all 5 tools\nInstant delivery\nPriority support"} className={inp+" resize-none h-20"}/>
              </div>

              {/* Tool selector */}
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-2 block">
                  Included Tools ({form.tool_ids.length} selected)
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-1">
                  {tools.map(t => {
                    const selected = form.tool_ids.includes(t.id)
                    return (
                      <button key={t.id} type="button" onClick={()=>toggleTool(t.id)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all text-start ${selected?'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-gray-800 dark:text-gray-100':'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}>
                        {t.image_url
                          ? <img src={t.image_url} className="w-5 h-5 rounded object-contain flex-shrink-0" alt=""/>
                          : <span className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{t.name.slice(0,2)}</span>}
                        <span className="truncate">{t.name}</span>
                        {selected && <Check size={11} className="ms-auto flex-shrink-0 text-yellow-500"/>}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : <><Check size={13}/>{modal==='add'?'Add Bundle':'Save Changes'}</>}
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
            <h3 className="font-bold text-center mb-1">Delete Bundle?</h3>
            <p className="text-xs text-center text-gray-400 mb-5"><span className="font-semibold text-gray-700">{delItem.name}</span></p>
            <div className="flex gap-2">
              <button onClick={()=>setDel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={del} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
