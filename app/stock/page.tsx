'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar  from '@/components/layout/Topbar'
import {
  Check, AlertCircle, X, Eye, EyeOff, Plus, Trash2,
  Archive, AlertTriangle, Database, User, Calendar, Wrench,
} from 'lucide-react'

interface Tool { id: string; name: string; image_url: string|null; available: number; assigned: number }
interface StockItem {
  id: string; tool_id: string; email: string; notes: string|null; status: 'available'|'assigned'
  assigned_to: string|null; assigned_at: string|null; created_at: string
  members?: { full_name: string; email: string }
}

const GOLD = '#d99401'

const inp = "w-full px-4 py-3 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 transition-colors"

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onClose,3000); return ()=>clearTimeout(t) },[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

export default function StockPage() {
  const router = useRouter()
  const [tools,     setTools]     = useState<Tool[]>([])
  const [stock,     setStock]     = useState<StockItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selTool,   setSelTool]   = useState<string>('all')
  const [addModal,  setAddModal]  = useState(false)
  const [form,      setForm]      = useState({ tool_id:'', delivery_type:'account' as 'account'|'key', email:'', password:'', key:'', notes:'' })
  const [showPass,  setShowPass]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState<string|null>(null)
  const [toast,     setToast]     = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [page,      setPage]      = useState(1)
  const perPage = 12

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{ if (!data.session) router.push('/auth/login') })
  },[router])

  const load = async () => {
    setLoading(true)
    const res  = await fetch('/api/admin/stock')
    const data = await res.json()
    setTools(data.tools||[])
    setStock(data.stock||[])
    setLoading(false)
  }

  useEffect(()=>{ load() },[])

  const openAdd = () => {
    const firstTool = tools[0]
    setForm({ tool_id: firstTool?.id||'', delivery_type:'account', email:'', password:'', key:'', notes:'' })
    setShowPass(false)
    setAddModal(true)
  }

  const addItem = async () => {
    if (!form.tool_id) { setToast({msg:'Please select a tool',type:'err'}); return }
    if (form.delivery_type==='account' && (!form.email.trim()||!form.password.trim())) {
      setToast({msg:'Email and Password are required',type:'err'}); return
    }
    if (form.delivery_type==='key' && !form.key.trim()) {
      setToast({msg:'Key is required',type:'err'}); return
    }
    setSaving(true)
    const res  = await fetch('/api/admin/stock',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setToast({msg:data.error||'Error',type:'err'}); return }
    setToast({msg:'✓ Item added to stock',type:'ok'})
    setAddModal(false)
    load()
  }

  const deleteItem = async (id: string) => {
    setDeleting(id)
    const res = await fetch(`/api/admin/stock/${id}`,{ method:'DELETE' })
    setDeleting(null)
    if (!res.ok) { setToast({msg:'Cannot delete an assigned item',type:'err'}); return }
    setToast({msg:'✓ Item deleted',type:'ok'})
    load()
  }

  const filtered = selTool==='all' ? stock : stock.filter(s=>s.tool_id===selTool)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page-1)*perPage, page*perPage)
  const totalAvail    = stock.filter(s=>s.status==='available').length
  const totalAssigned = stock.filter(s=>s.status==='assigned').length
  const lowTools = tools.filter(t=>t.available<3)

  const stats = [
    { label:'Total Items',  val:stock.length,    color:'#6b7280', bg:'bg-gray-100 dark:bg-gray-800' },
    { label:'Available',    val:totalAvail,       color:'#10b981', bg:'bg-emerald-50 dark:bg-emerald-900/20' },
    { label:'Assigned',     val:totalAssigned,    color:'#6366f1', bg:'bg-indigo-50 dark:bg-indigo-900/20' },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0D1117] overflow-hidden">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Private Stock"/>
        <main className="flex-1 overflow-auto p-6">

          {/* Low stock alert */}
          {lowTools.length>0 && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0"/>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Low stock: <span className="font-bold">{lowTools.map(t=>t.name).join(', ')}</span> — fewer than 3 items available
              </p>
            </div>
          )}

          {/* Stats + Add button */}
          <div className="flex items-stretch gap-4 mb-6">
            <div className="flex-1 grid grid-cols-3 gap-4">
              {stats.map(s=>(
                <div key={s.label} className={`rounded-2xl p-5 ${s.bg} border border-gray-100 dark:border-[#1a2233] flex items-center gap-4`}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color+'20' }}>
                    <Database size={22} style={{ color: s.color }}/>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-0.5">{s.label}</div>
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={openAdd}
              className="px-5 rounded-2xl text-white font-bold text-sm flex items-center gap-2 transition-colors shadow-sm hover:opacity-90"
              style={{background:GOLD}}>
              <Plus size={16}/> Add Item
            </button>
          </div>

          {/* Tool filter tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <button onClick={()=>{ setSelTool('all'); setPage(1) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors`}
              style={selTool==='all'?{background:GOLD,color:'#fff'}:{background:'#f3f4f6',color:'#6b7280'}}>
              All
            </button>
            {tools.map(t=>(
              <button key={t.id} onClick={()=>{ setSelTool(t.id); setPage(1) }}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                style={selTool===t.id?{background:GOLD,color:'#fff'}:{background:'#f3f4f6',color:'#6b7280'}}>
                {t.image_url && <img src={t.image_url} alt={t.name} className="w-4 h-4 object-contain rounded"/>}
                {t.name}
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${t.available<3?'bg-amber-200 text-amber-700':'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                  {t.available}
                </span>
              </button>
            ))}
          </div>

          {/* Stock cards */}
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:`${GOLD} transparent transparent transparent`}}/></div>
          ) : filtered.length===0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Archive size={40} className="mb-3 opacity-30"/>
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paged.map(s=>{
                  const tool = tools.find(t=>t.id===s.tool_id)
                  return (
                    <div key={s.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-[#1a2233] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Status stripe */}
                      <div className="h-1 w-full" style={{ background: s.status==='available' ? '#10b981' : '#6366f1' }}/>

                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            {tool?.image_url
                              ? <img src={tool.image_url} alt={tool.name} className="w-7 h-7 object-contain rounded"/>
                              : <Wrench size={18} className="text-gray-400"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{tool?.name||s.tool_id}</div>
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status==='available'?'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400':'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400'}`}>
                              {s.status==='available' ? 'Available' : 'Assigned'}
                            </span>
                          </div>
                          <button onClick={()=>deleteItem(s.id)} disabled={s.status==='assigned'||deleting===s.id}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500">
                            {deleting===s.id
                              ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/>
                              : <Trash2 size={13}/>}
                          </button>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <User size={11} className="flex-shrink-0"/>
                            <span className="font-mono truncate" dir="ltr">{s.email}</span>
                          </div>
                          {s.notes && (
                            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1 truncate">
                              {s.notes}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar size={11} className="flex-shrink-0"/>
                            <span>Added: {fmtDate(s.created_at)}</span>
                          </div>
                          {s.members && (
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                              → {(s.members as any).full_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {filtered.length > perPage && (
                <div className="flex items-center justify-between mt-5 text-xs text-gray-500">
                  <span>{Math.min((page-1)*perPage+1,filtered.length)}–{Math.min(page*perPage,filtered.length)} of {filtered.length}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={()=>setPage(p=>p-1)} disabled={page===1}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">←</button>
                    <span className="px-3">{page} / {totalPages}</span>
                    <button onClick={()=>setPage(p=>p+1)} disabled={page>=totalPages}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">→</button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Add Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setAddModal(false)}>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Item to Stock</h2>
              <button onClick={()=>setAddModal(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={14}/>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Tool</label>
                <select value={form.tool_id} onChange={e=>setForm(f=>({...f,tool_id:e.target.value}))} className={inp}>
                  {tools.map(t=>(
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Item Type</label>
                <div className="flex gap-2">
                  {(['account','key'] as const).map(type=>(
                    <button key={type} onClick={()=>setForm(f=>({...f,delivery_type:type}))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                      style={form.delivery_type===type?{background:GOLD,color:'#fff'}:{background:'#f3f4f6',color:'#6b7280'}}>
                      {type==='account'?'📧 Account':'🔑 Key'}
                    </button>
                  ))}
                </div>
              </div>

              {form.delivery_type==='account' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
                    <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                      placeholder="user@example.com" dir="ltr" className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Password</label>
                    <div className="relative">
                      <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                        type={showPass?'text':'password'} placeholder="••••••••" dir="ltr" className={inp + ' pr-10'}/>
                      <button onClick={()=>setShowPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Key / License</label>
                  <div className="relative">
                    <input value={form.key} onChange={e=>setForm(f=>({...f,key:e.target.value}))}
                      type={showPass?'text':'password'} placeholder="XXXX-XXXX-XXXX-XXXX" dir="ltr" className={inp + ' pr-10 font-mono'}/>
                    <button onClick={()=>setShowPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Notes (optional)</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  placeholder={form.delivery_type==='account'?'Family Plan — Slot 3':'Single-use only'}
                  rows={2} className={inp + ' resize-none'}/>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={()=>setAddModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={addItem} disabled={saving}
                className="flex-[2] py-3 rounded-xl disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                style={{background:GOLD}}>
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving…</> : <><Plus size={15}/> Add to Stock</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
