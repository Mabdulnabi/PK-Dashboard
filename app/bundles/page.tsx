'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar  from '@/components/layout/Topbar'
import {
  Plus, Pencil, Trash2, X, Check, AlertCircle, Layers,
  ToggleLeft, ToggleRight, Package,
} from 'lucide-react'

interface Tool   { id: string; name: string; image_url: string | null; category_slug: string }
interface Bundle {
  id: string; name: string; image_url: string | null
  price_egp: number; is_active: boolean; items: Tool[]
}

const inp = 'w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check size={15} /> : <AlertCircle size={15} />}{msg}
    </div>
  )
}

const SLUG_COLOR: Record<string, string> = { shared: '#3B82F6', private: '#8B5CF6', bundle: '#F59E0B' }

export default function BundlesPage() {
  const router = useRouter()
  const [bundles,  setBundles]  = useState<Bundle[]>([])
  const [allTools, setAllTools] = useState<Tool[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'add' | 'edit' | null>(null)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [delId,    setDelId]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [confirming, setConfirming] = useState<string|null>(null)

  const emptyForm = { name: '', price_egp: '', image_url: '', selectedIds: [] as string[] }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (!data.session) router.push('/auth/login') })
  }, [router])

  const load = async () => {
    setLoading(true)
    const [bRes, tRes, payRes] = await Promise.all([
      fetch('/api/admin/bundles').then(r => r.json()),
      supabase.from('shop_tools').select('id, name, image_url, category_slug')
        .in('category_slug', ['shared', 'private']).eq('is_active', true).order('name'),
      supabase.from('payments')
        .select('id, amount, currency, gateway, transaction_id, created_at, user_id, bundle_id, membership_plans(name), members(full_name, email)')
        .not('bundle_id', 'is', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])
    setBundles(bRes.bundles || [])
    setAllTools(tRes.data || [])
    setPayments(payRes.data || [])
    setLoading(false)
  }

  const confirmBundlePayment = async (paymentId: string) => {
    setConfirming(paymentId)
    const res  = await fetch('/api/admin/bundles/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId }),
    })
    const data = await res.json()
    setConfirming(null)
    if (!res.ok) { setToast({ msg: data.error || 'Error', type: 'err' }); return }
    setToast({ msg: `Bundle activated — ${data.tools_activated} tools`, type: 'ok' })
    load()
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal('add') }

  const openEdit = (b: Bundle) => {
    setForm({ name: b.name, price_egp: String(b.price_egp), image_url: b.image_url || '', selectedIds: b.items.map(i => i.id) })
    setEditId(b.id); setModal('edit')
  }

  const toggleTool = (id: string) =>
    setForm(f => ({ ...f, selectedIds: f.selectedIds.includes(id) ? f.selectedIds.filter(x => x !== id) : [...f.selectedIds, id] }))

  const save = async () => {
    if (!form.name.trim()) { setToast({ msg: 'Bundle name required', type: 'err' }); return }
    if (!form.selectedIds.length) { setToast({ msg: 'Select at least one tool', type: 'err' }); return }
    setSaving(true)
    const res = await fetch('/api/admin/bundles', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId || undefined, name: form.name.trim(), price_egp: Number(form.price_egp) || 0, image_url: form.image_url.trim() || null, tool_ids: form.selectedIds }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setToast({ msg: data.error || 'Error', type: 'err' }); return }
    setToast({ msg: editId ? 'Bundle updated' : 'Bundle created', type: 'ok' })
    setModal(null); load()
  }

  const toggleActive = async (b: Bundle) => {
    await fetch('/api/admin/bundles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, is_active: !b.is_active }) })
    load()
  }

  const deleteBundle = async () => {
    if (!delId) return
    const res = await fetch('/api/admin/bundles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: delId }) })
    const data = await res.json()
    setDelId(null)
    if (!res.ok) { setToast({ msg: data.error || 'Error', type: 'err' }); return }
    setToast({ msg: 'Bundle deleted', type: 'ok' }); load()
  }

  const sharedTools  = allTools.filter(t => t.category_slug === 'shared')
  const privateTools = allTools.filter(t => t.category_slug === 'private')

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0D1117] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Bundles" subtitle="Combine tools into one offer" onAdd={openAdd} addLabel="New Bundle" />

        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bundles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm flex items-center justify-center">
                <Layers size={28} className="text-gray-300 dark:text-gray-700" />
              </div>
              <p className="text-sm text-gray-400">No bundles yet</p>
              <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
                <Plus size={14} /> Create First Bundle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bundles.map(b => (
                <div key={b.id} className="rounded-2xl overflow-hidden bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm">
                  <div className="h-1 w-full" style={{ background: b.is_active ? '#EF4444' : '#D1D5DB' }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {b.image_url ? (
                          <img src={b.image_url} alt={b.name} className="w-10 h-10 object-contain rounded-lg" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#1a2233] flex items-center justify-center">
                            <Layers size={18} className="text-gray-400 dark:text-gray-600" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{b.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{b.price_egp.toLocaleString()} EGP</div>
                        </div>
                      </div>
                      <button onClick={() => toggleActive(b)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        {b.is_active
                          ? <ToggleRight size={22} className="text-emerald-500" />
                          : <ToggleLeft  size={22} className="text-gray-400" />}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {b.items.length === 0 ? (
                        <span className="text-[11px] text-gray-400">No tools</span>
                      ) : b.items.map(t => (
                        <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                          style={{ background: (SLUG_COLOR[t.category_slug] || '#6B7280') + '15', color: SLUG_COLOR[t.category_slug] || '#9CA3AF' }}>
                          {t.image_url && <img src={t.image_url} alt={t.name} className="w-3 h-3 object-contain" />}
                          {t.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => openEdit(b)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-[#1a2233] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => setDelId(b.id)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending bundle payments */}
          {payments.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Package size={15} className="text-amber-500"/>
                Pending Bundle Payments
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">{payments.length}</span>
              </h2>
              <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#0D1117]">
                      {['Member','Bundle','Amount','Gateway','Ref','Date',''].map(h=>(
                        <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p:any)=>(
                      <tr key={p.id} className="border-t border-gray-50 dark:border-[#1a2233] hover:bg-gray-50 dark:hover:bg-[#1a2233]/30">
                        <td className="px-4 py-3">
                          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{(p.members as any)?.full_name || '—'}</div>
                          <div className="text-[10px] text-gray-400">{(p.members as any)?.email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{(p.membership_plans as any)?.name || '—'}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-800 dark:text-gray-200">{p.amount} {p.currency?.toUpperCase()}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{p.gateway}</td>
                        <td className="px-4 py-3 text-[10px] text-gray-400 font-mono">{p.transaction_id || '—'}</td>
                        <td className="px-4 py-3 text-[10px] text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={()=>confirmBundlePayment(p.id)}
                            disabled={confirming===p.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {confirming===p.id
                              ? <div className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin"/>
                              : <Check size={11}/>
                            }
                            Confirm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233]" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-gray-100 dark:border-[#1a2233]">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{modal === 'add' ? 'New Bundle' : 'Edit Bundle'}</h2>
              <button onClick={() => setModal(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Bundle Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Student Pack" className={inp} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Price (EGP)</label>
                  <input type="number" value={form.price_egp} onChange={e => setForm(f => ({ ...f, price_egp: e.target.value }))} placeholder="0" className={inp} />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Image URL (optional)</label>
                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." dir="ltr" className={inp} />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Select Tools * <span className="text-gray-400 dark:text-gray-600 normal-case">({form.selectedIds.length} selected)</span>
                </label>

                {[{ label: 'Shared', tools: sharedTools }, { label: 'Private', tools: privateTools }].map(group => (
                  group.tools.length > 0 && (
                    <div key={group.label} className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                        style={{ color: group.label === 'Shared' ? '#3B82F6' : '#8B5CF6' }}>
                        {group.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {group.tools.map(t => {
                          const selected = form.selectedIds.includes(t.id)
                          return (
                            <button key={t.id} onClick={() => toggleTool(t.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${
                                selected
                                  ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500 text-red-600 dark:text-red-400'
                                  : 'bg-gray-50 dark:bg-[#1a2233] border-gray-200 dark:border-[#1a2233] text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}>
                              {t.image_url
                                ? <img src={t.image_url} alt={t.name} className="w-5 h-5 object-contain rounded flex-shrink-0" />
                                : <Package size={14} className="flex-shrink-0 text-gray-400" />}
                              <span className="truncate">{t.name}</span>
                              {selected && <Check size={12} className="ml-auto flex-shrink-0 text-red-500" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 flex-shrink-0 border-t border-gray-100 dark:border-[#1a2233]">
              <button onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#1a2233] text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-[2] py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Check size={14} />{modal === 'add' ? 'Create Bundle' : 'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDelId(null)}>
          <div className="rounded-2xl w-full max-w-sm p-6 shadow-2xl bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233]" onClick={e => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white text-center mb-1">Delete Bundle?</h3>
            <p className="text-xs text-gray-500 text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDelId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#1a2233] text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={deleteBundle}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
