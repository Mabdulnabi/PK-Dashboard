'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar  from '@/components/layout/Topbar'
import { Check, AlertCircle, X, Eye, EyeOff, Package, Clock, CheckCircle2 } from 'lucide-react'

interface Order {
  id: string; member_name: string; member_email: string
  tool_id: string; tool_name: string; tool_image: string|null
  amount_egp: number; created_at: string; expires_at: string|null
  delivered: boolean; delivered_at: string|null; viewed_at: string|null
}

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onClose,3000); return ()=>clearTimeout(t) },[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders,   setOrders]   = useState<Order[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all'|'pending'|'delivered'>('all')
  const [modal,    setModal]    = useState<Order|null>(null)
  const [form,     setForm]     = useState({ delivery_type:'account' as 'account'|'key', email:'', password:'', key:'', notes:'' })
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{msg:string;type:'ok'|'err'}|null>(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{ if (!data.session) router.push('/auth/login') })
  },[router])

  const load = async () => {
    setLoading(true)
    const res  = await fetch(`/api/admin/orders?status=${filter==='all'?'':filter}`)
    const data = await res.json()
    setOrders(data.orders||[])
    setLoading(false)
  }

  useEffect(()=>{ load() },[filter])

  const openDeliver = (order: Order) => {
    setForm({ delivery_type:'account', email:'', password:'', key:'', notes:'' })
    setShowPass(false)
    setModal(order)
  }

  const deliver = async () => {
    if (!modal) return
    if (form.delivery_type==='account' && (!form.email.trim()||!form.password.trim())) {
      setToast({msg:'Email و Password مطلوبان',type:'err'}); return
    }
    if (form.delivery_type==='key' && !form.key.trim()) {
      setToast({msg:'Key مطلوب',type:'err'}); return
    }
    setSaving(true)
    const res = await fetch(`/api/admin/orders/${modal.id}/deliver`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setToast({msg:data.error||'Error',type:'err'}); return }
    setToast({msg:`✓ تم تسليم الحساب لـ ${modal.member_name}`,type:'ok'})
    setModal(null)
    load()
  }

  const pending   = orders.filter(o=>!o.delivered).length
  const delivered = orders.filter(o=>o.delivered).length

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Private Orders"/>
        <main className="flex-1 overflow-auto p-6">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label:'إجمالي الطلبات', val:orders.length,  color:'text-gray-200', bg:'#1F2937' },
              { label:'في انتظار التسليم', val:pending,     color:'text-amber-400', bg:'#1C1A10' },
              { label:'تم التسليم',      val:delivered,     color:'text-emerald-400', bg:'#0D1F18' },
            ].map(s=>(
              <div key={s.label} className="rounded-2xl p-5 flex flex-col gap-1" style={{background:s.bg, border:'1px solid #1F2937'}}>
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                <span className={`text-3xl font-bold ${s.color}`}>{s.val}</span>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {(['all','pending','delivered'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter===f?'bg-red-500 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {f==='all'?'الكل':f==='pending'?'⏳ في الانتظار':'✅ تم التسليم'}
              </button>
            ))}
          </div>

          {/* Orders list */}
          <div className="rounded-2xl overflow-hidden" style={{border:'1px solid #1F2937', background:'#111827'}}>
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>
            ) : orders.length===0 ? (
              <div className="text-center py-16 text-gray-500">
                <Package size={32} className="mx-auto mb-3 text-gray-700"/>
                <p className="text-sm">لا توجد طلبات</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{borderBottom:'1px solid #1F2937', background:'#0D1117'}}>
                    {['العميل','الأداة','تاريخ الشراء','الانتهاء','الحالة','إجراء'].map(h=>(
                      <th key={h} className="text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o=>(
                    <tr key={o.id} style={{borderBottom:'1px solid #1F2937'}} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-200">{o.member_name}</div>
                        <div className="text-xs text-gray-500">{o.member_email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {o.tool_image && <img src={o.tool_image} alt={o.tool_name} className="w-7 h-7 object-contain rounded"/>}
                          <span className="text-sm font-medium text-gray-300">{o.tool_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {new Date(o.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {o.expires_at ? new Date(o.expires_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {o.delivered ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                              <CheckCircle2 size={12}/> تم التسليم
                            </span>
                            {o.viewed_at
                              ? <span className="text-[10px] text-gray-500">شاهده {new Date(o.viewed_at).toLocaleDateString('ar-EG')}</span>
                              : <span className="text-[10px] text-amber-500">● لم يُشاهد بعد</span>
                            }
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                            <Clock size={12}/> في الانتظار
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={()=>openDeliver(o)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${o.delivered?'bg-gray-700 text-gray-400 hover:bg-gray-600':'bg-red-500 hover:bg-red-600 text-white'}`}>
                          {o.delivered?'تعديل':'تسليم'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* Deliver Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">تسليم حساب</h2>
                <p className="text-xs text-gray-400 mt-0.5">{modal.member_name} · {modal.tool_name}</p>
              </div>
              <button onClick={()=>setModal(null)} className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white">
                <X size={14}/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Type toggle */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">نوع التسليم</label>
                <div className="flex gap-2">
                  {(['account','key'] as const).map(type=>(
                    <button key={type} onClick={()=>setForm(f=>({...f,delivery_type:type}))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${form.delivery_type===type?'bg-red-500 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {type==='account'?'📧 Email + Password':'🔑 Key'}
                    </button>
                  ))}
                </div>
              </div>

              {form.delivery_type==='account' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Email</label>
                    <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                      placeholder="user@example.com" dir="ltr"
                      className="w-full px-4 py-3 text-sm rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 outline-none focus:border-red-500 transition-colors"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Password</label>
                    <div className="relative">
                      <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                        type={showPass?'text':'password'} placeholder="••••••••" dir="ltr"
                        className="w-full px-4 py-3 text-sm rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 outline-none focus:border-red-500 transition-colors pr-10"/>
                      <button onClick={()=>setShowPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">Key / License</label>
                  <div className="relative">
                    <input value={form.key} onChange={e=>setForm(f=>({...f,key:e.target.value}))}
                      type={showPass?'text':'password'} placeholder="XXXX-XXXX-XXXX-XXXX" dir="ltr"
                      className="w-full px-4 py-3 text-sm rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 outline-none focus:border-red-500 transition-colors font-mono pr-10"/>
                    <button onClick={()=>setShowPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">ملاحظات (اختياري)</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  placeholder={form.delivery_type==='account'?'Family Plan — لا تغير أي إعدادات':'استخدم مرة واحدة فقط'}
                  rows={2}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-600 outline-none focus:border-red-500 transition-colors resize-none"/>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl border border-gray-700 text-sm font-semibold text-gray-400 hover:bg-gray-800 transition-colors">
                إلغاء
              </button>
              <button onClick={deliver} disabled={saving}
                className="flex-[2] py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> جاري...</> : <><Check size={15}/> تسليم وإشعار</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
