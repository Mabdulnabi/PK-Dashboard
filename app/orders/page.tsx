'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar  from '@/components/layout/Topbar'
import {
  Check, AlertCircle, X, Eye, EyeOff, Package,
  Clock, CheckCircle2, ShoppingBag, User, Calendar, Wrench,
  Search, Download, CheckSquare, Square,
} from 'lucide-react'

interface Order {
  id: string; member_id: string; member_name: string; member_email: string
  tool_id: string; tool_name: string; tool_image: string|null
  category_slug: string
  amount_egp: number; created_at: string; expires_at: string|null
  delivered: boolean|null; delivered_at: string|null; viewed_at: string|null
}

const GOLD = '#d99401'

const inp = "w-full px-4 py-3 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 transition-colors"

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onClose,3000); return ()=>clearTimeout(t) },[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

function memberCode(memberId: string) {
  return '#' + (memberId || '').replace(/-/g,'').slice(0,8).toUpperCase()
}

const CAT_STYLES: Record<string, { label: string; light: string; dark: string }> = {
  shared:  { label:'Shared',  light:'bg-blue-100 text-blue-700',   dark:'dark:bg-blue-900/20 dark:text-blue-400' },
  private: { label:'Private', light:'bg-purple-100 text-purple-700',dark:'dark:bg-purple-900/20 dark:text-purple-400' },
  bundle:  { label:'Bundle',  light:'bg-amber-100 text-amber-700',  dark:'dark:bg-amber-900/20 dark:text-amber-400' },
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders,       setOrders]       = useState<Order[]>([])
  const [loading,      setLoading]      = useState(true)
  const [delivFilter,  setDelivFilter]  = useState<'all'|'pending'|'delivered'>('all')
  const [typeFilter,   setTypeFilter]   = useState<'all'|'shared'|'private'|'bundle'>('all')
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [modal,        setModal]        = useState<Order|null>(null)
  const [form,         setForm]         = useState({ delivery_type:'account' as 'account'|'key', email:'', password:'', key:'', notes:'' })
  const [showPass,     setShowPass]     = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [formLoading,  setFormLoading]  = useState(false)
  const [toast,        setToast]        = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [page,         setPage]         = useState(1)
  const perPage = 12

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{ if (!data.session) router.push('/auth/login') })
  },[router])

  const load = async () => {
    setLoading(true)
    const res  = await fetch('/api/admin/orders')
    const data = await res.json()
    setOrders(data.orders||[])
    setLoading(false)
    setSelected(new Set())
  }

  useEffect(()=>{ load() },[])

  useEffect(()=>{
    const channel = supabase
      .channel('admin-orders-rt')
      .on('postgres_changes',{ event:'*', schema:'public', table:'tool_purchases' },()=>load())
      .on('postgres_changes',{ event:'*', schema:'public', table:'account_deliveries' },()=>load())
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[])

  const openDeliver = async (order: Order) => {
    setForm({ delivery_type:'account', email:'', password:'', key:'', notes:'' })
    setShowPass(false)
    setModal(order)
    if (order.delivered) {
      setFormLoading(true)
      try {
        const r = await fetch(`/api/admin/orders/${order.id}/deliver`)
        const d = await r.json()
        if (d.delivery) {
          setForm({
            delivery_type: d.delivery.delivery_type,
            email:    d.delivery.email    || '',
            password: d.delivery.password || '',
            key:      d.delivery.key      || '',
            notes:    d.delivery.notes    || '',
          })
        }
      } catch {}
      setFormLoading(false)
    }
  }

  const deleteDelivery = async () => {
    if (!modal || !window.confirm(`Clear delivery for ${modal.member_name}? This will reset the order to Pending.`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/orders/${modal.id}/deliver`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { setToast({ msg: 'Failed to delete', type: 'err' }); return }
    setToast({ msg: 'Delivery cleared — order reset to Pending', type: 'ok' })
    setModal(null)
    load()
  }

  const deliver = async () => {
    if (!modal) return
    if (form.delivery_type==='account' && (!form.email.trim()||!form.password.trim())) {
      setToast({msg:'Email and Password are required',type:'err'}); return
    }
    if (form.delivery_type==='key' && !form.key.trim()) {
      setToast({msg:'Key is required',type:'err'}); return
    }
    setSaving(true)
    const res = await fetch(`/api/admin/orders/${modal.id}/deliver`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setToast({msg:data.error||'Error',type:'err'}); return }
    setToast({msg:`✓ Delivered to ${modal.member_name}`,type:'ok'})
    setModal(null)
    load()
  }

  // Filtered list
  const filtered = orders.filter(o => {
    if (typeFilter !== 'all' && o.category_slug !== typeFilter) return false
    if (delivFilter === 'pending'   && o.category_slug === 'private' && o.delivered)  return false
    if (delivFilter === 'delivered' && o.category_slug === 'private' && !o.delivered) return false
    if (search) {
      const q = search.toLowerCase()
      if (!o.member_name?.toLowerCase().includes(q) &&
          !o.member_email?.toLowerCase().includes(q) &&
          !o.tool_name?.toLowerCase().includes(q) &&
          !memberCode(o.member_id).toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page-1)*perPage, page*perPage)

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id); else s.add(id)
      return s
    })
  }
  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set())
    else setSelected(new Set(paged.map(o => o.id)))
  }

  const exportCSV = (rows: Order[]) => {
    const cols = ['ID','Member Code','Name','Email','Tool','Type','Amount EGP','Created','Expires','Status']
    const lines = rows.map(o => [
      o.id,
      memberCode(o.member_id),
      o.member_name,
      o.member_email,
      o.tool_name,
      o.category_slug,
      o.amount_egp,
      o.created_at,
      o.expires_at || '',
      o.delivered === null ? 'active' : o.delivered ? 'delivered' : 'pending',
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    const csv = [cols.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const pending   = orders.filter(o=>o.category_slug==='private'&&!o.delivered).length
  const delivered = orders.filter(o=>o.category_slug==='private'&&o.delivered).length

  const stats = [
    { label:'Total Orders',    val:orders.length,  color:'#6b7280', bg:'bg-gray-100 dark:bg-gray-800' },
    { label:'Private Pending', val:pending,         color:'#f59e0b', bg:'bg-amber-50 dark:bg-amber-900/20' },
    { label:'Delivered',       val:delivered,       color:'#10b981', bg:'bg-emerald-50 dark:bg-emerald-900/20' },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0D1117] overflow-hidden">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Orders"/>
        <main className="flex-1 overflow-auto p-6">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {stats.map(s=>(
              <div key={s.label} className={`rounded-2xl p-5 ${s.bg} border border-gray-100 dark:border-[#1a2233] flex items-center gap-4`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color+'20' }}>
                  <ShoppingBag size={22} style={{ color: s.color }}/>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium mb-0.5">{s.label}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters + search */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}
                placeholder="Search name, email, tool, code…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-amber-400 transition-all"/>
              {search && <button onClick={()=>setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={12}/></button>}
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all','shared','private','bundle'] as const).map(f=>(
                <button key={f} onClick={()=>{setTypeFilter(f);setPage(1)}}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${typeFilter===f?'text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  style={typeFilter===f?{background:GOLD}:{}}>
                  {f==='all'?'All Types':f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>

            {/* Delivery filter — only relevant for private */}
            {(typeFilter==='all'||typeFilter==='private') && (
              <div className="flex items-center gap-1.5">
                {(['all','pending','delivered'] as const).map(f=>(
                  <button key={f} onClick={()=>{setDelivFilter(f);setPage(1)}}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${delivFilter===f?'text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    style={delivFilter===f?{background:'#6366f1'}:{}}>
                    {f==='all'?'All Status':f==='pending'?'⏳ Pending':'✅ Delivered'}
                  </button>
                ))}
              </div>
            )}

            {/* Export all */}
            <button onClick={()=>exportCSV(filtered)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ms-auto">
              <Download size={13}/> Export
            </button>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{selected.size} selected</span>
              <button onClick={()=>exportCSV(orders.filter(o=>selected.has(o.id)))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                style={{background:GOLD}}>
                <Download size={12}/> Export Selected
              </button>
              <button onClick={()=>setSelected(new Set())}
                className="ms-auto text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Clear
              </button>
            </div>
          )}

          {/* Orders grid */}
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:`${GOLD} transparent transparent transparent`}}/></div>
          ) : filtered.length===0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package size={40} className="mb-3 opacity-30"/>
              <p className="text-sm">No orders found</p>
            </div>
          ) : (
            <>
              {/* Select all row */}
              <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                <button onClick={toggleAll} className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                  {selected.size === paged.length && paged.length > 0
                    ? <CheckSquare size={14} className="text-amber-500"/>
                    : <Square size={14}/>}
                  {selected.size > 0 ? `${selected.size} / ${paged.length} selected` : `Select all on page`}
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>{filtered.length} orders</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paged.map(o=>{
                  const isSelected = selected.has(o.id)
                  const cat = CAT_STYLES[o.category_slug] || CAT_STYLES.shared
                  const isPrivate = o.category_slug === 'private'

                  return (
                    <div key={o.id}
                      className={`bg-white dark:bg-[#111827] rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${isSelected?'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20':'border-gray-100 dark:border-[#1a2233]'}`}>
                      {/* Top stripe */}
                      <div className="h-1 w-full" style={{background:o.category_slug==='shared'?'#3b82f6':o.category_slug==='bundle'?GOLD:'#8b5cf6'}}/>

                      {/* Card header — checkbox + tool */}
                      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                        <button onClick={()=>toggleSelect(o.id)} className="flex-shrink-0">
                          {isSelected
                            ? <CheckSquare size={16} className="text-amber-500"/>
                            : <Square size={16} className="text-gray-300 hover:text-gray-500"/>}
                        </button>
                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          {o.tool_image
                            ? <img src={o.tool_image} alt={o.tool_name} className="w-6 h-6 object-contain rounded"/>
                            : <Wrench size={16} className="text-gray-400"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{o.tool_name}</div>
                          <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cat.light} ${cat.dark}`}>
                            {cat.label}
                          </span>
                        </div>
                        {isPrivate && (
                          o.delivered ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                              <CheckCircle2 size={10}/> Delivered
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex-shrink-0">
                              <Clock size={10}/> Pending
                            </span>
                          )
                        )}
                      </div>

                      {/* Customer info — prominent */}
                      <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <User size={11} className="text-gray-400 flex-shrink-0"/>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{o.member_name}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {memberCode(o.member_id)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 truncate">{o.member_email}</div>
                      </div>

                      {/* Card body */}
                      <div className="px-4 pb-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={11} className="flex-shrink-0"/>
                          <span>Ordered {fmtDate(o.created_at)}</span>
                          <span className="ms-auto font-semibold text-gray-700 dark:text-gray-300">{o.amount_egp.toLocaleString()} EGP</span>
                        </div>
                        {o.expires_at && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={11} className="flex-shrink-0"/>
                            <span>Expires {fmtDate(o.expires_at)}</span>
                          </div>
                        )}
                        {isPrivate && o.delivered && o.viewed_at && (
                          <div className="text-[10px] text-gray-400">Viewed {fmtDate(o.viewed_at)}</div>
                        )}
                        {isPrivate && o.delivered && !o.viewed_at && (
                          <div className="text-[10px] text-amber-500 font-medium">● Not viewed yet</div>
                        )}
                      </div>

                      {/* Card footer */}
                      {isPrivate && (
                        <div className="px-4 pb-4">
                          <button onClick={()=>openDeliver(o)}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${o.delivered?'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700':'text-white hover:opacity-90'}`}
                            style={!o.delivered?{background:GOLD}:{}}>
                            {o.delivered ? 'Edit Delivery' : 'Deliver Now'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {filtered.length > perPage && (
                <div className="flex items-center justify-between mt-5 text-xs text-gray-500">
                  <span>{Math.min((page-1)*perPage+1,filtered.length)}–{Math.min(page*perPage,filtered.length)} of {filtered.length}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={()=>setPage(p=>p-1)} disabled={page===1}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">←</button>
                    <span className="px-3">{page} / {totalPages}</span>
                    <button onClick={()=>setPage(p=>p+1)} disabled={page>=totalPages}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">→</button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Deliver Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setModal(null)}>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Deliver Order</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-400">{modal.tool_name}</p>
                </div>
              </div>
              <button onClick={()=>setModal(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={14}/>
              </button>
            </div>

            {/* Customer info in modal */}
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={12} className="text-gray-400"/>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{modal.member_name}</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">{memberCode(modal.member_id)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{modal.member_email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Delivery Type</label>
                <div className="flex gap-2">
                  {(['account','key'] as const).map(type=>(
                    <button key={type} onClick={()=>setForm(f=>({...f,delivery_type:type}))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                      style={form.delivery_type===type?{background:GOLD,color:'#fff'}:{background:'#f3f4f6',color:'#6b7280'}}>
                      {type==='account'?'📧 Account':'🔑 Key'}
                    </button>
                  ))}
                </div>
              </div>

              {form.delivery_type==='account' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
                    <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                      placeholder="user@example.com" dir="ltr" className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Password</label>
                    <div className="relative">
                      <input value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                        type={showPass?'text':'password'} placeholder="••••••••" dir="ltr" className={inp + ' pr-10'}/>
                      <button onClick={()=>setShowPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Key / License</label>
                  <div className="relative">
                    <input value={form.key} onChange={e=>setForm(f=>({...f,key:e.target.value}))}
                      type={showPass?'text':'password'} placeholder="XXXX-XXXX-XXXX-XXXX" dir="ltr" className={inp + ' pr-10 font-mono'}/>
                    <button onClick={()=>setShowPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Notes (optional)</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  placeholder={form.delivery_type==='account'?'Family Plan — do not change any settings':'Single-use only'}
                  rows={2} className={inp + ' resize-none'}/>
              </div>
            </div>

            {formLoading && (
              <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin me-2" style={{borderColor:GOLD,borderTopColor:'transparent'}}/>
                Loading existing delivery…
              </div>
            )}

            <div className="flex gap-3 mt-5">
              {modal?.delivered && (
                <button onClick={deleteDelivery} disabled={deleting}
                  className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/30 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50">
                  {deleting ? '…' : '🗑 Clear'}
                </button>
              )}
              <button onClick={()=>setModal(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={deliver} disabled={saving||formLoading}
                className="flex-[2] py-3 rounded-xl disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                style={{background:GOLD}}>
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving…</> : <><Check size={15}/> {modal?.delivered ? 'Update & Notify' : 'Deliver & Notify'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
