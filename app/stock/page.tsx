'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar  from '@/components/layout/Topbar'
import {
  Check, AlertCircle, X, Eye, EyeOff, Plus, Trash2,
  Archive, AlertTriangle, Database, User, Calendar, Wrench, Pencil, Key,
  Upload, Download, FileText,
} from 'lucide-react'

interface Tool { id: string; name: string; image_url: string|null; available: number; assigned: number }
interface StockItem {
  id: string; tool_id: string; email: string|null; key_enc: string|null; notes: string|null; status: 'available'|'assigned'
  assigned_to: string|null; assigned_at: string|null; created_at: string
  delivery_type: 'account'|'key'
  members?: { full_name: string; email: string }
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

export default function StockPage() {
  const router = useRouter()
  const [tools,     setTools]     = useState<Tool[]>([])
  const [stock,     setStock]     = useState<StockItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [selTool,   setSelTool]   = useState<string>('all')
  const [addModal,  setAddModal]  = useState(false)
  const [form,      setForm]      = useState({ tool_id:'', delivery_type:'account' as 'account'|'key', email:'', password:'', key:'', notes:'' })
  const [showPass,  setShowPass]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState<string|null>(null)
  const [editItem,  setEditItem]  = useState<StockItem|null>(null)
  const [editForm,  setEditForm]  = useState({ delivery_type:'account' as 'account'|'key', email:'', password:'', key:'', notes:'' })
  const [editPass,  setEditPass]  = useState(false)
  const [editSaving,setEditSaving]= useState(false)
  const [toast,     setToast]     = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [page,      setPage]      = useState(1)
  const perPage = 12

  // CSV import state
  const [importModal, setImportModal] = useState(false)
  const [importForm,  setImportForm]  = useState({ tool_id:'', import_type:'account' as 'account'|'key' })
  const [csvFile,     setCsvFile]     = useState<File|null>(null)
  const [importing,   setImporting]   = useState(false)
  const [importResult, setImportResult] = useState<{total:number;imported:number;skipped:number;failed:number;errors:{row:number;reason:string}[]}|null>(null)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{ if (!data.session) router.push('/auth/login') })
  },[router])

  const load = async () => {
    setLoading(true)
    const res  = await fetch('/api/admin/stock')
    const data = await res.json()
    setTools(data.tools||[])
    setStock(data.stock||[])
    setLoading(false)
  }

  useEffect(()=>{ load() },[])

  const openAdd = () => {
    const firstTool = tools[0]
    setForm({ tool_id: firstTool?.id||'', delivery_type:'account', email:'', password:'', key:'', notes:'' })
    setShowPass(false)
    setAddModal(true)
  }

  const addItem = async () => {
    if (!form.tool_id) { setToast({msg:'Please select a tool',type:'err'}); return }
    if (form.delivery_type==='account' && (!form.email.trim()||!form.password.trim())) {
      setToast({msg:'Email and Password are required',type:'err'}); return
    }
    if (form.delivery_type==='key' && !form.key.trim()) {
      setToast({msg:'Key is required',type:'err'}); return
    }
    setSaving(true)
    const res  = await fetch('/api/admin/stock',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setToast({msg:data.error||'Error',type:'err'}); return }
    setToast({msg:'✓ Item added to stock',type:'ok'})
    setAddModal(false)
    load()
  }

  const openEdit = (s: StockItem) => {
    setEditItem(s)
    const type = s.delivery_type || 'account'
    setEditForm({
      delivery_type: type,
      email:    type === 'account' ? (s.email || '') : '',
      password: '',
      key:      type === 'key'     ? (s.key_enc || '') : '',
      notes:    s.notes || '',
    })
    setEditPass(false)
  }

  const saveEdit = async () => {
    if (!editItem) return
    if (editForm.delivery_type === 'account' && !editForm.email.trim()) {
      setToast({msg:'Email is required',type:'err'}); return
    }
    if (editForm.delivery_type === 'key' && !editForm.key.trim()) {
      setToast({msg:'Key is required',type:'err'}); return
    }
    setEditSaving(true)
    const res = await fetch(`/api/admin/stock/${editItem.id}`, {
      method: 'PATCH', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(editForm)
    })
    const data = await res.json()
    setEditSaving(false)
    if (!res.ok) { setToast({msg:data.error||'Error',type:'err'}); return }
    setToast({msg:'✓ Item updated',type:'ok'})
    setEditItem(null)
    load()
  }

  const deleteItem = async (id: string) => {
    setDeleting(id)
    const res = await fetch(`/api/admin/stock/${id}`,{ method:'DELETE' })
    setDeleting(null)
    if (!res.ok) { setToast({msg:'Cannot delete an assigned item',type:'err'}); return }
    setToast({msg:'✓ Item deleted',type:'ok'})
    load()
  }

  const filtered = selTool==='all' ? stock : stock.filter(s=>s.tool_id===selTool)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = filtered.slice((page-1)*perPage, page*perPage)
  const totalAvail    = stock.filter(s=>s.status==='available').length
  const totalAssigned = stock.filter(s=>s.status==='assigned').length
  const lowTools = tools.filter(t=>t.available<3)

  const openImport = () => {
    setImportForm({ tool_id: tools[0]?.id || '', import_type: 'account' })
    setCsvFile(null)
    setImportResult(null)
    setImportModal(true)
  }

  const downloadTemplate = (type: 'account' | 'key') => {
    const content = type === 'account'
      ? 'email,password\nexample1@gmail.com,password123\nexample2@gmail.com,password456'
      : 'key\nAAAAA-BBBBB-CCCCC\nDDDDD-EEEEE-FFFFF'
    const blob = new Blob([content], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = type === 'account' ? 'stock-accounts-template.csv' : 'stock-keys-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    })
  }

  const runImport = async () => {
    if (!csvFile || !importForm.tool_id) return
    setImporting(true)
    setImportResult(null)
    const text = await csvFile.text()
    const rows = parseCSV(text)
    if (rows.length === 0) {
      setToast({ msg: 'CSV is empty or invalid', type: 'err' })
      setImporting(false)
      return
    }
    const res  = await fetch('/api/admin/stock/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id: importForm.tool_id, import_type: importForm.import_type, rows }),
    })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setToast({ msg: data.error || 'Import failed', type: 'err' }); return }
    setImportResult(data)
    load()
  }

  const stats = [
    { label:'Total Items',  val:stock.length,    color:'#6b7280', bg:'bg-gray-100 dark:bg-gray-800' },
    { label:'Available',    val:totalAvail,       color:'#10b981', bg:'bg-emerald-50 dark:bg-emerald-900/20' },
    { label:'Assigned',     val:totalAssigned,    color:'#6366f1', bg:'bg-indigo-50 dark:bg-indigo-900/20' },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0D1117] overflow-hidden">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Private Stock"/>
        <main className="flex-1 overflow-auto p-6">

          {/* Low stock alert */}
          {lowTools.length>0 && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0"/>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Low stock: <span className="font-bold">{lowTools.map(t=>t.name).join(', ')}</span> — fewer than 3 items available
              </p>
            </div>
          )}

          {/* Stats + Add button */}
          <div className="flex items-stretch gap-4 mb-6">
            <div className="flex-1 grid grid-cols-3 gap-4">
              {stats.map(s=>(
                <div key={s.label} className={`rounded-2xl p-5 ${s.bg} border border-gray-100 dark:border-[#1a2233] flex items-center gap-4`}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color+'20' }}>
                    <Database size={22} style={{ color: s.color }}/>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-0.5">{s.label}</div>
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={openAdd}
                className="px-5 py-3 rounded-xl text-white font-bold text-sm flex items-center gap-2 transition-colors shadow-sm hover:opacity-90"
                style={{background:GOLD}}>
                <Plus size={16}/> Add Item
              </button>
              <button onClick={openImport}
                className="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Upload size={15}/> Import CSV
              </button>
            </div>
          </div>

          {/* Tool filter tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <button onClick={()=>{ setSelTool('all'); setPage(1) }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors`}
              style={selTool==='all'?{background:GOLD,color:'#fff'}:{background:'#f3f4f6',color:'#6b7280'}}>
              All
            </button>
            {tools.map(t=>(
              <button key={t.id} onClick={()=>{ setSelTool(t.id); setPage(1) }}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                style={selTool===t.id?{background:GOLD,color:'#fff'}:{background:'#f3f4f6',color:'#6b7280'}}>
                {t.image_url && <img src={t.image_url} alt={t.name} className="w-4 h-4 object-contain rounded"/>}
                {t.name}
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${t.available<3?'bg-amber-200 text-amber-700':'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                  {t.available}
                </span>
              </button>
            ))}
          </div>

          {/* Stock cards */}
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:`${GOLD} transparent transparent transparent`}}/></div>
          ) : filtered.length===0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Archive size={40} className="mb-3 opacity-30"/>
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paged.map(s=>{
                  const tool = tools.find(t=>t.id===s.tool_id)
                  return (
                    <div key={s.id} className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-[#1a2233] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Status stripe */}
                      <div className="h-1 w-full" style={{ background: s.status==='available' ? '#10b981' : '#6366f1' }}/>

                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            {tool?.image_url
                              ? <img src={tool.image_url} alt={tool.name} className="w-7 h-7 object-contain rounded"/>
                              : <Wrench size={18} className="text-gray-400"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{tool?.name||s.tool_id}</div>
                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status==='available'?'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400':'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400'}`}>
                              {s.status==='available' ? 'Available' : 'Assigned'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {s.status==='available' && (
                              <button onClick={()=>openEdit(s)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-500">
                                <Pencil size={12}/>
                              </button>
                            )}
                            <button onClick={()=>deleteItem(s.id)} disabled={s.status==='assigned'||deleting===s.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500">
                              {deleting===s.id
                                ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/>
                                : <Trash2 size={13}/>}
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {s.delivery_type==='key'
                              ? <Key size={11} className="flex-shrink-0 text-amber-500"/>
                              : <User size={11} className="flex-shrink-0"/>}
                            <span className="font-mono truncate" dir="ltr">
                              {s.delivery_type==='key' ? '🔑 Key/License' : (s.email||'—')}
                            </span>
                          </div>
                          {s.notes && (
                            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1 truncate">
                              {s.notes}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar size={11} className="flex-shrink-0"/>
                            <span>Added: {fmtDate(s.created_at)}</span>
                          </div>
                          {s.members && (
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                              → {(s.members as any).full_name}
                            </div>
                          )}
                        </div>
                      </div>
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

      {/* Add Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setAddModal(false)}>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Add Item to Stock</h2>
              <button onClick={()=>setAddModal(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={14}/>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Tool</label>
                <select value={form.tool_id} onChange={e=>setForm(f=>({...f,tool_id:e.target.value}))} className={inp}>
                  {tools.map(t=>(
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Item Type</label>
                <div className="flex gap-2">
                  {(['account','key'] as const).map(type=>(
                    <button key={type} onClick={()=>setForm(f=>({
                      ...f,
                      delivery_type: type,
                      email:    type === 'account' ? f.email    : '',
                      password: type === 'account' ? f.password : '',
                      key:      type === 'key'     ? f.key      : '',
                    }))}
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
                  placeholder={form.delivery_type==='account'?'Family Plan — Slot 3':'Single-use only'}
                  rows={2} className={inp + ' resize-none'}/>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={()=>setAddModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={addItem} disabled={saving}
                className="flex-[2] py-3 rounded-xl disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                style={{background:GOLD}}>
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving…</> : <><Plus size={15}/> Add to Stock</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setEditItem(null)}>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit Stock Item</h2>
              <button onClick={()=>setEditItem(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={14}/>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Item Type</label>
                <div className="flex gap-2">
                  {(['account','key'] as const).map(type=>(
                    <button key={type} onClick={()=>setEditForm(f=>({
                      ...f,
                      delivery_type: type,
                      email:    type === 'account' ? f.email    : '',
                      password: type === 'account' ? f.password : '',
                      key:      type === 'key'     ? f.key      : '',
                    }))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors"
                      style={editForm.delivery_type===type?{background:GOLD,color:'#fff'}:{background:'#f3f4f6',color:'#6b7280'}}>
                      {type==='account'?'📧 Account':'🔑 Key'}
                    </button>
                  ))}
                </div>
              </div>
              {editForm.delivery_type==='account' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
                    <input value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))}
                      placeholder="user@example.com" dir="ltr" className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">New Password (leave blank to keep)</label>
                    <div className="relative">
                      <input value={editForm.password} onChange={e=>setEditForm(f=>({...f,password:e.target.value}))}
                        type={editPass?'text':'password'} placeholder="••••••••" dir="ltr" className={inp + ' pr-10'}/>
                      <button onClick={()=>setEditPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {editPass?<EyeOff size={15}/>:<Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">New Key / License (leave blank to keep)</label>
                  <div className="relative">
                    <input value={editForm.key} onChange={e=>setEditForm(f=>({...f,key:e.target.value}))}
                      type={editPass?'text':'password'} placeholder="XXXX-XXXX-XXXX-XXXX" dir="ltr" className={inp + ' pr-10 font-mono'}/>
                    <button onClick={()=>setEditPass(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {editPass?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Notes</label>
                <textarea value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))}
                  rows={2} className={inp + ' resize-none'}/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setEditItem(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-[2] py-3 rounded-xl disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                style={{background:GOLD}}>
                {editSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving…</> : <><Check size={15}/> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>{ if(!importing) setImportModal(false) }}>
          <div className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-[#1a2233] rounded-2xl w-full max-w-lg shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Import Stock via CSV</h2>
                <p className="text-xs text-gray-400 mt-0.5">Bulk-add stock items from a spreadsheet</p>
              </div>
              <button onClick={()=>{ if(!importing) setImportModal(false) }} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={14}/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tool */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Tool</label>
                <select value={importForm.tool_id} onChange={e=>setImportForm(f=>({...f,tool_id:e.target.value}))} className={inp} disabled={importing}>
                  {tools.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Type selector */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Import Type</label>
                <div className="flex gap-2">
                  {(['account','key'] as const).map(type=>(
                    <button key={type} disabled={importing}
                      onClick={()=>{ setImportForm(f=>({...f,import_type:type})); setCsvFile(null); setImportResult(null) }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      style={importForm.import_type===type?{background:GOLD,color:'#fff'}:{background:'#f3f4f6',color:'#6b7280'}}>
                      {type==='account'?'📧 Email & Password':'🔑 Key'}
                    </button>
                  ))}
                </div>
              </div>

              {/* CSV format hint + template download */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      Expected columns:
                    </p>
                    <code className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                      {importForm.import_type === 'account' ? 'email, password' : 'key'}
                    </code>
                    <p className="text-[10px] text-gray-400 mt-1">One row per item. Header row required.</p>
                  </div>
                  <button onClick={()=>downloadTemplate(importForm.import_type)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                    <Download size={12}/>Template
                  </button>
                </div>
              </div>

              {/* File picker */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">CSV File</label>
                <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${csvFile?'border-amber-400 bg-amber-50/40 dark:bg-amber-900/10':'border-gray-200 dark:border-gray-700 hover:border-amber-300'} ${importing?'pointer-events-none opacity-50':''}`}>
                  <FileText size={18} className={csvFile?'text-amber-500':'text-gray-400'}/>
                  <div className="flex-1 min-w-0">
                    {csvFile
                      ? <><p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{csvFile.name}</p>
                          <p className="text-[10px] text-gray-400">{(csvFile.size/1024).toFixed(1)} KB</p></>
                      : <p className="text-sm text-gray-400">Click to select .csv file</p>}
                  </div>
                  {csvFile && <button type="button" onClick={e=>{e.preventDefault();setCsvFile(null);setImportResult(null)}} className="text-gray-400 hover:text-red-400"><X size={14}/></button>}
                  <input type="file" accept=".csv,text/csv" className="hidden"
                    onChange={e=>{ setCsvFile(e.target.files?.[0]||null); setImportResult(null); e.target.value='' }}/>
                </label>
              </div>

              {/* Import results */}
              {importResult && (
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-gray-700">
                    {[
                      { label:'Total',    val:importResult.total,    color:'#6b7280' },
                      { label:'Imported', val:importResult.imported,  color:'#10b981' },
                      { label:'Skipped',  val:importResult.skipped,   color:'#f59e0b' },
                      { label:'Failed',   val:importResult.failed,    color:'#ef4444' },
                    ].map(s=>(
                      <div key={s.label} className="px-3 py-2.5 text-center bg-gray-50 dark:bg-gray-800/30">
                        <div className="text-lg font-black" style={{color:s.color}}>{s.val}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-3 max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0,20).map((e,i)=>(
                        <p key={i} className="text-[11px] text-red-500 mb-0.5">Row {e.row}: {e.reason}</p>
                      ))}
                      {importResult.errors.length > 20 && (
                        <p className="text-[11px] text-gray-400">…and {importResult.errors.length-20} more errors</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={()=>{ if(!importing) setImportModal(false) }} disabled={importing}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                {importResult ? 'Close' : 'Cancel'}
              </button>
              <button onClick={runImport} disabled={!csvFile||importing||!importForm.tool_id}
                className="flex-[2] py-3 rounded-xl disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                style={{background:GOLD}}>
                {importing
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Importing…</>
                  : <><Upload size={15}/>Import CSV</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
