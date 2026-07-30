'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Pencil, Trash2, X, Check, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'

interface Plan { id:string; name:string; slug:string; price_egp:number; duration_days:number; description?:string; features:string[]; is_active:boolean; sort_order:number }

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 transition-all"
const PLAN_COLORS:any = { basic:'#3B82F6', vip:'#F59E0B', private:'#8B5CF6' }

export default function PlansPage() {
  const [plans,  setPlans]  = useState<Plan[]>([])
  const [loading,setLoading]= useState(true)
  const [modal,  setModal]  = useState<'add'|'edit'|null>(null)
  const [editItem,setEdit]  = useState<Plan|null>(null)
  const [toast,  setToast]  = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving, setSaving] = useState(false)
  const [delItem,setDel]    = useState<Plan|null>(null)

  const emptyForm = { name:'', slug:'', price_egp:'', duration_days:'30', description:'', features:'', sort_order:'0' }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async()=>{
    const {data} = await supabase.from('membership_plans').select('*').order('sort_order')
    if(data) setPlans(data)
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  const openAdd  = ()=>{ setForm(emptyForm); setEdit(null); setModal('add') }
  const openEdit = (p:Plan)=>{
    setForm({name:p.name,slug:p.slug,price_egp:String(p.price_egp),duration_days:String(p.duration_days),description:p.description||'',features:(p.features||[]).join('\n'),sort_order:String(p.sort_order)})
    setEdit(p); setModal('edit')
  }

  const save = async()=>{
    if(!form.name||!form.price_egp) return
    setSaving(true)
    const payload = {
      name:form.name, slug:form.slug||form.name.toLowerCase().replace(/\s+/g,'_'),
      price_egp:parseFloat(form.price_egp), duration_days:parseInt(form.duration_days)||30,
      description:form.description||null, sort_order:parseInt(form.sort_order)||0,
      features:form.features.split('\n').map(f=>f.trim()).filter(Boolean)
    }
    const res = editItem
      ? await supabase.from('membership_plans').update(payload).eq('id',editItem.id)
      : await supabase.from('membership_plans').insert(payload)
    setSaving(false)
    if(res.error){setToast({msg:res.error.message,type:'err'});return}
    setToast({msg:editItem?'Plan updated':'Plan added',type:'ok'})
    setModal(null); load()
  }

  const toggle = async(p:Plan)=>{
    await supabase.from('membership_plans').update({is_active:!p.is_active}).eq('id',p.id)
    setToast({msg:p.is_active?'Plan deactivated':'Plan activated',type:'ok'}); load()
  }

  const del = async()=>{
    if(!delItem) return
    const res = await supabase.from('membership_plans').delete().eq('id',delItem.id)
    if(res.error){setToast({msg:'Cannot delete — members using this plan',type:'err'});setDel(null);return}
    setToast({msg:'Deleted',type:'ok'}); setDel(null); load()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Membership Plans" subtitle="Manage Basic, VIP, Private plans" onAdd={openAdd} addLabel="New Plan"/>
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-3 gap-4">
            {loading&&<div className="col-span-3 flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
            {plans.map(p=>{
              const color = PLAN_COLORS[p.slug] || '#6B7280'
              return (
                <div key={p.id} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden ${!p.is_active?'opacity-60':''}`}>
                  <div className="h-1.5" style={{background:color}}/>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-base font-bold text-gray-900 dark:text-gray-100">{p.name}</div>
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">{p.slug}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openEdit(p)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={13}/></button>
                        <button onClick={()=>setDel(p)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13}/></button>
                      </div>
                    </div>
                    <div className="text-2xl font-bold mb-1" style={{color}}>{p.price_egp.toLocaleString()} <span className="text-sm font-normal text-gray-400">EGP</span></div>
                    <div className="text-xs text-gray-400 mb-4">per {p.duration_days} days</div>
                    {p.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{p.description}</p>}
                    <div className="flex flex-col gap-1.5 mb-4">
                      {(p.features||[]).map((f,i)=>(
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Check size={11} style={{color,flexShrink:0}}/>{f}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400">#{p.sort_order} · {p.is_active?'Active':'Inactive'}</span>
                      <button onClick={()=>toggle(p)}>
                        {p.is_active?<ToggleRight size={22} style={{color}}/>:<ToggleLeft size={22} className="text-gray-300"/>}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {(modal==='add'||modal==='edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm">{modal==='add'?'New Plan':'Edit Plan'}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Name *</label>
                  <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="VIP" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Slug</label>
                  <input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="vip" className={inp+" font-mono"}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Price (EGP) *</label>
                  <input type="number" value={form.price_egp} onChange={e=>setForm({...form,price_egp:e.target.value})} className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Duration (days)</label>
                  <input type="number" value={form.duration_days} onChange={e=>setForm({...form,duration_days:e.target.value})} className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={e=>setForm({...form,sort_order:e.target.value})} className={inp}/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Description</label>
                <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Features (one per line)</label>
                <textarea value={form.features} onChange={e=>setForm({...form,features:e.target.value})}
                  placeholder={"QuillBot\nGrammarly\nCanva Pro"} className={inp+" resize-none h-24"}/>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add'?'Add Plan':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {delItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><Trash2 size={18} className="text-red-500"/></div>
            <h3 className="font-bold text-center mb-1">Delete Plan?</h3>
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
