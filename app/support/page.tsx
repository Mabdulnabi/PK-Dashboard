'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { MessageSquare, Check, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Ticket { id:string; member_id?:string; subject:string; message:string; status:string; priority:string; reply?:string; replied_at?:string; created_at:string }

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 transition-all"
const STATUS_COLORS:any = {open:'#EF4444',in_progress:'#F59E0B',resolved:'#10B981',closed:'#6B7280'}
const PRIORITY_COLORS:any = {low:'#6B7280',normal:'#3B82F6',high:'#F59E0B',urgent:'#EF4444'}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [replyText, setReplyText] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [fStatus, setFStatus] = useState('all')

  const load = useCallback(async()=>{
    const {data} = await supabase.from('support_tickets').select('*').order('created_at',{ascending:false})
    if(data) setTickets(data)
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  const reply = async(t:Ticket)=>{
    if(!replyText.trim()) return
    setSaving(true)
    const {data:{user}} = await supabase.auth.getUser()
    const res = await fetch(`/api/admin/tickets/${t.id}/reply`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ reply: replyText, status: 'resolved', admin_id: user?.id }),
    })
    setSaving(false)
    if(res.ok){ setToast({msg:'Reply sent',type:'ok'}); setReplyText(''); setExpanded(null); load() }
    else { setToast({msg:'Failed to send reply',type:'err'}) }
  }

  const updateStatus = async(id:string, status:string)=>{
    await supabase.from('support_tickets').update({status}).eq('id',id)
    setToast({msg:`Status: ${status}`,type:'ok'}); load()
  }

  const filtered = tickets.filter(t=>fStatus==='all'||t.status===fStatus)
  const counts = {open:tickets.filter(t=>t.status==='open').length, in_progress:tickets.filter(t=>t.status==='in_progress').length}

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Support" subtitle={`${counts.open} open · ${counts.in_progress} in progress`}/>
        <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {['all','open','in_progress','resolved','closed'].map(s=>(
              <button key={s} onClick={()=>setFStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${fStatus===s?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500'}`}>
                {s.replace('_',' ')}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} tickets</span>
        </div>
        <div className="flex-1 overflow-auto p-5 flex flex-col gap-3">
          {loading&&<div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
          {!loading&&filtered.length===0&&(
            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
              <MessageSquare size={28} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-sm text-gray-400">No tickets</p>
            </div>
          )}
          {filtered.map(t=>(
            <div key={t.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" onClick={()=>setExpanded(expanded===t.id?null:t.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{t.subject}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{background:PRIORITY_COLORS[t.priority]+'20',color:PRIORITY_COLORS[t.priority]}}>{t.priority}</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{background:STATUS_COLORS[t.status]+'20',color:STATUS_COLORS[t.status]}}>
                  {t.status.replace('_',' ')}
                </span>
                {expanded===t.id?<ChevronUp size={14} className="text-gray-400 flex-shrink-0"/>:<ChevronDown size={14} className="text-gray-400 flex-shrink-0"/>}
              </div>
              {expanded===t.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-800/40">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-wrap">{t.message}</div>
                  {t.reply && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3 mb-3">
                      <div className="text-[10px] font-semibold text-emerald-600 mb-1">Your reply:</div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400">{t.reply}</div>
                    </div>
                  )}
                  <div className="flex gap-2 mb-2">
                    {['open','in_progress','resolved','closed'].map(s=>(
                      <button key={s} onClick={()=>updateStatus(t.id,s)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${t.status===s?'text-white':'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                        style={t.status===s?{background:STATUS_COLORS[s]}:{}}>
                        {s.replace('_',' ')}
                      </button>
                    ))}
                  </div>
                  {!t.reply && (
                    <div className="flex gap-2">
                      <textarea value={replyText} onChange={e=>setReplyText(e.target.value)}
                        placeholder="Type your reply..." className={inp+" resize-none h-16 flex-1"}/>
                      <button onClick={()=>reply(t)} disabled={saving}
                        className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex-shrink-0">
                        {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:'Send'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
