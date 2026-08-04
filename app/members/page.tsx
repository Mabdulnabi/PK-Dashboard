'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { useAdminTheme } from '@/lib/admin-theme'
import {
  Plus, Search, Pencil, Trash2, X, Check, AlertCircle,
  UserCheck, UserX, Wallet, RefreshCw,
  ArrowUpRight, Users, Activity, Clock, TrendingUp, KeyRound, Mail, BellRing,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Member {
  id: string; user_id?: string; full_name: string; email: string
  phone?: string; telegram?: string; whatsapp?: string
  plan_slug: string; plan_name?: string; status: string
  expires_at?: string; joined_at: string; notes?: string
  computed_status?: string; total_paid_egp?: number; total_payments?: number
  member_code?: string; avatar_url?: string
  wallet_egp?: number; wallet_usd?: number
  last_charge_amount?: number; last_charge_currency?: string; last_charge_at?: string
  last_deduct_amount?: number; last_deduct_currency?: string; last_deduct_at?: string
  time_remaining?: string
  next_renew?: string | null
}


// ─── Helpers ─────────────────────────────────────────────────────────────────
const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-[#d99401] transition-all"
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'
const fmtAmt  = (n?: number, cur = 'EGP') => n ? `${Number(n).toLocaleString()} ${cur}` : `0 ${cur}`

function Toast({ msg, type, onClose }: { msg: string; type: 'ok'|'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>} {msg}
    </div>
  )
}

function Avatar({ m, size=7 }: { m: Member; size?: number }) {
  if (m.avatar_url) return (
    <img src={m.avatar_url} alt={m.full_name}
      className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 border-2 border-white dark:border-gray-800 shadow-sm`}/>
  )
  return (
    <div className={`w-${size} h-${size} rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black`}
      style={{ background: '#d9940120', color: '#d99401', border: '2px solid #d9940140' }}>
      {m.full_name.charAt(0).toUpperCase()}
    </div>
  )
}

function StatusBadge({ s }: { s: string }) {
  const cfg: Record<string,{bg:string;color:string;label:string}> = {
    active:    { bg:'#DCFCE7', color:'#166534', label:'Active' },
    expiring:  { bg:'#FEF3C7', color:'#92400E', label:'Expiring' },
    expired:   { bg:'#FEE2E2', color:'#991B1B', label:'Expired' },
    suspended: { bg:'#F3F4F6', color:'#374151', label:'Suspended' },
    pending:   { bg:'#DBEAFE', color:'#1E40AF', label:'Pending' },
  }
  const c = cfg[s] || cfg.pending
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{background:c.bg,color:c.color}}>{c.label}</span>
}

function StatCard({ label, value, icon: Icon, accent, sub }: { label:string; value:any; icon:any; accent:string; sub?:string }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] shadow-sm">
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ background:`radial-gradient(circle at top right, ${accent}, transparent 65%)` }}/>
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60" style={{ background:`linear-gradient(90deg, ${accent}, transparent)` }}/>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:accent+'18'}}>
          <Icon size={15} style={{color:accent}}/>
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 dark:text-gray-600">{sub}</div>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MembersPage() {
  const { dark } = useAdminTheme()
  const [members,   setMembers]   = useState<Member[]>([])
  const [loading,   setLoading]   = useState(true)
  const [q,         setQ]         = useState('')
  const [fStatus,   setFStatus]   = useState('all')
  const [toast,     setToast]     = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving,    setSaving]    = useState(false)
  const [notifying, setNotifying] = useState<string | null>(null)

  // modal state: null | 'add' | 'edit' | 'wallet' | 'reset'
  const [modal,  setModal]  = useState<string|null>(null)
  const [sel,    setSel]    = useState<Member|null>(null)
  const [delId,  setDelId]  = useState<Member|null>(null)

  // forms
  const emptyMember = { full_name:'', email:'', phone:'', telegram:'', whatsapp:'', notes:'' }
  const [mForm, setMForm] = useState(emptyMember)
  const emptyWallet = { amount:'', currency:'EGP', note:'', action:'charge' as 'charge'|'deduct' }
  const [wForm, setWForm] = useState(emptyWallet)
  const emptyReset = { new_password:'', new_email:'' }
  const [rForm, setRForm] = useState(emptyReset)

  const ok  = (msg: string) => setToast({ msg, type:'ok' })
  const err = (msg: string) => setToast({ msg, type:'err' })

  const load = useCallback(async () => {
    setLoading(true)
    const [mRes, subRes] = await Promise.all([
      supabase.from('members_full').select('*').order('created_at', { ascending: false }),
      supabase.from('tool_purchases')
        .select('member_id, expires_at')
        .eq('status', 'confirmed')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true }),
    ])
    // Build next_renew map: earliest upcoming expires_at per member
    const nextRenewMap: Record<string, string> = {}
    for (const p of subRes.data || []) {
      if (!nextRenewMap[p.member_id]) nextRenewMap[p.member_id] = p.expires_at
    }
    if (mRes.data) {
      setMembers(mRes.data.map((m: any) => ({
        ...m,
        next_renew: nextRenewMap[m.id] || null,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const [page,    setPage]    = useState(1)
  const [perPage, setPerPage] = useState(25)

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = members.filter(m => {
    const cs = m.computed_status || m.status
    if (fStatus !== 'all' && cs !== fStatus) return false
    if (!q) return true
    const ql = q.toLowerCase()
    return (
      m.full_name.toLowerCase().includes(ql) ||
      m.email.toLowerCase().includes(ql) ||
      (m.phone || '').includes(q) ||
      (m.member_code || '').toLowerCase().includes(ql)
    )
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  useEffect(() => { setPage(1) }, [q, fStatus])

  const stats = {
    total:    members.length,
    active:   members.filter(m => (m.computed_status||m.status) === 'active').length,
    expiring: members.filter(m => (m.computed_status||m.status) === 'expiring').length,
    expired:  members.filter(m => (m.computed_status||m.status) === 'expired').length,
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  const openAdd  = () => { setMForm(emptyMember); setSel(null); setModal('add') }
  const openEdit = (m: Member) => { setMForm({ full_name:m.full_name, email:m.email, phone:m.phone||'', telegram:m.telegram||'', whatsapp:m.whatsapp||'', notes:m.notes||'' }); setSel(m); setModal('edit') }
  const openWallet = (m: Member, action: 'charge'|'deduct' = 'charge') => {
    setSel(m); setWForm({ ...emptyWallet, action }); setModal('wallet')
  }
  const openReset = (m: Member) => { setSel(m); setRForm(emptyReset); setModal('reset') }

  const saveMember = async () => {
    if (!mForm.full_name || !mForm.email) return err('Name and email required')
    setSaving(true)
    const payload: any = { full_name:mForm.full_name, email:mForm.email, phone:mForm.phone||null, telegram:mForm.telegram||null, whatsapp:mForm.whatsapp||null, notes:mForm.notes||null }
    if (!sel) payload.status = 'active'
    const res = sel
      ? await supabase.from('members').update(payload).eq('id', sel.id)
      : await supabase.from('members').insert(payload)
    setSaving(false)
    if (res.error) return err(res.error.message)
    ok(sel ? 'Member updated' : 'Member added')
    setModal(null); load()
  }

  const walletAction = async () => {
    if (!sel || !wForm.amount) return err('Enter amount')
    const amt = parseFloat(wForm.amount)
    if (isNaN(amt) || amt <= 0) return err('Invalid amount')
    setSaving(true)
    const res = await fetch('/api/admin/members/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: sel.id, action: wForm.action,
        amount: amt, currency: wForm.currency,
        note: wForm.note || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) return err(data.error || 'Failed')
    ok(`${wForm.action === 'charge' ? '✅ Added' : '➖ Deducted'} ${amt} ${wForm.currency} — balance: ${data.balance_after} ${wForm.currency}`)
    setModal(null); load()
  }

  const resetCredentials = async () => {
    if (!sel) return
    if (!rForm.new_password && !rForm.new_email) return err('Enter new password or email')
    setSaving(true)
    const res = await fetch('/api/admin/members/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: sel.id, new_password: rForm.new_password || undefined, new_email: rForm.new_email || undefined }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) return err(data.error || 'Failed')
    ok('Credentials updated & sessions cleared')
    setModal(null); load()
  }

  const suspend = async (m: Member) => {
    const ns = m.status === 'suspended' ? 'active' : 'suspended'
    await supabase.from('members').update({ status: ns }).eq('id', m.id)
    ok(`Member ${ns}`); load()
  }

  const del = async () => {
    if (!delId) return
    await supabase.from('members').delete().eq('id', delId.id)
    ok('Deleted'); setDelId(null); load()
  }

  const notifyRenewal = async (m: Member) => {
    if (!m.next_renew) return err('No upcoming subscription found for this member')
    setNotifying(m.id)
    const res  = await fetch('/api/admin/members/notify-renewal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: m.id }),
    })
    const data = await res.json()
    setNotifying(null)
    if (!res.ok) return err(data.error || 'Failed to send notification')
    ok(`✅ Renewal reminder sent to ${m.full_name}`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Members" subtitle={`${members.length} total members`}/>

        {/* ── Stat cards (dashboard theme) ── */}
        <div className="grid grid-cols-4 gap-3 px-5 pt-4 pb-2 flex-shrink-0">
          <StatCard label="Total Members"    value={stats.total}    icon={Users}     accent="#d99401" sub={`${stats.active} active`}/>
          <StatCard label="Active"           value={stats.active}   icon={Activity}  accent="#22C55E"/>
          <StatCard label="Expiring Soon"    value={stats.expiring} icon={Clock}     accent="#F59E0B" sub="within 7 days"/>
          <StatCard label="Expired"          value={stats.expired}  icon={TrendingUp} accent="#EF4444"/>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, phone, PK code..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-[#d99401] text-gray-800 dark:text-gray-200"/>
          </div>
          <select value={fStatus} onChange={e => setFStatus(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none text-gray-700 dark:text-gray-300">
            <option value="all">All Status</option>
            {['active','expiring','expired','suspended','pending'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <div className="ml-auto text-xs text-gray-400">{filtered.length} results</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {[10,25,50].map(n => (
              <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
                className={`px-2 py-1 rounded transition-colors ${perPage===n ? 'font-bold text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                style={perPage===n ? { background:'#d99401' } : {}}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-bold transition-colors"
            style={{ background:'#d99401' }}>
            <Plus size={13}/> Add Member
          </button>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto p-5">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  {['Member','PK Code','Status','Next Renew','Wallet','Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="text-center py-16 text-sm text-gray-400">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-[#d99401] rounded-full animate-spin mx-auto"/>
                  </td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-16 text-sm text-gray-400">No members found</td></tr>
                )}
                {paged.map(m => (
                  <tr key={m.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">

                    {/* Member */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar m={m} size={8}/>
                        <div>
                          <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{m.full_name}</div>
                          <div className="text-[10px] text-gray-400">{m.email}</div>
                          {m.phone && <div className="text-[10px] text-gray-400">{m.phone}</div>}
                        </div>
                      </div>
                    </td>

                    {/* PK Code */}
                    <td className="px-4 py-3">
                      {m.member_code
                        ? <span className="font-mono text-[11px] font-bold px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 tracking-wider">{m.member_code}</span>
                        : <span className="text-[10px] text-gray-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge s={m.computed_status || m.status}/></td>

                    {/* Next Renew */}
                    <td className="px-4 py-3">
                      {m.next_renew ? (
                        <>
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{fmtDate(m.next_renew)}</div>
                          <div className="text-[10px] text-gray-400">
                            {(() => {
                              const diff = new Date(m.next_renew).getTime() - Date.now()
                              const days = Math.ceil(diff / 86400000)
                              return days <= 0 ? 'Expired' : days === 1 ? 'Tomorrow' : `${days}d left`
                            })()}
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </td>

                    {/* Wallet */}
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold" style={{ color:'#d99401' }}>
                        {fmtAmt(m.wallet_egp, 'EGP')}
                      </div>
                      {(m.wallet_usd || 0) > 0 && (
                        <div className="text-[10px] text-gray-400">{fmtAmt(m.wallet_usd,'USD')}</div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => notifyRenewal(m)} title="Send renewal reminder"
                          disabled={!m.next_renew || notifying === m.id}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          {notifying === m.id
                            ? <div className="w-2.5 h-2.5 border border-orange-400 border-t-transparent rounded-full animate-spin"/>
                            : <BellRing size={11}/>}
                        </button>
                        <button onClick={() => openWallet(m)} title="Wallet — Add / Deduct"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-[#d99401] hover:bg-[#d9940115] transition-colors">
                          <Wallet size={11}/>
                        </button>
                        <button onClick={() => openEdit(m)} title="Edit Member"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <Pencil size={11}/>
                        </button>
                        <button onClick={() => openReset(m)} title="Reset Password / Email"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                          <KeyRound size={11}/>
                        </button>
                        <button onClick={() => suspend(m)} title={m.status==='suspended'?'Activate':'Suspend'}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                          {m.status==='suspended'?<UserCheck size={11}/>:<UserX size={11}/>}
                        </button>
                        <button onClick={() => setDelId(m)} title="Delete"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination bar */}
            {filtered.length > perPage && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
                <span>
                  Showing {Math.min((page-1)*perPage+1, filtered.length)}–{Math.min(page*perPage, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => p-1)} disabled={page===1}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">←</button>
                  <span className="px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => p+1)} disabled={page>=totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">→</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ═══ ADD / EDIT MODAL ═══ */}
      {(modal==='add'||modal==='edit') && (
        <Modal title={modal==='add'?'Add Member':`Edit — ${sel?.full_name}`} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <input value={mForm.full_name} onChange={e=>setMForm({...mForm,full_name:e.target.value})} placeholder="Dr. Ahmed..." className={inp}/>
            </div>
            <div className="col-span-2">
              <Label>Email *</Label>
              <input type="email" value={mForm.email} onChange={e=>setMForm({...mForm,email:e.target.value})} placeholder="email@..." className={inp}/>
            </div>
            <div>
              <Label>Phone</Label>
              <input value={mForm.phone} onChange={e=>setMForm({...mForm,phone:e.target.value})} placeholder="+20 10..." className={inp}/>
            </div>
            <div>
              <Label>WhatsApp</Label>
              <input value={mForm.whatsapp} onChange={e=>setMForm({...mForm,whatsapp:e.target.value})} placeholder="+20 10..." className={inp}/>
            </div>
            <div>
              <Label>Telegram</Label>
              <input value={mForm.telegram} onChange={e=>setMForm({...mForm,telegram:e.target.value})} placeholder="@username" className={inp}/>
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <textarea value={mForm.notes} onChange={e=>setMForm({...mForm,notes:e.target.value})} className={inp+" resize-none h-16"}/>
            </div>
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={saveMember} saving={saving} label={modal==='add'?'Add Member':'Save Changes'}/>
        </Modal>
      )}

      {/* ═══ WALLET MODAL (add / deduct) ═══ */}
      {modal==='wallet' && sel && (
        <Modal title={`💰 Wallet — ${sel.full_name}`} onClose={() => setModal(null)}>
          {/* Current balance */}
          <div className="p-3 mb-4 rounded-xl flex items-center justify-between" style={{background:'#d9940110',border:'1px solid #d9940130'}}>
            <span className="text-xs text-gray-500">Current Balance</span>
            <div className="text-right">
              <div className="text-sm font-black" style={{color:'#d99401'}}>{fmtAmt(sel.wallet_egp,'EGP')}</div>
              {(sel.wallet_usd||0)>0 && <div className="text-xs text-gray-400">{fmtAmt(sel.wallet_usd,'USD')}</div>}
            </div>
          </div>
          {/* Add / Deduct toggle */}
          <div className="flex gap-1 p-1 rounded-xl mb-4" style={{background:'#f3f4f6'}}>
            {(['charge','deduct'] as const).map(a=>(
              <button key={a} onClick={()=>setWForm({...wForm,action:a})}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={wForm.action===a
                  ? {background: a==='charge'?'#d99401':'#EF4444', color:'#fff', boxShadow:'0 2px 8px '+(a==='charge'?'#d9940133':'#EF444433')}
                  : {background:'transparent', color:'#6B7280'}}>
                {a==='charge'?'➕ Add to Wallet':'➖ Deduct from Wallet'}
              </button>
            ))}
          </div>
          {/* Amount + Currency */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <Label>Amount *</Label>
              <input type="number" min="0" step="0.01"
                value={wForm.amount} onChange={e=>setWForm({...wForm,amount:e.target.value})}
                placeholder="0.00" className={inp}/>
            </div>
            <div className="w-24">
              <Label>Currency</Label>
              <select value={wForm.currency} onChange={e=>setWForm({...wForm,currency:e.target.value})} className={inp+" cursor-pointer"}>
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <Label>{wForm.action==='charge'?'Note (optional)':'Reason *'}</Label>
          <input value={wForm.note} onChange={e=>setWForm({...wForm,note:e.target.value})}
            placeholder={wForm.action==='charge'?'optional note...':'reason for deduction...'}
            className={inp}/>
          <ModalFooter
            onClose={() => setModal(null)}
            onSave={walletAction}
            saving={saving}
            label={wForm.action==='charge'?'Add to Wallet':'Deduct from Wallet'}
            accent={wForm.action==='charge'?'#d99401':'#EF4444'}/>
        </Modal>
      )}

      {/* ═══ RESET PASSWORD / EMAIL MODAL ═══ */}
      {modal==='reset' && sel && (
        <Modal title={`🔑 Reset Credentials — ${sel.full_name}`} onClose={() => setModal(null)}>
          <p className="text-xs text-gray-400 mb-4">Leave blank to keep unchanged. All active sessions will be cleared.</p>
          <Label>New Email</Label>
          <div className="relative mb-3">
            <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="email" value={rForm.new_email} onChange={e=>setRForm({...rForm,new_email:e.target.value})} placeholder={sel.email} className={inp+" pl-8"}/>
          </div>
          <Label>New Password</Label>
          <div className="relative">
            <KeyRound size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input type="password" value={rForm.new_password} onChange={e=>setRForm({...rForm,new_password:e.target.value})} placeholder="••••••••" className={inp+" pl-8"}/>
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={resetCredentials} saving={saving} label="Update & Clear Sessions" accent="#7C3AED"/>
        </Modal>
      )}

      {/* ═══ DELETE CONFIRM ═══ */}
      {delId && (
        <Modal title="Delete Member" onClose={() => setDelId(null)}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Delete <strong className="text-gray-900 dark:text-gray-100">{delId.full_name}</strong>? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setDelId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
            <button onClick={del} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold">Delete</button>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}

// ─── Reusable modal shell ─────────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title:string; children:React.ReactNode; onClose:()=>void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl">
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16}/></button>
        </div>
        <div className="p-5 flex flex-col gap-3">{children}</div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1 block">{children}</label>
}

function ModalFooter({ onClose, onSave, saving, label, accent='#d99401' }: { onClose:()=>void; onSave:()=>void; saving:boolean; label:string; accent?:string }) {
  return (
    <div className="flex gap-2 pt-2">
      <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
      <button onClick={onSave} disabled={saving}
        className="flex-[2] py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5 transition-all"
        style={{ background: accent }}>
        {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check size={13}/> {label}</>}
      </button>
    </div>
  )
}
