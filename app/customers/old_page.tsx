'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { format } from 'date-fns'
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, User,
  Phone, Mail, Pencil, Trash2, Eye, X, Check, AlertCircle
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
interface Customer {
  id: string; full_name: string; phone?: string
  email?: string; telegram?: string; notes?: string; created_at: string
}
interface Subscription {
  id: string; customer_id: string; product_id: string; account_id?: string
  period: string; amount_egp: number; payment_method: string
  start_date: string; end_date: string; status: string; notes?: string
  product_name?: string; product_color?: string; account_email?: string
  days_remaining?: number
}
interface Product { id: string; name: string; color: string }
interface Account { id: string; email: string; product_id: string; total_slots: number; used_slots: number }

const PERIODS   = ['1 Month','3 Months','6 Months','1 Year']
const PAYMENTS  = ['InstaPay','Vodafone Cash','Binance Pay','Bybit','BEP20','PayPal','Cash','Other']
const STATUSES  = ['active','expired','cancelled','pending']

function calcEnd(start: string, period: string) {
  const d = new Date(start)
  if (period === '1 Month')   d.setDate(d.getDate() + 30)
  if (period === '3 Months')  d.setDate(d.getDate() + 91)
  if (period === '6 Months')  d.setDate(d.getDate() + 182)
  if (period === '1 Year')    d.setDate(d.getDate() + 365)
  return d.toISOString().slice(0, 10)
}

function statusStyle(days: number) {
  if (days < 0)   return { bg:'#FEE2E2', color:'#991B1B', label:'Expired' }
  if (days <= 7)  return { bg:'#FEF3C7', color:'#92400E', label:'Expiring' }
  return { bg:'#DCFCE7', color:'#166534', label:'Active' }
}

// ── Small reusable input ──────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</label>
      {children}
    </div>
  )
}
const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"
const sel = inp + " cursor-pointer"

// ── Toast ─────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'ok'|'err'; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all
      ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check size={15}/> : <AlertCircle size={15}/>}
      {msg}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
