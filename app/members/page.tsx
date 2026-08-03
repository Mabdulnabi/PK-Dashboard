'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Search, Pencil, Trash2, X, Check, AlertCircle, Eye, RefreshCw, UserCheck, UserX, Clock } from 'lucide-react'

interface Plan { id:string; name:string; slug:string; price_egp:number; duration_days:number }
interface Member {
  id:string; full_name:string; email:string; phone?:string; telegram?:string
  plan_slug:string; plan_name?:string; plan_price?:number; status:string
  expires_at?:string; joined_at:string; notes?:string
  computed_status?:string; total_paid_egp?:number; total_payments?:number
}

const PAYMENTS = ['InstaPay','Vodafone Cash','Binance Pay','Bybit','BEP20','PayPal','Cash','Other']

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 transition-all"
const sel = inp + " cursor-pointer"

function statusBadge(s:string) {
  const cfg:any = {
    active:   {bg:'#DCFCE7',color:'#166534',label:'Active'},
    expiring: {bg:'#FEF3C7',color:'#92400E',label:'Expiring'},
    expired:  {bg:'#FEE2E2',color:'#991B1B',label:'Expired'},
    suspended:{bg:'#F3F4F6',color:'#374151',label:'Suspended'},
    pending:  {bg:'#DBEAFE',color:'#1E40AF',label:'Pending'},
  }
  const c = cfg[s] || cfg.pending
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:c.bg,color:c.color}}>{c.label}</span>
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [plans,   setPlans]   = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')
  const [fStatus, setFStatus] = useState('all')
  const [fPlan,   setFPlan]   = useState('all')
  const [toast,   setToast]   = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving,  setSaving]  = useState(false)
  const [modal,   setModal]   = useState<'add'|'edit'|'pay'|null>(null)
  const [sel2,    setSel2]    = useState<Member|null>(null)
  const [delId,   setDelId]   = useState<Member|null>(null)

  const emptyForm = {full_name:'',email:'',phone:'',telegram:'',plan_id:'',plan_slug:'basic',notes:'',duration_days:'30'}
  const [form, setForm] = useState(emptyForm)
  const emptyPay = {amount_egp:'',payment_method:'InstaPay',reference:'',duration_days:'30'}
  const [payForm, setPayForm] = useState(emptyPay)

  const load = useCallback(async()=>{
    const [mRes,pRes] = await Promise.all([
      supabase.from('members_full').select('*').order('created_at',{ascending:false}),
      supabase.from('membership_plans').select('*').eq('is_active',true).order('sort_order'),
    ])
    if(mRes.data) setMembers(mRes.data)
    if(pRes.data) setPlans(pRes.data)
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  const openAdd  = ()=>{ setForm(emptyForm); setSel2(null); setModal('add') }
  const openEdit = (m:Member)=>{ setForm({full_name:m.full_name,email:m.email,phone:m.phone||'',telegram:m.telegram||'',plan_id:'',plan_slug:m.plan_slug,notes:m.notes||'',duration_days:'30'}); setSel2(m); setModal('edit') }
  const openPay  = (m:Member)=>{ setSel2(m); setPayForm(emptyPay); setModal('pay') }

  const save = async()=>{
    if(!form.full_name||!form.email) return
    setSaving(true)
    const plan = plans.find(p=>p.slug===form.plan_slug)
    const expires = new Date(Date.now()+(parseInt(form.duration_days)||30)*86400000).toISOString()
    const payload:any = {full_name:form.full_name,email:form.email,phone:form.phone||null,telegram:form.telegram||null,plan_slug:form.plan_slug,plan_id:plan?.id||null,notes:form.notes||null,status:'active',expires_at:expires}
    const res = sel2
      ? await supabase.from('members').update(payload).eq('id',sel2.id)
      : await supabase.from('members').insert(payload)
    setSaving(false)
    if(res.error){setToast({msg:res.error.message,type:'err'});return}
    setToast({msg:sel2?'Updated':'Member added',type:'ok'})
    setModal(null); load()
  }

  const addPayment = async()=>{
    if(!payForm.amount_egp||!sel2) return
    setSaving(true)
    const plan = plans.find(p=>p.slug===sel2.plan_slug)
    const {data:pay} = await supabase.from('member_payments').insert({
      member_id:sel2.id, plan_id:plan?.id||null,
      amount_egp:parseFloat(payForm.amount_egp),
      payment_method:payForm.payment_method,
      reference:payForm.reference||null,
      duration_days:parseInt(payForm.duration_days)||30,
      status:'pending'
    }).select().single()
    if(pay){
      await fetch('/api/admin/payments/confirm',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          payment_id: pay.id,
          member_id: sel2.id,
          plan_name: plans.find(p=>p.slug===sel2.plan_slug)?.name,
        })
      })
    }
    setSaving(false)
    setToast({msg:'Payment added & confirmed',type:'ok'})
    setModal(null); load()
  }

  const suspend = async(m:Member)=>{
    const ns = m.status==='suspended'?'active':'suspended'
    await supabase.from('members').update({status:ns}).eq('id',m.id)
    setToast({msg:`Member ${ns}`,type:'ok'}); load()
  }

  const del = async()=>{
    if(!delId) return
    await supabase.from('members').delete().eq('id',delId.id)
    setToast({msg:'Deleted',type:'ok'}); setDelId(null); load()
  }

  const filtered = members.filter(m=>{
    const qm = !q||m.full_name.toLowerCase().includes(q.toLowerCase())||m.email.toLowerCase().includes(q.toLowerCase())||(m.phone||'').includes(q)
    const sm = fStatus==='all'||(m.computed_status||m.status)===fStatus
    const pm = fPlan==='all'||m.plan_slug===fPlan
    return qm&&sm&&pm
  })

  const stats = {
    active:   members.filter(m=>m.computed_status==='active').length,
    expiring: members.filter(m=>m.computed_status==='expiring').length,
    expired:  members.filter(m=>m.computed_status==='expired').length,
    total:    members.length,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Members" subtitle={`${members.length} total members`}/>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 px-5 py-3 flex-shrink-0">
          {[
            {label:'Active',val:stats.active,color:'#22C55E',bg:'#DCFCE7'},
            {label:'Expiring',val:stats.expiring,color:'#F59E0B',bg:'#FEF3C7'},
            {label:'Expired',val:stats.expired,color:'#EF4444',bg:'#FEE2E2'},
            {label:'Total',val:stats.total,color:'#3B82F6',bg:'#DBEAFE'},
          ].map(s=>(
            <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
              <div className="text-xl font-bold" style={{color:s.color}}>{s.val}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, email, phone..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-400 text-gray-800 dark:text-gray-200"/>
          </div>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} className="text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none">
            <option value="all">All Status</option>
            {['active','expiring','expired','suspended','pending'].map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fPlan} onChange={e=>setFPlan(e.target.value)} className="text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none">
            <option value="all">All Plans</option>
            {plans.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}
          </select>
          <div className="ml-auto text-xs text-gray-400">{filtered.length} results</div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
            <Plus size={13}/>Add Member
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-5">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {['Member','Plan','Status','Expiry','Paid','Actions'].map(h=>(
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading&&<tr><td colSpan={6} className="text-center py-12 text-sm text-gray-400">Loading...</td></tr>}
                {!loading&&filtered.length===0&&<tr><td colSpan={6} className="text-center py-12 text-sm text-gray-400">No members found</td></tr>}
                {filtered.map(m=>(
                  <tr key={m.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-500 flex-shrink-0">
                          {m.full_name.slice(0,1).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{m.full_name}</div>
                          <div className="text-[10px] text-gray-400">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize">{m.plan_slug}</span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(m.computed_status||m.status)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {Number(m.total_paid_egp||0).toLocaleString()} EGP
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openPay(m)} title="Add Payment"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                          <RefreshCw size={11}/>
                        </button>
                        <button onClick={()=>openEdit(m)} title="Edit"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Pencil size={11}/>
                        </button>
                        <button onClick={()=>suspend(m)} title={m.status==='suspended'?'Activate':'Suspend'}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                          {m.status==='suspended'?<UserCheck size={11}/>:<UserX size={11}/>}
                        </button>
                        <button onClick={()=>setDelId(m)} title="Delete"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {(modal==='add'||modal==='edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add'?'Add Member':'Edit Member'}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Full Name *</label>
                  <input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Dr. Ahmed..." className={inp}/>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Email *</label>
                  <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@..." className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Phone</label>
                  <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+20 10..." className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Telegram</label>
                  <input value={form.telegram} onChange={e=>setForm({...form,telegram:e.target.value})} placeholder="@username" className={inp}/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Plan</label>
                  <select value={form.plan_slug} onChange={e=>setForm({...form,plan_slug:e.target.value})} className={sel}>
                    {plans.map(p=><option key={p.slug} value={p.slug}>{p.name} — {p.price_egp} EGP</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Duration (days)</label>
                  <input type="number" value={form.duration_days} onChange={e=>setForm({...form,duration_days:e.target.value})} className={inp}/>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className={inp+" resize-none h-14"}/>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add'?'Add Member':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {modal==='pay' && sel2 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Add Payment — {sel2.full_name}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Amount (EGP) *</label>
                <input type="number" value={payForm.amount_egp} onChange={e=>setPayForm({...payForm,amount_egp:e.target.value})} placeholder="0" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Duration (days)</label>
                <input type="number" value={payForm.duration_days} onChange={e=>setPayForm({...payForm,duration_days:e.target.value})} className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-2 block">Payment Method</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENTS.map(p=>(
                    <button key={p} onClick={()=>setPayForm({...payForm,payment_method:p})}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                      style={{background:payForm.payment_method===p?'#EF4444':'#F3F4F6',color:payForm.payment_method===p?'#fff':'#6B7280'}}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 mb-1 block">Reference / TX ID</label>
                <input value={payForm.reference} onChange={e=>setPayForm({...payForm,reference:e.target.value})} placeholder="optional" className={inp}/>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={addPayment} disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>Confirm Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4"><Trash2 size={18} className="text-red-500"/></div>
            <h3 className="font-bold text-center mb-1">Delete Member?</h3>
            <p className="text-xs text-center text-gray-400 mb-5"><span className="font-semibold text-gray-700 dark:text-gray-300">{delId.full_name}</span> will be deleted permanently.</p>
            <div className="flex gap-2">
              <button onClick={()=>setDelId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={del} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
