'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import {
  Plus, Server, Users, Activity, Shield, Wifi, WifiOff,
  Wrench, Ban, Check, X, AlertCircle, Eye, EyeOff,
  Trash2, Pencil, Zap, Clock
} from 'lucide-react'

interface ToolServer {
  id: string; tool_name: string; server_label: string
  tier_required: string; max_concurrent_users: number
  current_active_users: number; status: string
  proxy_host?: string; proxy_port?: number; last_verified_at?: string
  free_slots?: number; load_percent?: number
}
interface LiveSession {
  id: string; user_email: string; tool_name: string
  server_label: string; started_at: string
  last_active_at: string; expires_at: string
  inactive_minutes: number; device_fingerprint: string
}

const TIERS    = ['basic','vip','private']
const STATUSES = ['active','maintenance','banned']
const TOOLS    = ['QuillBot','Grammarly','Canva Pro','Turnitin','Gemini Pro','Perplexity','GO Plus','SciSpace']

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"

const statusIcon = (s: string) =>
  s==='active'      ? <Wifi size={13} className="text-emerald-500"/> :
  s==='maintenance' ? <Wrench size={13} className="text-amber-500"/> :
                      <Ban size={13} className="text-red-500"/>

const tierColor = (t: string) =>
  t==='vip'     ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
  t==='private' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'

