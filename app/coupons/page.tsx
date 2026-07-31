'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, X, Check, AlertCircle } from 'lucide-react'

interface Tool { id: string; name: string; image_url: string | null }
interface Usage { id: string; member_id: string; tool_id: string | null; used_at: string; members: { full_name: string; email: string } | null }
interface Coupon {
  id: string; code: string; description: string | null; type: string; value: number
  max_uses: number; used_count: number; expires_at: string | null; is_active: boolean
  tool_ids: string[] | null; created_at: string; coupon_usages: Usage[]
}

const EMPTY_FORM = { code: '', description: '', type: 'discount', value: '', max_uses: '100', expires_at: '', tool_ids: [] as string[], is_active: true }

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>{type === 'ok' ? <Check size={15}/> : <AlertCircle size={15}/>}{msg}</div>
}

export default function CouponsPage() {
  const router = useRouter()
  const [coupons,   setCoupons]   = useState<Coupon[]>([])
  const [tools,     setTools]     = useState<Tool[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState({ ...EMPTY_FORM })
  const [saving,    setSaving]    = useState(false)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [toast,     setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/auth/login')
    })
  }, [router])

  const load = () => {
    setLoading(true)
    fetch('/api/coupons').then(r => r.json()).then(d => {
      setCoupons(d.coupons || [])
      setTools(d.tools || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleTool = (id: string) =>
    setForm(f => ({ ...f, tool_ids: f.tool_ids.includes(id) ? f.tool_ids.filter(x => x !== id) : [...f.tool_ids, id] }))

  const save = async () => {
    setFormError(''); setSaving(true)
    const res  = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setFormError(data.error || 'Error'); return }
    setShowForm(false); setForm({ ...EMPTY_FORM })
    setToast({ msg: `Coupon "${data.coupon?.code}" created`, type: 'ok' })
    load()
  }

  const toggle = async (c: Coupon) => {
    await fetch(`/api/coupons/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !c.is_active }) })
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this coupon?')) return
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    setToast({ msg: 'Coupon deleted', type: 'ok' })
    load()
  }

  const toolMap = Object.fromEntries(tools.map(t => [t.id, t]))

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Coupons" subtitle="Create and manage discount codes"/>

        <div className="flex-1 overflow-auto p-6">

          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</p>
            <button onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM }); setFormError('') }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
              <Plus size={16}/> New Coupon
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">New Coupon</h2>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  <X size={14}/>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Code *</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SAVE20" dir="ltr"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono outline-none focus:border-red-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Summer sale 20%"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-red-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-red-500">
                    <option value="discount">Discount (%)</option>
                    <option value="fixed">Fixed Amount (EGP)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                    {form.type === 'discount' ? 'Percentage (%)' : 'Amount (EGP)'} *
                  </label>
                  <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    type="number" min="0" max={form.type === 'discount' ? '100' : undefined} placeholder={form.type === 'discount' ? '20' : '50'} dir="ltr"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-red-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Max Uses</label>
                  <input value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    type="number" min="1" placeholder="100" dir="ltr"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-red-500"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Expires At</label>
                  <input value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    type="date" dir="ltr"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-red-500"/>
                </div>
              </div>

              {/* Tool selector */}
              {tools.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                    Applicable Tools <span className="font-normal normal-case text-gray-400">(empty = all tools)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {tools.map(t => {
                      const sel = form.tool_ids.includes(t.id)
                      return (
                        <button key={t.id} onClick={() => toggleTool(t.id)} type="button"
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all text-left ${sel ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                          {t.image_url
                            ? <img src={t.image_url} alt="" className="w-5 h-5 object-contain rounded flex-shrink-0"/>
                            : <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">{t.name.slice(0, 2)}</div>
                          }
                          <span className="truncate flex-1">{t.name}</span>
                          {sel && <Check size={12} className="flex-shrink-0"/>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {formError && <p className="text-sm text-red-500 mb-3">{formError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving || !form.code || !form.value}
                  className="flex-[2] py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                  {saving ? 'Saving...' : 'Create Coupon'}
                </button>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">No coupons yet — create one above</div>
          ) : (
            <div className="flex flex-col gap-3">
              {coupons.map(c => {
                const isExpanded = expanded === c.id
                const toolNames  = (c.tool_ids || []).map(id => toolMap[id]?.name).filter(Boolean)
                const usagePct   = c.max_uses > 0 ? Math.min(100, (c.used_count / c.max_uses) * 100) : 0
                const expired    = c.expires_at && new Date(c.expires_at) < new Date()
                return (
                  <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-gray-900 dark:text-white font-mono tracking-wide" dir="ltr">{c.code}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.type === 'discount' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
                            {c.type === 'discount' ? `${c.value}% OFF` : `${c.value} EGP OFF`}
                          </span>
                          {!c.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">Disabled</span>}
                          {expired    && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-500">Expired</span>}
                        </div>
                        {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${usagePct}%` }}/>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{c.used_count}/{c.max_uses} used</span>
                          </div>
                          {c.expires_at && <span className="text-xs text-gray-400">Exp: {new Date(c.expires_at).toLocaleDateString()}</span>}
                          {toolNames.length > 0
                            ? <span className="text-xs text-gray-400">Tools: {toolNames.join(', ')}</span>
                            : <span className="text-xs text-gray-400">All tools</span>
                          }
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => toggle(c)} title={c.is_active ? 'Disable' : 'Enable'}>
                          {c.is_active
                            ? <ToggleRight size={22} className="text-emerald-500 hover:opacity-80 transition-opacity"/>
                            : <ToggleLeft  size={22} className="text-gray-400 hover:text-gray-600 transition-colors"/>}
                        </button>
                        <button onClick={() => del(c.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={15}/>
                        </button>
                        {(c.coupon_usages?.length ?? 0) > 0 && (
                          <button onClick={() => setExpanded(isExpanded ? null : c.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            {isExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Usage history */}
                    {isExpanded && (c.coupon_usages?.length ?? 0) > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                          Usage History ({c.coupon_usages.length})
                        </p>
                        <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                          {c.coupon_usages.map(u => (
                            <div key={u.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                              <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {u.members?.full_name?.slice(0, 1).toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{u.members?.full_name || 'Unknown'}</div>
                                <div className="text-[11px] text-gray-400 truncate">{u.members?.email}</div>
                              </div>
                              {u.tool_id && toolMap[u.tool_id] && (
                                <span className="text-[11px] text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                                  {toolMap[u.tool_id].name}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 flex-shrink-0">
                                {new Date(u.used_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}
