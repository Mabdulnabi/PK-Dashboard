'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Bell, Send, Check, AlertCircle, Clock, X } from 'lucide-react'

interface Member { id:string; full_name:string; email:string; plan_slug:string; expires_at:string; computed_status:string; phone?:string; telegram?:string }

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"
const pc: Record<string,string> = {basic:'#3B82F6',vip:'#F59E0B',private:'#8B5CF6'}
const tc: Record<string,string> = {info:'#3B82F6',warning:'#F59E0B',success:'#22C55E',danger:'#EF4444'}

function daysLeft(exp:string) {
  return Math.ceil((new Date(exp).getTime()-Date.now())/86400000)
}

export default function AlertsPage() {
  const [expiring,  setExpiring]  = useState<Member[]>([])
  const [expired,   setExpired]   = useState<Member[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [tab,       setTab]       = useState<'expiring'|'expired'|'log'>('expiring')
  const [toast,     setToast]     = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [sending,   setSending]   = useState(false)
  const [logs,      setLogs]      = useState<any[]>([])
  const [modal,     setModal]     = useState(false)
  const [notifForm, setNotifForm] = useState({title:'',message:'',type:'warning'})

  const load = useCallback(async()=>{
    const data = await fetch('/api/admin/alerts').then(r=>r.json())
    if(data.expiring) setExpiring(data.expiring)
    if(data.expired)  setExpired(data.expired)
    if(data.logs)     setLogs(data.logs)
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  const toggleSelect = (id:string) => {
    setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }
  const selectAll = (list:Member[]) => {
    setSelected(selected.size===list.length&&list.length>0 ? new Set() : new Set(list.map(m=>m.id)))
  }

  const sendNotifications = async() => {
    if(!notifForm.title||!notifForm.message) return
    const targetList = tab==='expiring' ? expiring : expired
    const targets = selected.size>0 ? targetList.filter(m=>selected.has(m.id)) : targetList
    if(targets.length===0) return
    setSending(true)
    const res = await fetch('/api/admin/alerts', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({member_ids:targets.map(m=>m.id),title:notifForm.title,message:notifForm.message,type:notifForm.type}),
    })
    const data = await res.json()
    setSending(false)
    if(!res.ok){setToast({msg:data.error||'Error',type:'err'});return}
    setToast({msg:`Sent to ${data.count} members`,type:'ok'})
    setModal(false); setSelected(new Set())
    setNotifForm({title:'',message:'',type:'warning'})
    load()
  }

  const quickNotify = async(m:Member) => {
    const days = daysLeft(m.expires_at)
    const msg = days<0
      ? `Your ${m.plan_slug} subscription has expired. Renew now to restore access.`
      : `Your ${m.plan_slug} subscription expires in ${days} day${days!==1?'s':''}. Renew to keep access.`
    await fetch('/api/admin/alerts', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({member_ids:[m.id],title:'Subscription Reminder',message:msg,type:'warning'}),
    })
    setToast({msg:`Sent to ${m.full_name}`,type:'ok'})
  }

  const list = tab==='expiring' ? expiring : tab==='expired' ? expired : []

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Alerts" subtitle={`${expiring.length} expiring · ${expired.length} expired`}/>

        {/* Tab bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {([
              ['expiring', `⚠️ Expiring (${expiring.length})`],
              ['expired',  `❌ Expired (${expired.length})`],
              ['log',      '📋 Log'],
            ] as const).map(([id,label])=>(
              <button key={id} onClick={()=>{setTab(id);setSelected(new Set())}}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab===id?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>
          {tab!=='log' && (
            <div className="flex items-center gap-2">
              {selected.size>0 && <span className="text-xs text-gray-400">{selected.size} selected</span>}
              <button onClick={()=>setModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors">
                <Bell size={12}/>
                {selected.size>0 ? `Notify ${selected.size}` : 'Notify All'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5">

          {/* Expiring / Expired table */}
          {tab!=='log' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              {list.length>0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                  <input type="checkbox" checked={selected.size===list.length&&list.length>0}
                    onChange={()=>selectAll(list)} className="rounded accent-amber-500"/>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Select All</span>
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                    {['','Member','Plan','Expires','Days','Contact','Action'].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className="text-center py-12">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"/>
                    </td></tr>
                  )}
                  {!loading&&list.length===0 && (
                    <tr><td colSpan={7} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                          <Check size={18} className="text-emerald-500"/>
                        </div>
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">All clear — no {tab} members</span>
                      </div>
                    </td></tr>
                  )}
                  {list.map(m=>{
                    const days = daysLeft(m.expires_at)
                    const urgent = days<=3
                    return (
                      <tr key={m.id} className={`border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${selected.has(m.id)?'bg-amber-50/40 dark:bg-amber-900/10':''}`}>
                        <td className="px-4 py-3 w-8">
                          <input type="checkbox" checked={selected.has(m.id)} onChange={()=>toggleSelect(m.id)} className="rounded accent-amber-500"/>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{m.full_name}</div>
                          <div className="text-[10px] text-gray-400">{m.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{background:(pc[m.plan_slug]||'#6B7280')+'20',color:pc[m.plan_slug]||'#6B7280'}}>
                            {m.plan_slug}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.expires_at).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${urgent?'text-red-500':days<0?'text-gray-400':'text-amber-500'}`}>
                            {days<0?`${Math.abs(days)}d ago`:`${days}d`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[10px] text-gray-400">{m.phone||m.telegram||'—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={()=>quickNotify(m)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                            <Bell size={10}/>Notify
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Log tab */}
          {tab==='log' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                    {['Title','Type','Read','Sent At'].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length===0 && (
                    <tr><td colSpan={4} className="text-center py-10 text-sm text-gray-400">No notifications sent yet</td></tr>
                  )}
                  {logs.map(l=>(
                    <tr key={l.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{l.title}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-xs">{l.message}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{background:(tc[l.type]||'#6B7280')+'20',color:tc[l.type]||'#6B7280'}}>
                          {l.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {l.is_read
                          ? <Check size={13} className="text-emerald-500"/>
                          : <Clock size={13} className="text-gray-300 dark:text-gray-600"/>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Bulk notify modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" style={{backdropFilter:'blur(4px)'}}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                Send Notification — {selected.size>0?`${selected.size} members`:`all ${list.length}`}
              </h3>
              <button onClick={()=>setModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={14}/>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Type</label>
                <div className="flex gap-2">
                  {(['info','warning','success','danger'] as const).map(t=>(
                    <button key={t} onClick={()=>setNotifForm({...notifForm,type:t})}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all capitalize border-2"
                      style={{
                        background: notifForm.type===t ? tc[t]+'15' : 'transparent',
                        color: tc[t],
                        borderColor: notifForm.type===t ? tc[t] : tc[t]+'30',
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Title *</label>
                <input value={notifForm.title} onChange={e=>setNotifForm({...notifForm,title:e.target.value})}
                  placeholder="Subscription Reminder" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Message *</label>
                <textarea value={notifForm.message} onChange={e=>setNotifForm({...notifForm,message:e.target.value})}
                  placeholder="Your subscription is expiring soon..." className={inp+' resize-none h-20'}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Quick Templates</label>
                <div className="flex flex-col gap-1.5">
                  {[
                    {label:'Expiry reminder', msg:'Your subscription is expiring soon. Renew now to keep your access uninterrupted.'},
                    {label:'Expired notice',  msg:'Your subscription has expired. Renew today to restore your access to all tools.'},
                    {label:'Special offer',   msg:'Renew your subscription this week and get 20% off. Contact us to claim your discount!'},
                  ].map(t=>(
                    <button key={t.label} onClick={()=>setNotifForm({...notifForm,title:t.label,message:t.msg})}
                      className="text-left px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/10 hover:border-amber-200 dark:hover:border-amber-800 border border-transparent transition-colors">
                      <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">{t.label}</div>
                      <div className="text-[9px] text-gray-400 truncate mt-0.5">{t.msg}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5 pt-1">
              <button onClick={()=>setModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={sendNotifications} disabled={sending}
                className="flex-[2] py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors">
                {sending?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Send size={12}/>Send Notification</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