export default function CustomersPage() {
  const [customers, setCustomers]   = useState<Customer[]>([])
  const [subs, setSubs]             = useState<Record<string, Subscription[]>>({})
  const [products, setProducts]     = useState<Product[]>([])
  const [accounts, setAccounts]     = useState<Account[]>([])
  const [loading, setLoading]       = useState(true)
  const [q, setQ]                   = useState('')
  const [filterStatus, setFilter]   = useState('all')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [toast, setToast]           = useState<{msg:string;type:'ok'|'err'}|null>(null)

  // Modals
  const [custModal, setCustModal]   = useState<'add'|'edit'|null>(null)
  const [subModal, setSubModal]     = useState<{mode:'add'|'edit'; customerId: string; sub?: Subscription}|null>(null)
  const [delConfirm, setDelConfirm] = useState<{type:'customer'|'sub'; id: string; name: string}|null>(null)

  // Customer form
  const emptyCust = { full_name:'', phone:'', email:'', telegram:'', notes:'' }
  const [custForm, setCustForm]     = useState(emptyCust)
  const [editingCustId, setEditId]  = useState<string|null>(null)

  // Subscription form
  const emptySub = {
    product_id:'', account_id:'', period:'1 Month',
    amount_egp:'', payment_method:'InstaPay',
    start_date: new Date().toISOString().slice(0,10),
    end_date:'', status:'active', notes:''
  }
  const [subForm, setSubForm] = useState(emptySub)
  const [saving, setSaving]   = useState(false)

  // ── Load ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [cRes, pRes, aRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('id,name,color').eq('is_active', true).order('name'),
      supabase.from('my_accounts').select('id,email,product_id,total_slots,used_slots').eq('is_active', true),
    ])
    if (cRes.data) setCustomers(cRes.data)
    if (pRes.data) setProducts(pRes.data)
    if (aRes.data) setAccounts(aRes.data)
    setLoading(false)
  }, [])

  const loadSubs = useCallback(async (customerId: string) => {
    const { data } = await supabase.from('subscriptions_full').select('*')
      .eq('customer_id', customerId).order('created_at', { ascending: false })
    if (data) setSubs(prev => ({ ...prev, [customerId]: data }))
  }, [])

  useEffect(() => { load() }, [load])

  const expand = (id: string) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id); loadSubs(id)
  }

  // ── Customer CRUD ─────────────────────────────────────────
  const openAddCust = () => { setCustForm(emptyCust); setEditId(null); setCustModal('add') }
  const openEditCust = (c: Customer) => {
    setCustForm({ full_name: c.full_name, phone: c.phone||'', email: c.email||'', telegram: c.telegram||'', notes: c.notes||'' })
    setEditId(c.id); setCustModal('edit')
  }

  const saveCust = async () => {
    if (!custForm.full_name.trim()) return
    setSaving(true)
    const payload = { full_name: custForm.full_name, phone: custForm.phone||null, email: custForm.email||null, telegram: custForm.telegram||null, notes: custForm.notes||null }
    const res = editingCustId
      ? await supabase.from('customers').update(payload).eq('id', editingCustId)
      : await supabase.from('customers').insert(payload)
    setSaving(false)
    if (res.error) { setToast({ msg: res.error.message, type:'err' }); return }
    setToast({ msg: editingCustId ? 'Customer updated' : 'Customer added', type:'ok' })
    setCustModal(null); load()
  }

  const deleteCust = async (id: string) => {
    await supabase.from('customers').delete().eq('id', id)
    setToast({ msg: 'Customer deleted', type:'ok' })
    setDelConfirm(null); load()
    if (expanded === id) setExpanded(null)
  }

  // ── Subscription CRUD ─────────────────────────────────────
  const openAddSub = (customerId: string) => {
    setSubForm({ ...emptySub, end_date: calcEnd(emptySub.start_date, '1 Month') })
    setSubModal({ mode:'add', customerId })
  }
  const openEditSub = (customerId: string, sub: Subscription) => {
    setSubForm({
      product_id: sub.product_id, account_id: sub.account_id||'',
      period: sub.period, amount_egp: String(sub.amount_egp),
      payment_method: sub.payment_method, start_date: sub.start_date,
      end_date: sub.end_date, status: sub.status, notes: sub.notes||''
    })
    setSubModal({ mode:'edit', customerId, sub })
  }

  const updateSubEnd = (field: 'start_date'|'period', val: string) => {
    const next = { ...subForm, [field]: val }
    next.end_date = calcEnd(next.start_date, next.period)
    setSubForm(next)
  }

  const saveSub = async () => {
    if (!subForm.product_id || !subForm.amount_egp) return
    setSaving(true)
    const payload = {
      customer_id: subModal!.customerId,
      product_id: subForm.product_id,
      account_id: subForm.account_id || null,
      period: subForm.period,
      amount_egp: parseFloat(subForm.amount_egp),
      payment_method: subForm.payment_method,
      start_date: subForm.start_date,
      end_date: subForm.end_date,
      status: subForm.status,
      notes: subForm.notes || null,
    }
    const res = subModal?.sub
      ? await supabase.from('subscriptions').update(payload).eq('id', subModal.sub.id)
      : await supabase.from('subscriptions').insert(payload)
    setSaving(false)
    if (res.error) { setToast({ msg: res.error.message, type:'err' }); return }
    setToast({ msg: subModal?.sub ? 'Subscription updated' : 'Subscription added', type:'ok' })
    setSubModal(null); loadSubs(subModal!.customerId)
  }

  const deleteSub = async (subId: string, customerId: string) => {
    await supabase.from('subscriptions').delete().eq('id', subId)
    setToast({ msg: 'Subscription deleted', type:'ok' })
    setDelConfirm(null); loadSubs(customerId)
  }

  // ── Filter ────────────────────────────────────────────────
  const filtered = customers.filter(c => {
    const qm = !q || c.full_name.toLowerCase().includes(q.toLowerCase())
      || (c.phone||'').includes(q) || (c.email||'').toLowerCase().includes(q.toLowerCase())
    return qm
  })

  const filtAccounts = accounts.filter(a => a.product_id === subForm.product_id)

  // ══════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Customers" subtitle={`${customers.length} customers`}
          onAdd={openAddCust} addLabel="New Customer" />

        {/* Search + filter bar */}
        <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, phone, email..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-red-400 transition-colors text-gray-800 dark:text-gray-200" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Filter size={12} />{filtered.length} results
          </div>
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-auto p-5 flex flex-col gap-3">
          {loading && <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <User size={24} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">No customers yet</p>
              <button onClick={openAddCust} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors">
                <Plus size={13} />Add First Customer
              </button>
            </div>
          )}

          {filtered.map(c => {
            const isOpen = expanded === c.id
            const cSubs  = subs[c.id] || []
            return (
              <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden transition-all">
                {/* Customer row */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => expand(c.id)}>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-sm font-bold text-red-500 flex-shrink-0">
                    {c.full_name.slice(0,1).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.full_name}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.phone && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Phone size={9}/>{c.phone}</span>}
                      {c.email && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Mail size={9}/>{c.email}</span>}
                      {!c.phone && !c.email && <span className="text-[10px] text-gray-300">No contact info</span>}
                    </div>
                  </div>
                  {/* Sub count */}
                  <div className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {isOpen ? `${cSubs.length} subs` : 'View subs'}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditCust(c)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Pencil size={13}/>
                    </button>
                    <button onClick={() => setDelConfirm({ type:'customer', id: c.id, name: c.full_name })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0"/> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0"/>}
                </div>

                {/* Subscriptions panel */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Subscriptions</span>
                      <button onClick={() => openAddSub(c.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 transition-colors">
                        <Plus size={11}/>Add Subscription
                      </button>
                    </div>

                    {cSubs.length === 0 && (
                      <div className="text-center py-6 text-xs text-gray-400">No subscriptions yet</div>
                    )}

                    <div className="flex flex-col gap-2">
                      {cSubs.map((s: any) => {
                        const days = s.days_remaining ?? 0
                        const st   = statusStyle(days)
                        const pc   = s.product_color || '#6B7280'
                        return (
                          <div key={s.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pc }} />
                            <div className="flex-1 min-w-0 grid grid-cols-5 gap-2 items-center">
                              <span className="text-xs font-semibold" style={{ color: pc }}>{s.product_name}</span>
                              <span className="text-xs text-gray-500">{s.period}</span>
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{Number(s.amount_egp).toLocaleString()} EGP</span>
                              <span className="text-xs text-gray-400">{s.payment_method}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                                <span className="text-[10px] text-gray-400">{format(new Date(s.end_date),'dd MMM yy')}</span>
                              </div>
                            </div>
                            {/* Sub actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => openEditSub(c.id, s)}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                <Pencil size={11}/>
                              </button>
                              <button onClick={() => setDelConfirm({ type:'sub', id: s.id + '|' + c.id, name: `${c.full_name} - ${s.product_name}` })}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash2 size={11}/>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* ── Customer Modal ── */}
      {custModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {custModal === 'add' ? 'Add New Customer' : 'Edit Customer'}
              </h3>
              <button onClick={() => setCustModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <Field label="Full Name *">
                <input value={custForm.full_name} onChange={e => setCustForm({...custForm, full_name:e.target.value})}
                  placeholder="Dr. Ahmed Mohamed" className={inp}/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <input value={custForm.phone} onChange={e => setCustForm({...custForm, phone:e.target.value})}
                    placeholder="+20 10..." className={inp}/>
                </Field>
                <Field label="Email">
                  <input value={custForm.email} onChange={e => setCustForm({...custForm, email:e.target.value})}
                    placeholder="email@..." className={inp}/>
                </Field>
              </div>
              <Field label="Telegram">
                <input value={custForm.telegram} onChange={e => setCustForm({...custForm, telegram:e.target.value})}
                  placeholder="@username" className={inp}/>
              </Field>
              <Field label="Notes">
                <textarea value={custForm.notes} onChange={e => setCustForm({...custForm, notes:e.target.value})}
                  placeholder="Any notes..." className={inp + " resize-none h-16"}/>
              </Field>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setCustModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={saveCust} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check size={13}/>{custModal === 'add' ? 'Add Customer' : 'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription Modal ── */}
      {subModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {subModal.mode === 'add' ? 'Add Subscription' : 'Edit Subscription'}
              </h3>
              <button onClick={() => setSubModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">

              {/* Product + Account */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Product *">
                  <select value={subForm.product_id}
                    onChange={e => setSubForm({...subForm, product_id:e.target.value, account_id:''})}
                    className={sel}>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Account">
                  <select value={subForm.account_id} onChange={e => setSubForm({...subForm, account_id:e.target.value})} className={sel}>
                    <option value="">No account</option>
                    {filtAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.email} ({a.used_slots}/{a.total_slots} slots)</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Period + Start */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Period">
                  <select value={subForm.period} onChange={e => updateSubEnd('period', e.target.value)} className={sel}>
                    {PERIODS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Start Date">
                  <input type="date" value={subForm.start_date}
                    onChange={e => updateSubEnd('start_date', e.target.value)} className={inp}/>
                </Field>
              </div>

              {/* End date (editable + auto) */}
              <Field label="End Date">
                <div className="flex items-center gap-2">
                  <input type="date" value={subForm.end_date}
                    onChange={e => setSubForm({...subForm, end_date:e.target.value})} className={inp}/>
                  <button onClick={() => setSubForm({...subForm, end_date: calcEnd(subForm.start_date, subForm.period)})}
                    className="flex-shrink-0 px-2.5 py-2 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors whitespace-nowrap">
                    Auto-calc
                  </button>
                </div>
              </Field>

              {/* Amount + Payment */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (EGP) *">
                  <input type="number" value={subForm.amount_egp}
                    onChange={e => setSubForm({...subForm, amount_egp:e.target.value})}
                    placeholder="0" className={inp}/>
                </Field>
                <Field label="Status">
                  <select value={subForm.status} onChange={e => setSubForm({...subForm, status:e.target.value})} className={sel}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              {/* Payment method chips */}
              <Field label="Payment Method">
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {PAYMENTS.map(p => (
                    <button key={p} onClick={() => setSubForm({...subForm, payment_method:p})}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background: subForm.payment_method === p ? '#EF4444' : '#F3F4F6',
                        color: subForm.payment_method === p ? '#fff' : '#6B7280'
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Notes">
                <textarea value={subForm.notes} onChange={e => setSubForm({...subForm, notes:e.target.value})}
                  placeholder="Optional notes..." className={inp + " resize-none h-14"}/>
              </Field>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setSubModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={saveSub} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check size={13}/>{subModal.mode === 'add' ? 'Add Subscription' : 'Save Changes'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {delConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500"/>
            </div>
            <h3 className="font-bold text-center text-gray-900 dark:text-gray-100 mb-1">Confirm Delete</h3>
            <p className="text-xs text-center text-gray-400 mb-5">
              Are you sure you want to delete<br/>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{delConfirm.name}</span>?<br/>
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDelConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={() => {
                if (delConfirm.type === 'customer') { deleteCust(delConfirm.id) }
                else { const [subId, custId] = delConfirm.id.split('|'); deleteSub(subId, custId) }
              }} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}
