'use client'
// app/servers/page.tsx

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Pencil, Trash2, X, Check, Server, Users, ChevronDown, ChevronUp, AlertCircle, Cookie, Database, LayoutList } from 'lucide-react'

const TIER_OPTIONS = ['basic','vip','private']
const STATUS_OPTIONS = ['active','maintenance','full','disabled']

const STATUS_COLORS: Record<string,string> = {
  active:      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  maintenance: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  full:        'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  disabled:    'bg-gray-500/10 text-gray-400 border border-gray-700',
}

interface ServerRow {
  id: string
  shop_tool_id: string | null
  tool_name: string
  server_label: string
  session_data_encrypted: string | null
  tier_required: string
  max_concurrent_users: number
  current_active_users: number
  proxy_host: string | null
  proxy_port: number | null
  proxy_username: string | null
  proxy_password_encrypted: string | null
  status: string
}

const EMPTY: any = {
  shop_tool_id: '',
  tool_name: '',
  server_label: '',
  session_data_encrypted: '',
  tier_required: 'basic',
  max_concurrent_users: 5,
  proxy_host: '',
  proxy_port: '',
  proxy_username: '',
  proxy_password_encrypted: '',
  status: 'active',
}

interface Product { id: string; name: string; image_url: string | null; category_slug: string }

