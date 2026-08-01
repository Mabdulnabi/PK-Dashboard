'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar  from '@/components/layout/Topbar'
import { Check, AlertCircle, X, Eye, EyeOff, Plus, Trash2, Archive, AlertTriangle } from 'lucide-react'

interface Tool { id: string; name: string; image_url: string|null; available: number; assigned: number }
interface StockItem {
  id: string; tool_id: string; email: string; notes: string|null; status: 'available'|'assigned'
  assigned_to: string|null; assigned_at: string|null; created_at: string
  members?: { full_name: string; email: string }
}

const inp = "w-full px-4 py-3 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onClose,3000); return ()=>clearTimeout(t) },[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
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
    if (!form.tool_id) { setToast({msg:'اختر الأداة',type:'err'}); return }
    if (form.delivery_type==='account' && (!form.email.trim()||!form.password.trim())) {
      setToast({msg:'Email و Password مطلوبان',type:'err'}); return
    }
    if (form.delivery_type==='key' && !form.key.trim()) {
      setToast({msg:'Key مطلوب',type:'err'}); return
    }
    setSaving(true)
    const res  = await fetch('/api/admin/stock',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setToast({msg:data.error||'Error',type:'err'}); return }
    setToast({msg:'✓ تمت الإضافة',type:'ok'})
    setAddModal(false)
    load()
  }

  const deleteItem = async (id: string) => {
    setDeleting(id)
    const res = await fetch(`/api/admin/stock/${id}`,{ method:'DELETE' })
    setDeleting(null)
    if (!res.ok) { setToast({msg:'لا يمكن حذف حساب مُخصص',type:'err'}); return }
    setToast({msg:'✓ تم الحذف',type:'ok'})
    load()
  }

  const filtered = selTool==='all' ? stock : stock.filter(s=>s.tool_id===selTool)
  const totalAvail    = stock.filter(s=>s.status==='available').length
  const totalAssigned = stock.filter(s=>s.status==='assigned').length
  const lowTools = tools.filter(t=>t.available<3)

  const stats = [
    { label:'إجمالي الحسابات', val:stock.length,    gradient:'from-slate-50 to-white dark:from-[#111827] dark:to-[#111827]',   stripe:'bg-gray-300 dark:bg-gray-600',     valCls:'text-gray-800 dark:text-gray-200' },
    { label:'متاح',            val:totalAvail,       gradient:'from-emerald-50 to-white dark:from-[#111827] dark:to-[#111827]', stripe:'bg-emerald-400 dark:bg-emerald-600', valCls:'text-emerald-600 dark:text-emerald-400' },
    { label:'مُخصص',           val:totalAssigned,    gradient:'from-blue-50 to-white dark:from-[#111827] dark:to-[#111827]',    stripe:'bg-blue-400 dark:bg-blue-600',     valCls:'text-blue-600 dark:text-blue-400' },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0D1117] overflow-hidden">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Private Stock"/>
        <main className="flex-1 overflow-auto p-6">

          {/* Low stock warning */}
          {lowTools.length>0 && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0"/>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                مخزون منخفض: <span className="font-bold">{lowTools.map(t=>t.name).join('، ')}</span> — أقل من 3 حسابات متاحة
              </p>
            </div>
          )}

          {/* Stats + Add button */}
          <div className="flex items-stretch gap-4 mb-6">
            <div className="flex-1 grid grid-cols-3 gap-4">
              {stats.map(s=>(
                <div key={s.label} className={`rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden bg-gradient-to-br ${s.gradient} border border-gray-100 dark:border-[#1a2233] shadow-sm`}>
                  <div className={`absolute top-0 left-0 right-0 h-[2px] ${s.stripe}`}/>
                  <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                  <span className={`text-3xl font-bold ${s.valCls}`}>{s.val}</span>
                </div>
              ))}
            </div>
            <button onClick={openAdd} className="px-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center gap-2 transition-colors shadow-sm shadow-red-500/20">
              <Plus size={16}/> إضافة حساب
            </button>
          </div>

          {/* Tool filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={()=>setSelTool('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${selTool==='all'?'bg-red-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              الكل
            </button>
            {tools.map(t=>(
              <button key={t.id} onClick={()=>setSelTool(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${selTool===t.id?'bg-red-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {t.image_url && <img src={t.image_url} alt={t.name} className="w-4 h-4 object-contain rounded"/>}
                {t.name}
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${t.available<3?'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400':'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {t.available}
                </span>
              </button>
            ))}
          </div>

          {/* Stock table */}
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm">
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>
            ) : filtered.length===0 ? (
              <div className="text-center py-16">
                <Archive size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-700"/>
                <p className="text-sm text-gray-400">لا توجد حسابات</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#0D1117] border-b border-gray-100 dark:border-[#1a2233]">
                    {['الأداة','Email','ملاحظات','الحالة','العميل','تاريخ الإضافة','حذف'].map(h=>(
                      <th key={h} className="text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s=>{
                    const tool = tools.find(t=>t.id===s.tool_id)
                    return (
                      <tr key={s.id} className="border-b border-gray-50 dark:border-[#1a2233] hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {tool?.image_url && <img src={tool.image_url} alt={tool.name} className="w-6 h-6 object-contain rounded"/>}
                            <span className="text-sm text-gray-700 dark:text-gray-300">{tool?.name||s.tool_id}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 font-mono" dir="ltr">{s.email}</td>
                        <td className="px-5 py-4 text-xs text-gray-500">{s.notes||'—'}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${s.status==='available'?'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400':'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400'}`}>
                            {s.status==='available'?'متاح':'مُخصص'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {s.members ? (
                            <div>
                              <div className="text-xs text-gray-700 dark:text-gray-300">{(s.members as any).full_name}</div>
                              <div className="text-[10px] text-gray-500">{(s.members as any).email}</div>
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{new Date(s.created_at).toLocaleDateString('ar-EG')}</td>
                        <td className="px-5 py-4">
                          <button onClick={()=>deleteItem(s.id)} disabled={s.status==='assigned'||deleting===s.id}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500">
                            {deleting===s.id
                              ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/>
                              : <Trash2 size={13}/>}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Add Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setAddModal(false)}>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">إضافة حساب للمخزون</h2>
              <button onClick={()=>setAddModal(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={14}/>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">الأداة</label>
                <select value={form.tool_id} onChange={e=>setForm(f=>({...f,tool_id:e.target.value}))} className={inp}>
                  {tools.map(t=>(
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">نوع التسليم</label>
                <div className="flex gap-2">
                  {(['account','key'] as const).map(type=>(
                    <button key={type} onClick={()=>setForm(f=>({...f,delivery_type:type}))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${form.delivery_type===type?'bg-red-500 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {type==='account'?'📧 Email + Password':'🔑 Key'}
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
                      <button onClick={()=>setShowPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
                    <button onClick={()=>setShowPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">ملاحظات (اختياري)</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  placeholder={form.delivery_type==='account'?'Family Plan — Slot 3':'استخدم مرة واحدة فقط'}
                  rows={2} className={inp + ' resize-none'}/>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={()=>setAddModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                إلغاء
              </button>
              <button onClick={addItem} disabled={saving}
                className="flex-[2] py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> جاري...</> : <><Plus size={15}/> إضافة للمخزون</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