export default function GroupBuyPage() {
  const [tab, setTab]             = useState<'servers'|'sessions'|'log'>('servers')
  const [servers, setServers]     = useState<ToolServer[]>([])
  const [sessions, setSessions]   = useState<LiveSession[]>([])
  const [logs, setLogs]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving, setSaving]       = useState(false)
  const [modal, setModal]         = useState<'add'|'edit'|null>(null)
  const [editId, setEditId]       = useState<string|null>(null)
  const [showPass, setShowPass]   = useState(false)
  const [delConfirm, setDel]      = useState<ToolServer|null>(null)

  const emptyForm = {
    tool_name:'QuillBot', server_label:'', session_data_encrypted:'',
    encryption_iv:'', tier_required:'basic', max_concurrent_users:5,
    proxy_host:'', proxy_port:'', proxy_username:'', proxy_password_encrypted:'',
    status:'active'
  }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    const [srvRes, sesRes, logRes] = await Promise.all([
      supabase.from('tool_servers').select('*').order('tool_name'),
      supabase.from('live_sessions').select('*').order('started_at', { ascending:false }),
      supabase.from('groupbuy_activity_log').select('*').order('created_at', { ascending:false }).limit(50),
    ])
    if (srvRes.data) setServers(srvRes.data)
    if (sesRes.data) setSessions(sesRes.data)
    if (logRes.data) setLogs(logRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Realtime for live sessions
    const ch = supabase.channel('live-sessions')
      .on('postgres_changes', { event:'*', schema:'public', table:'user_server_sessions' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setModal('add') }
  const openEdit = (s: ToolServer) => {
    setForm({
      tool_name: s.tool_name, server_label: s.server_label,
      session_data_encrypted:'', encryption_iv:'',
      tier_required: s.tier_required,
      max_concurrent_users: s.max_concurrent_users,
      proxy_host: s.proxy_host||'', proxy_port: String(s.proxy_port||''),
      proxy_username:'', proxy_password_encrypted:'', status: s.status
    })
    setEditId(s.id); setModal('edit')
  }

  const save = async () => {
    if (!form.server_label || !form.tool_name) return
    setSaving(true)
    const payload: any = {
      tool_name:             form.tool_name,
      server_label:          form.server_label,
      tier_required:         form.tier_required,
      max_concurrent_users:  form.max_concurrent_users,
      proxy_host:            form.proxy_host || null,
      proxy_port:            form.proxy_port ? parseInt(form.proxy_port) : null,
      proxy_username:        form.proxy_username || null,
      status:                form.status,
    }
    // Only update session data if provided
    if (form.session_data_encrypted) payload.session_data_encrypted = form.session_data_encrypted
    if (form.encryption_iv)          payload.encryption_iv          = form.encryption_iv
    if (form.proxy_password_encrypted) payload.proxy_password_encrypted = form.proxy_password_encrypted

    // For new server, session_data required
    if (!editId) {
      if (!form.session_data_encrypted || !form.encryption_iv) {
        setToast({ msg:'Session data & IV required', type:'err' })
        setSaving(false); return
      }
    }

    const res = editId
      ? await supabase.from('tool_servers').update(payload).eq('id', editId)
      : await supabase.from('tool_servers').insert(payload)

    setSaving(false)
    if (res.error) { setToast({ msg:res.error.message, type:'err' }); return }
    setToast({ msg:editId?'Server updated':'Server added', type:'ok' })
    setModal(null); load()
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('tool_servers').update({ status }).eq('id', id)
    setToast({ msg:`Server ${status}`, type:'ok' }); load()
  }

  const kickSession = async (sessionId: string) => {
    await supabase.from('user_server_sessions').update({ status:'kicked' }).eq('id', sessionId)
    // Decrement counter
    const ses = sessions.find(s=>s.id===sessionId)
    if (ses) {
      const srv = servers.find(s=>s.server_label===ses.server_label&&s.tool_name===ses.tool_name)
      if (srv) await supabase.from('tool_servers').update({ current_active_users: Math.max(0, srv.current_active_users-1) }).eq('id', srv.id)
    }
    setToast({ msg:'Session kicked', type:'ok' }); load()
  }

  const delServer = async () => {
    if (!delConfirm) return
    const res = await supabase.from('tool_servers').delete().eq('id', delConfirm.id)
    if (res.error) { setToast({ msg:'Cannot delete — has active sessions', type:'err' }); setDel(null); return }
    setToast({ msg:'Server deleted', type:'ok' }); setDel(null); load()
  }

  const loadColor = (pct: number) =>
    pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'

  const actionColor = (a: string) =>
    a==='connect'    ? 'text-emerald-500' :
    a==='disconnect' ? 'text-gray-400' :
    a==='kick'       ? 'text-red-500' :
    a==='failed'     ? 'text-red-400' : 'text-blue-400'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Servers" subtitle="Manage shared servers & live sessions" />

        {/* Tabs + Add */}
        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {([
              { id:'servers',  label:'Servers',       icon:Server },
              { id:'sessions', label:`Live (${sessions.length})`, icon:Activity },
              { id:'log',      label:'Activity Log',  icon:Shield },
            ] as const).map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={()=>setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    tab===t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  <Icon size={12}/>{t.label}
                </button>
              )
            })}
          </div>
          {tab==='servers' && (
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
              <Plus size={13}/>Add Server
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5">

          {/* ══ SERVERS TAB ══ */}
          {tab==='servers' && (
            <div className="grid grid-cols-2 gap-4">
              {loading && <div className="col-span-2 flex justify-center py-20"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
              {!loading && servers.length===0 && (
                <div className="col-span-2 text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                  <Server size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-3"/>
                  <p className="text-sm text-gray-400 mb-3">No servers yet</p>
                  <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600">
                    <Plus size={13}/>Add First Server
                  </button>
                </div>
              )}
              {servers.map(s => {
                const load = Math.round((s.current_active_users / s.max_concurrent_users) * 100) || 0
                return (
                  <div key={s.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {statusIcon(s.status)}
                        <div>
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.server_label}</div>
                          <div className="text-[10px] text-gray-400">{s.tool_name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierColor(s.tier_required)}`}>
                          {s.tier_required.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Load bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span>{s.current_active_users}/{s.max_concurrent_users} users</span>
                        <span>{load}% load</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${loadColor(load)}`}
                          style={{ width:`${load}%` }}/>
                      </div>
                    </div>

                    {/* Proxy */}
                    {s.proxy_host && (
                      <div className="text-[10px] text-gray-400 mb-3 flex items-center gap-1">
                        <Wifi size={10}/>Proxy: {s.proxy_host}:{s.proxy_port}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={()=>openEdit(s)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                        <Pencil size={10}/>Edit
                      </button>
                      {s.status!=='active' && (
                        <button onClick={()=>updateStatus(s.id,'active')}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                          <Wifi size={10}/>Activate
                        </button>
                      )}
                      {s.status==='active' && (
                        <button onClick={()=>updateStatus(s.id,'maintenance')}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                          <Wrench size={10}/>Maintenance
                        </button>
                      )}
                      <button onClick={()=>updateStatus(s.id,'banned')}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <Ban size={10}/>Ban
                      </button>
                      <button onClick={()=>setDel(s)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors ml-auto">
                        <Trash2 size={10}/>Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ══ LIVE SESSIONS TAB ══ */}
          {tab==='sessions' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              {sessions.length===0 ? (
                <div className="text-center py-16">
                  <Activity size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-3"/>
                  <p className="text-sm text-gray-400">No active sessions</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      {['User','Server','Tool','Started','Last Active','Expires','Action'].map(h=>(
                        <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s=>(
                      <tr key={s.id} className={`border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${s.inactive_minutes > 10 ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-2.5 text-xs font-medium text-gray-800 dark:text-gray-200">{s.user_email}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{s.server_label}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{s.tool_name}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(s.started_at).toLocaleTimeString()}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-semibold ${s.inactive_minutes > 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {s.inactive_minutes < 1 ? 'Just now' : `${Math.round(s.inactive_minutes)}m ago`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(s.expires_at).toLocaleTimeString()}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={()=>kickSession(s.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors">
                            <Zap size={10}/>Kick
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ══ ACTIVITY LOG TAB ══ */}
          {tab==='log' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {['Action','User','Server','Device','Time','Reason'].map(h=>(
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l=>(
                    <tr key={l.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-bold ${actionColor(l.action)}`}>{l.action}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{l.user_id?.slice(0,8)}...</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{l.server_id?.slice(0,8)}...</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{l.device_fingerprint?.slice(0,12)}...</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{l.reason||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Add/Edit Server Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {modal==='add'?'Add Server':'Edit Server'}
              </h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">

              {/* Basic info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Server Info</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Tool *</label>
                    <select value={form.tool_name} onChange={e=>setForm({...form,tool_name:e.target.value})} className={inp}>
                      {TOOLS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Server Label *</label>
                    <input value={form.server_label} onChange={e=>setForm({...form,server_label:e.target.value})}
                      placeholder="e.g. Server 1 (VIP)" className={inp}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Tier</label>
                    <select value={form.tier_required} onChange={e=>setForm({...form,tier_required:e.target.value})} className={inp}>
                      {TIERS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Max Users</label>
                    <input type="number" value={form.max_concurrent_users}
                      onChange={e=>setForm({...form,max_concurrent_users:parseInt(e.target.value)})} className={inp}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Status</label>
                    <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inp}>
                      {STATUSES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Session data */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Session Data {editId && <span className="text-gray-300">(leave empty to keep existing)</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Encrypted Session Data {!editId&&'*'}</label>
                    <textarea value={form.session_data_encrypted}
                      onChange={e=>setForm({...form,session_data_encrypted:e.target.value})}
                      placeholder="AES-256-GCM encrypted session blob..." className={inp+" resize-none h-16 font-mono text-[10px]"}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Encryption IV {!editId&&'*'}</label>
                    <input value={form.encryption_iv} onChange={e=>setForm({...form,encryption_iv:e.target.value})}
                      placeholder="Base64 IV..." className={inp+" font-mono"}/>
                  </div>
                </div>
              </div>

              {/* Proxy */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Proxy (optional)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Host</label>
                    <input value={form.proxy_host} onChange={e=>setForm({...form,proxy_host:e.target.value})}
                      placeholder="1.2.3.4" className={inp}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Port</label>
                    <input value={form.proxy_port} onChange={e=>setForm({...form,proxy_port:e.target.value})}
                      placeholder="3128" className={inp}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Username</label>
                    <input value={form.proxy_username} onChange={e=>setForm({...form,proxy_username:e.target.value})}
                      className={inp}/>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Password (encrypted)</label>
                    <div className="relative">
                      <input type={showPass?'text':'password'} value={form.proxy_password_encrypted}
                        onChange={e=>setForm({...form,proxy_password_encrypted:e.target.value})} className={inp}/>
                      <button onClick={()=>setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass?<EyeOff size={12}/>:<Eye size={12}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add'?'Add Server':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {delConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={18} className="text-red-500"/>
            </div>
            <h3 className="font-bold text-center mb-1">Delete Server?</h3>
            <p className="text-xs text-center text-gray-400 mb-5">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{delConfirm.server_label}</span> will be deleted permanently.
            </p>
            <div className="flex gap-2">
              <button onClick={()=>setDel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={delServer} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