export default function ServersPage() {
  const [servers,  setServers]  = useState<ServerRow[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<string|null>(null)
  const [form,     setForm]     = useState<any>({ ...EMPTY })
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState<{type:'success'|'error';text:string}|null>(null)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [jsonErr,  setJsonErr]  = useState('')

  const fetchServers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/servers')
    const data = await res.json()
    setServers(data.servers || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchServers()
    fetch('/api/admin/products').then(r => r.json()).then(d => {
      setProducts(d.products || [])
    })
  }, [fetchServers])

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  function openNew() {
    setForm({ ...EMPTY }); setEditId(null); setJsonErr(''); setShowForm(true)
  }

  function openEdit(s: ServerRow) {
    setForm({
      shop_tool_id: s.shop_tool_id || '',
      tool_name: s.tool_name,
      server_label: s.server_label,
      session_data_encrypted: s.session_data_encrypted || '',
      tier_required: s.tier_required,
      max_concurrent_users: s.max_concurrent_users,
      proxy_host: s.proxy_host || '',
      proxy_port: s.proxy_port || '',
      proxy_username: s.proxy_username || '',
      proxy_password_encrypted: s.proxy_password_encrypted || '',
      status: s.status,
    })
    setEditId(s.id); setJsonErr(''); setShowForm(true)
  }

  async function save() {
    if (!form.tool_name) { setMsg({ type:'error', text:'اختر الأداة أولاً' }); return }
    if (!form.server_label.trim()) { setMsg({ type:'error', text:'Server label مطلوب' }); return }
    if (form.session_data_encrypted) {
      try { JSON.parse(form.session_data_encrypted) } catch { setJsonErr('Session Data مش JSON صالح'); return }
    }
    setSaving(true); setMsg(null)

    const payload = {
      shop_tool_id: form.shop_tool_id || null,
      tool_name: form.tool_name,
      server_label: form.server_label.trim(),
      session_data_encrypted: form.session_data_encrypted || null,
      tier_required: form.tier_required,
      max_concurrent_users: parseInt(form.max_concurrent_users) || 5,
      proxy_host: form.proxy_host || null,
      proxy_port: form.proxy_port ? parseInt(form.proxy_port) : null,
      proxy_username: form.proxy_username || null,
      proxy_password_encrypted: form.proxy_password_encrypted || null,
      status: form.status,
    }

    const res = editId
      ? await fetch('/api/admin/servers', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: editId, ...payload }) })
      : await fetch('/api/admin/servers', { method:'POST',  headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setMsg({ type:'error', text: data.error }); return }
    setMsg({ type:'success', text: editId ? 'تم التعديل ✓' : 'تم الإضافة ✓' })
    setShowForm(false); setEditId(null); fetchServers()
  }

  async function del(id: string) {
    if (!confirm('مؤكد الحذف؟')) return
    await fetch('/api/admin/servers', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) })
    fetchServers()
  }

  async function toggleStatus(s: ServerRow) {
    const next = s.status === 'active' ? 'disabled' : 'active'
    await fetch('/api/admin/servers', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: s.id, status: next }) })
    fetchServers()
  }

  const grouped = servers.reduce((acc, s) => {
    if (!acc[s.tool_name]) acc[s.tool_name] = []
    acc[s.tool_name].push(s)
    return acc
  }, {} as Record<string,ServerRow[]>)

  const inp = "w-full bg-[#1F2937] text-white text-sm rounded-lg px-3 py-2.5 border border-[#374151] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'#111827' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="السيرفرات" subtitle="إدارة سيرفرات الأدوات وبيانات الجلسات" />

        <div className="flex-1 overflow-auto p-6">

          {msg && (
            <div className={`mb-5 px-4 py-3 rounded-lg text-sm border ${
              msg.type==='success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-red-500/10 text-red-300 border-red-500/20'
            }`}>{msg.text}</div>
          )}

          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-500 text-sm">{servers.length} سيرفر</span>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors">
              <Plus size={15}/> إضافة سيرفر
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              <Server size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm mb-3">مفيش سيرفرات لحد دلوقتي</p>
              <button onClick={openNew} className="text-blue-400 text-sm underline">أضف أول سيرفر</button>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([toolName, toolServers]) => (
                <div key={toolName} style={{ background:'#1F2937', border:'1px solid #374151' }} className="rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
                    onClick={() => setExpanded(expanded===toolName ? null : toolName)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background:'#374151' }}>🔧</div>
                      <span className="text-white font-bold text-sm">{toolName}</span>
                      <span className="text-xs text-gray-500">{toolServers.length} سيرفر</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Users size={12}/>
                        {toolServers.reduce((a,s)=>a+s.current_active_users,0)} / {toolServers.reduce((a,s)=>a+s.max_concurrent_users,0)}
                      </div>
                      {expanded===toolName
                        ? <ChevronUp size={15} className="text-gray-500"/>
                        : <ChevronDown size={15} className="text-gray-500"/>
                      }
                    </div>
                  </button>

                  {expanded===toolName && (
                    <div style={{ borderTop:'1px solid #374151' }}>
                      {toolServers.map(s => (
                        <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors" style={{ borderBottom:'1px solid #374151' }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-white">{s.server_label}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">{s.tier_required}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1"><Users size={10}/>{s.current_active_users}/{s.max_concurrent_users}</span>
                              {s.proxy_host && <span>🌐 {s.proxy_host}:{s.proxy_port}</span>}
                              {s.session_data_encrypted && <span className="text-emerald-400">✓ Session data</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={()=>toggleStatus(s)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.status==='active'?'bg-emerald-500':'bg-gray-600'}`}>
                              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${s.status==='active'?'translate-x-4':'translate-x-0.5'}`}/>
                            </button>
                            <button onClick={()=>openEdit(s)} className="p-1.5 rounded-lg text-blue-300 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                              <Pencil size={14}/>
                            </button>
                            <button onClick={()=>del(s.id)} className="p-1.5 rounded-lg text-red-300 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setShowForm(false)}/>
          <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ background:'#1F2937', border:'1px solid #374151' }}>

            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid #374151' }}>
              <h2 className="text-white font-bold">{editId ? 'تعديل سيرفر' : 'إضافة سيرفر جديد'}</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={18}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">الأداة</label>
                  <select
                    value={form.shop_tool_id || ''}
                    onChange={e => {
                      const p = products.find(x => x.id === e.target.value)
                      setForm((prev: any) => ({ ...prev, shop_tool_id: e.target.value, tool_name: p?.name || '' }))
                    }}
                    className={inp}
                  >
                    <option value="">— اختر منتج —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.category_slug ? ` (${p.category_slug})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">اسم السيرفر</label>
                  <input value={form.server_label} onChange={e=>set('server_label',e.target.value)}
                    placeholder="مثال: Server 1 — Egypt" className={inp}/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Tier المطلوب</label>
                  <select value={form.tier_required} onChange={e=>set('tier_required',e.target.value)} className={inp}>
                    {TIER_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">أقصى مستخدمين</label>
                  <input type="number" value={form.max_concurrent_users} onChange={e=>set('max_concurrent_users',e.target.value)} className={inp}/>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">الحالة</label>
                  <select value={form.status} onChange={e=>set('status',e.target.value)} className={inp}>
                    {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Session Data (JSON)</label>
                <textarea
                  value={form.session_data_encrypted}
                  onChange={e=>{ set('session_data_encrypted',e.target.value); setJsonErr('') }}
                  rows={8} dir="ltr"
                  placeholder={'{\n  "cookies": [\n    { "name": "session", "value": "abc123", "domain": ".quillbot.com", "path": "/" }\n  ],\n  "localStorage": {},\n  "indexedDB": {}\n}'}
                  className={`${inp} font-mono text-xs resize-none`}
                />
                {jsonErr && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{jsonErr}</p>}
                <p className="text-[11px] text-gray-600 mt-1">Admin Extension → Sessions tab → سحب تلقائي → نسخ JSON</p>

                {/* Cookies Preview */}
                {(() => {
                  if (!form.session_data_encrypted) return null
                  let parsed: any = null
                  try { parsed = JSON.parse(form.session_data_encrypted) } catch { return null }
                  const cookies: any[] = Array.isArray(parsed) ? parsed : (parsed?.cookies || [])
                  const lsKeys = Object.keys(parsed?.localStorage || {}).length
                  const idbCount = (parsed?.indexedDB || []).length
                  if (!cookies.length && !lsKeys && !idbCount) return null
                  return (
                    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid #374151' }}>
                      {/* Summary bar */}
                      <div className="flex items-center gap-4 px-4 py-2.5 text-xs" style={{ background: '#111827', borderBottom: '1px solid #374151' }}>
                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <Cookie size={12}/> {cookies.length} cookie
                        </span>
                        {lsKeys > 0 && <span className="flex items-center gap-1.5 text-blue-400 font-semibold"><LayoutList size={12}/> {lsKeys} localStorage</span>}
                        {idbCount > 0 && <span className="flex items-center gap-1.5 text-purple-400 font-semibold"><Database size={12}/> {idbCount} IDB</span>}
                      </div>
                      {/* Cookie rows */}
                      <div className="max-h-48 overflow-y-auto">
                        {cookies.map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs hover:bg-white/5" style={{ borderBottom: i < cookies.length - 1 ? '1px solid #1F2937' : undefined }}>
                            <span className="font-mono font-semibold text-amber-300 truncate min-w-0 flex-shrink-0" style={{ maxWidth: 160 }}>{c.name}</span>
                            <span className="font-mono text-gray-400 truncate flex-1 min-w-0">{c.value}</span>
                            <span className="text-gray-600 flex-shrink-0">{(c.domain || '').replace(/^\./, '')}</span>
                            {c.httpOnly && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 flex-shrink-0">httpOnly</span>}
                            {c.secure && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex-shrink-0">secure</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-3 pt-4" style={{ borderTop:'1px solid #374151' }}>Proxy (اختياري)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Host</label>
                    <input value={form.proxy_host} onChange={e=>set('proxy_host',e.target.value)} placeholder="proxy.example.com" className={inp} dir="ltr"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Port</label>
                    <input type="number" value={form.proxy_port} onChange={e=>set('proxy_port',e.target.value)} placeholder="8080" className={inp}/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Username</label>
                    <input value={form.proxy_username} onChange={e=>set('proxy_username',e.target.value)} className={inp} dir="ltr"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Password</label>
                    <input type="password" value={form.proxy_password_encrypted} onChange={e=>set('proxy_password_encrypted',e.target.value)} className={inp} dir="ltr"/>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop:'1px solid #374151' }}>
              <button onClick={()=>setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
                style={{ border:'1px solid #374151' }}>
                إلغاء
              </button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Check size={15}/>}
                {editId ? 'حفظ التعديلات' : 'إضافة السيرفر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
