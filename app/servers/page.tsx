'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import {
  Plus, Server, Users, Activity, Shield, Wifi, WifiOff,
  Wrench, Ban, Check, X, AlertCircle, Eye, EyeOff,
  Trash2, Pencil, Zap, Clock, Database
} from 'lucide-react'

interface Product { id: string; name: string; category_slug: string | null }

interface ToolServer {
  id: string; tool_name: string; shop_tool_id?: string | null; server_label: string
  tier_required: string; max_concurrent_users: number
  current_active_users: number; status: string
  proxy_host?: string; proxy_port?: number; last_verified_at?: string
  free_slots?: number; load_percent?: number
  session_data_encrypted?: string | null
}
interface LiveSession {
  id: string; user_email: string; user_name: string; tool_name: string
  server_label: string; started_at: string
  last_active_at: string; expires_at: string
  inactive_minutes: number; device_fingerprint: string; status: string
}

const GOLD    = '#d99401'
const TIERS    = ['basic','vip','private']
const STATUSES = ['active','maintenance','banned']

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

const inp = "w-full px-4 py-3 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 transition-colors"
const inpSm = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all"

const statusConfig = (s: string) => {
  if (s === 'active')      return { icon: <Wifi size={13}/>,   label: 'Active',       dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' }
  if (s === 'maintenance') return { icon: <Wrench size={13}/>, label: 'Maintenance',  dot: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' }
  return                          { icon: <Ban size={13}/>,    label: 'Banned',       dot: 'bg-red-500',     text: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' }
}

const tierConfig = (t: string) => {
  if (t === 'vip')     return { label:'VIP',     cls:'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
  if (t === 'private') return { label:'Private', cls:'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400' }
  return                      { label:'Basic',   cls:'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
}

export default function ServersPage() {
  const [tab, setTab]             = useState<'servers'|'sessions'|'log'>('servers')
  const [servers, setServers]     = useState<ToolServer[]>([])
  const [sessions, setSessions]   = useState<LiveSession[]>([])
  const [logs, setLogs]           = useState<any[]>([])
  const [products, setProducts]   = useState<Product[]>([])
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving, setSaving]       = useState(false)
  const [modal, setModal]         = useState<'add'|'edit'|null>(null)
  const [editId, setEditId]       = useState<string|null>(null)
  const [showPass, setShowPass]   = useState(false)
  const [delConfirm, setDel]      = useState<ToolServer|null>(null)
  const [savedCookieCount, setSavedCookieCount] = useState<number|null>(null)

  const emptyForm = {
    shop_tool_id:'', tool_name:'', server_label:'', session_data_encrypted:'',
    tier_required:'basic', max_concurrent_users:5,
    proxy_host:'', proxy_port:'', proxy_username:'', proxy_password_encrypted:'',
    status:'active'
  }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    const [srvRes, sesRes, logRes] = await Promise.all([
      supabase.from('tool_servers').select('*').order('tool_name'),
      supabase.from('live_sessions').select('*').order('last_active_at', { ascending:false }),
      supabase.from('user_server_sessions')
        .select('id, status, started_at, last_active_at, expires_at, device_fingerprint, members(email,full_name), tool_servers(tool_name,server_label)')
        .order('started_at', { ascending:false })
        .limit(100),
    ])
    if (srvRes.data) setServers(srvRes.data)
    if (sesRes.data) setSessions(sesRes.data)
    if (logRes.data) setLogs(logRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    supabase.from('shop_tools').select('id, name, category_slug').order('name')
      .then(({ data }) => setProducts(data || []))
    const ch = supabase.channel('live-sessions')
      .on('postgres_changes', { event:'*', schema:'public', table:'user_server_sessions' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setSavedCookieCount(null); setModal('add') }
  const openEdit = (s: ToolServer) => {
    let count: number | null = null
    if (s.session_data_encrypted) {
      try {
        const p = JSON.parse(s.session_data_encrypted)
        const arr: any[] = Array.isArray(p) ? p : (p?.cookies ?? [])
        count = arr.length || null
      } catch { /* ignore */ }
    }
    setSavedCookieCount(count)
    setForm({
      shop_tool_id: s.shop_tool_id || '',
      tool_name: s.tool_name, server_label: s.server_label,
      session_data_encrypted:'',
      tier_required: s.tier_required,
      max_concurrent_users: s.max_concurrent_users,
      proxy_host: s.proxy_host||'', proxy_port: String(s.proxy_port||''),
      proxy_username:'', proxy_password_encrypted:'', status: s.status
    })
    setEditId(s.id); setModal('edit')
  }

  const save = async () => {
    if (!form.server_label || !form.shop_tool_id) {
      setToast({ msg: 'اختر الأداة واسم السيرفر', type:'err' }); return
    }
    setSaving(true)
    const selectedProduct = products.find(p => p.id === form.shop_tool_id)
    const payload: any = {
      shop_tool_id:          form.shop_tool_id || null,
      tool_name:             selectedProduct?.name || form.tool_name,
      server_label:          form.server_label,
      tier_required:         form.tier_required,
      max_concurrent_users:  form.max_concurrent_users,
      proxy_host:            form.proxy_host || null,
      proxy_port:            form.proxy_port ? parseInt(form.proxy_port) : null,
      proxy_username:        form.proxy_username || null,
      status:                form.status,
    }
    if (form.session_data_encrypted) payload.session_data_encrypted = form.session_data_encrypted
    if (form.proxy_password_encrypted) payload.proxy_password_encrypted = form.proxy_password_encrypted

    if (!editId && !form.session_data_encrypted) {
      setToast({ msg:'Cookies JSON required', type:'err' })
      setSaving(false); return
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

  const cookiesPreview = (() => {
    if (!form.session_data_encrypted) return null
    try {
      const parsed = JSON.parse(form.session_data_encrypted)
      const cookies: any[] = Array.isArray(parsed) ? parsed : (parsed?.cookies || [])
      if (!cookies.length) return null
      return cookies
    } catch { return null }
  })()

  const loadColor = (pct: number) =>
    pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981'

  const totalActive   = servers.filter(s=>s.status==='active').length
  const totalSessions = sessions.filter(s=>s.status==='active').length
  const totalUsers    = servers.reduce((a,s)=>a+s.current_active_users,0)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0D1117]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Servers" />

        <main className="flex-1 overflow-auto p-6">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label:'Active Servers', val:totalActive,   color:'#10b981', icon:<Server size={20}/>,   bg:'bg-emerald-50 dark:bg-emerald-900/20' },
              { label:'Live Sessions',  val:totalSessions, color:GOLD,      icon:<Activity size={20}/>, bg:'bg-amber-50 dark:bg-amber-900/20' },
              { label:'Online Users',   val:totalUsers,    color:'#6366f1', icon:<Users size={20}/>,    bg:'bg-indigo-50 dark:bg-indigo-900/20' },
            ].map(s=>(
              <div key={s.label} className={`rounded-2xl p-5 ${s.bg} border border-gray-100 dark:border-[#1a2233] flex items-center gap-4`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color+'20', color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-0.5">{s.label}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs + Add */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-xl p-1">
              {([
                { id:'servers',  label:'Servers',                        icon:Server },
                { id:'sessions', label:`Live Sessions (${sessions.length})`, icon:Activity },
                { id:'log',      label:'Activity Log',                   icon:Shield },
              ] as const).map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id} onClick={()=>setTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      tab===t.id ? 'text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    style={tab===t.id ? { background: GOLD } : {}}>
                    <Icon size={13}/>{t.label}
                  </button>
                )
              })}
            </div>
            {tab==='servers' && (
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-colors hover:opacity-90 shadow-sm"
                style={{background:GOLD}}>
                <Plus size={15}/> Add Server
              </button>
            )}
          </div>

          {/* ══ SERVERS TAB ══ */}
          {tab==='servers' && (
            loading ? (
              <div className="flex justify-center py-20">
                <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:`${GOLD} transparent transparent transparent`}}/>
              </div>
            ) : servers.length===0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-[#1a2233]">
                <Server size={36} className="text-gray-200 dark:text-gray-700 mb-3"/>
                <p className="text-sm text-gray-400 mb-4">No servers yet</p>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold" style={{background:GOLD}}>
                  <Plus size={14}/>Add First Server
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {servers.map(s => {
                  const loadPct  = Math.round((s.current_active_users / s.max_concurrent_users) * 100) || 0
                  const sc       = statusConfig(s.status)
                  const tc       = tierConfig(s.tier_required)
                  return (
                    <div key={s.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-[#1a2233] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Color top stripe */}
                      <div className="h-1 w-full" style={{ background: s.status==='active' ? '#10b981' : s.status==='maintenance' ? '#f59e0b' : '#ef4444' }}/>

                      <div className="p-4">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${sc.bg} ${sc.text}`}>
                              {sc.icon}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.server_label}</div>
                              <div className="text-[11px] text-gray-400 mt-0.5">{s.tool_name}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.cls}`}>{tc.label}</span>
                        </div>

                        {/* Load bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className="text-gray-500 flex items-center gap-1"><Users size={11}/> {s.current_active_users} / {s.max_concurrent_users} users</span>
                            <span className="font-bold" style={{ color: loadColor(loadPct) }}>{loadPct}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width:`${loadPct}%`, background: loadColor(loadPct) }}/>
                          </div>
                        </div>

                        {/* Proxy info */}
                        {s.proxy_host && (
                          <div className="text-[11px] text-gray-400 mb-3 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                            <Wifi size={11} className="flex-shrink-0"/>
                            <span className="font-mono truncate">{s.proxy_host}:{s.proxy_port}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button onClick={()=>openEdit(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                            <Pencil size={11}/>Edit
                          </button>
                          {s.status!=='active' && (
                            <button onClick={()=>updateStatus(s.id,'active')}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors">
                              <Wifi size={11}/>Activate
                            </button>
                          )}
                          {s.status==='active' && (
                            <button onClick={()=>updateStatus(s.id,'maintenance')}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors">
                              <Wrench size={11}/>Maintenance
                            </button>
                          )}
                          <button onClick={()=>updateStatus(s.id,'banned')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors">
                            <Ban size={11}/>Ban
                          </button>
                          <button onClick={()=>setDel(s)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors ms-auto">
                            <Trash2 size={11}/>Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ══ LIVE SESSIONS TAB ══ */}
          {tab==='sessions' && (
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-[#1a2233] overflow-hidden">
              {sessions.length===0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Activity size={36} className="mb-3 opacity-30"/>
                  <p className="text-sm">No active sessions</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{borderCollapse:'collapse'}}>
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                        {['User','Server','Tool','Started','Last Active','Status','Action'].map(h=>(
                          <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s,i)=>(
                        <tr key={s.id} className={`border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors ${s.status!=='active'?'opacity-50':''} ${i%2===0?'':'bg-gray-50/30 dark:bg-gray-800/10'}`}>
                          <td className="px-4 py-3">
                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{s.user_name||s.user_email}</div>
                            <div className="text-[10px] text-gray-400">{s.user_email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{s.server_label}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{s.tool_name}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(s.started_at).toLocaleTimeString()}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-semibold ${(s.inactive_minutes??0) > 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {(s.inactive_minutes??0) < 1 ? 'Just now' : `${Math.round(s.inactive_minutes??0)}m ago`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.status==='active' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                              s.status==='kicked' ? 'bg-red-100 dark:bg-red-500/15 text-red-500' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-400'
                            }`}>{s.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            {s.status==='active' && (
                              <button onClick={()=>kickSession(s.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors">
                                <Zap size={11}/>Kick
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══ ACTIVITY LOG TAB ══ */}
          {tab==='log' && (
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-[#1a2233] overflow-hidden">
              {logs.length===0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Shield size={36} className="mb-3 opacity-30"/>
                  <p className="text-sm">No session history</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full" style={{borderCollapse:'collapse'}}>
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                        {['Status','User','Tool','Server','Device','Time'].map(h=>(
                          <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l:any,i:number)=>(
                        <tr key={l.id} className={`border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors ${i%2===0?'':'bg-gray-50/30 dark:bg-gray-800/10'}`}>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              l.status==='active'  ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                              l.status==='kicked'  ? 'bg-red-100 dark:bg-red-500/15 text-red-500' :
                              l.status==='expired' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-500' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-400'
                            }`}>{l.status||'—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{l.members?.full_name||'—'}</div>
                            <div className="text-[10px] text-gray-400">{l.members?.email||''}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{l.tool_servers?.tool_name||'—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{l.tool_servers?.server_label||'—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">{l.device_fingerprint?.slice(0,12)||'—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(l.started_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Add/Edit Server Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setModal(null)}>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add'?'Add Server':'Edit Server'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{modal==='add'?'Configure a new server':'Update server configuration'}</p>
              </div>
              <button onClick={()=>setModal(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={14}/>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {/* Server Info */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Server Info</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tool *</label>
                    <select value={form.shop_tool_id}
                      onChange={e => {
                        const p = products.find(x => x.id === e.target.value)
                        setForm(f => ({ ...f, shop_tool_id: e.target.value, tool_name: p?.name || '' }))
                      }}
                      className={inp}>
                      <option value="">— Select tool —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Server Label *</label>
                    <input value={form.server_label} onChange={e=>setForm({...form,server_label:e.target.value})}
                      placeholder="e.g. Server 1 (VIP)" className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Tier</label>
                    <select value={form.tier_required} onChange={e=>setForm({...form,tier_required:e.target.value})} className={inp}>
                      {TIERS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Max Users</label>
                    <input type="number" value={form.max_concurrent_users}
                      onChange={e=>setForm({...form,max_concurrent_users:parseInt(e.target.value)})} className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Status</label>
                    <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={inp}>
                      {STATUSES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Session Data */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Session Data</div>
                  {editId
                    ? savedCookieCount !== null
                      ? <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">✓ {savedCookieCount} cookies saved</span>
                      : <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">⚠ No cookies</span>
                    : <span className="text-[10px] text-red-400 font-semibold">Required *</span>
                  }
                </div>
                <textarea
                  value={form.session_data_encrypted}
                  onChange={e=>setForm({...form,session_data_encrypted:e.target.value})}
                  placeholder={editId && savedCookieCount !== null
                    ? `Leave blank to keep ${savedCookieCount} existing cookies, or paste new JSON to replace`
                    : `{\n  "cookies": [\n    { "name": "session", "value": "abc123", "domain": ".quillbot.com" }\n  ]\n}`}
                  className={inp+" resize-y h-32 font-mono text-[11px] leading-relaxed"}
                  dir="ltr" spellCheck={false}
                />
                {cookiesPreview && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-500/20">
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Check size={11}/> {cookiesPreview.length} cookies detected
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {cookiesPreview.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[10px]">
                          <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 truncate" style={{maxWidth:130}}>{c.name}</span>
                          <span className="font-mono text-gray-400 truncate flex-1">{c.value}</span>
                          <span className="text-gray-400 flex-shrink-0">{(c.domain||'').replace(/^\./,'')}</span>
                          {c.httpOnly && <span className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">H</span>}
                          {c.secure   && <span className="px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">S</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Proxy */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Proxy <span className="normal-case font-normal text-gray-400">(optional)</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Host</label>
                    <input value={form.proxy_host} onChange={e=>setForm({...form,proxy_host:e.target.value})}
                      placeholder="1.2.3.4" className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Port</label>
                    <input value={form.proxy_port} onChange={e=>setForm({...form,proxy_port:e.target.value})}
                      placeholder="3128" className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Username</label>
                    <input value={form.proxy_username} onChange={e=>setForm({...form,proxy_username:e.target.value})} className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Password</label>
                    <div className="relative">
                      <input type={showPass?'text':'password'} value={form.proxy_password_encrypted}
                        onChange={e=>setForm({...form,proxy_password_encrypted:e.target.value})} className={inp}/>
                      <button onClick={()=>setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass?<EyeOff size={14}/>:<Eye size={14}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-[2] py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors hover:opacity-90"
                style={{background:GOLD}}>
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving…</>
                  : <><Check size={15}/>{modal==='add'?'Add Server':'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {delConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setDel(null)}>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={e=>e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500"/>
            </div>
            <h3 className="font-bold text-center text-gray-900 dark:text-white mb-1">Delete Server?</h3>
            <p className="text-xs text-center text-gray-400 mb-5">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{delConfirm.server_label}</span> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={()=>setDel(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={delServer} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
