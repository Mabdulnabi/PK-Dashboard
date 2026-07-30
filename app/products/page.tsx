'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Pencil, Trash2, X, Check, AlertCircle, ToggleLeft, ToggleRight, Package } from 'lucide-react'

interface Product {
  id: string; name: string; color: string; icon: string
  is_active: boolean; created_at: string
}

const PRESET_COLORS = [
  '#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6',
  '#EC4899','#06B6D4','#6366F1','#14B8A6','#F97316',
  '#84CC16','#A855F7','#10A37F','#D85A30','#64748B'
]

const PRESET_PRODUCTS = [
  { name:'QuillBot',       color:'#10B981' },
  { name:'Grammarly',      color:'#3B82F6' },
  { name:'Turnitin',       color:'#8B5CF6' },
  { name:'Canva Pro',      color:'#06B6D4' },
  { name:'Gemini Pro',     color:'#6366F1' },
  { name:'Perplexity',     color:'#F59E0B' },
  { name:'GO Plus',        color:'#EF4444' },
  { name:'SciSpace',       color:'#14B8A6' },
  { name:'ChatGPT Plus',   color:'#10A37F' },
  { name:'Gamma Pro',      color:'#EC4899' },
  { name:'SEMrush',        color:'#F97316' },
  { name:'LinkedIn Premium',color:'#0077B5'},
]

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<'add'|'edit'|null>(null)
  const [delConfirm, setDel]    = useState<Product|null>(null)
  const [toast, setToast]       = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving, setSaving]     = useState(false)
  const [subCounts, setSubCounts] = useState<Record<string,number>>({})

  const emptyForm = { name:'', color:'#EF4444', icon:'package' }
  const [form, setForm]   = useState(emptyForm)
  const [editId, setEditId] = useState<string|null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    if (data) setProducts(data)
    // Count active subscriptions per product
    const { data: subs } = await supabase.from('subscriptions')
      .select('product_id').eq('status','active')
    if (subs) {
      const counts: Record<string,number> = {}
      subs.forEach((s:any) => { counts[s.product_id] = (counts[s.product_id]||0) + 1 })
      setSubCounts(counts)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal('add') }
  const openEdit = (p: Product) => { setForm({ name:p.name, color:p.color, icon:p.icon }); setEditId(p.id); setModal('edit') }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const res = editId
      ? await supabase.from('products').update({ name:form.name, color:form.color, icon:form.icon }).eq('id', editId)
      : await supabase.from('products').insert({ name:form.name, color:form.color, icon:form.icon })
    setSaving(false)
    if (res.error) { setToast({ msg:res.error.message, type:'err' }); return }
    setToast({ msg: editId ? 'Product updated' : 'Product added', type:'ok' })
    setModal(null); load()
  }

  const toggleActive = async (p: Product) => {
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    setToast({ msg: p.is_active ? 'Product deactivated' : 'Product activated', type:'ok' })
    load()
  }

  const del = async () => {
    if (!delConfirm) return
    const res = await supabase.from('products').delete().eq('id', delConfirm.id)
    if (res.error) { setToast({ msg:'Cannot delete — product has subscriptions', type:'err' }); setDel(null); return }
    setToast({ msg:'Product deleted', type:'ok' })
    setDel(null); load()
  }

  const quickAdd = async (preset: typeof PRESET_PRODUCTS[0]) => {
    const exists = products.find(p => p.name.toLowerCase() === preset.name.toLowerCase())
    if (exists) { setToast({ msg:`${preset.name} already exists`, type:'err' }); return }
    await supabase.from('products').insert({ name:preset.name, color:preset.color, icon:'package' })
    setToast({ msg:`${preset.name} added`, type:'ok' }); load()
  }

  const notAdded = PRESET_PRODUCTS.filter(p => !products.find(e => e.name.toLowerCase() === p.name.toLowerCase()))
  const active   = products.filter(p => p.is_active)
  const inactive = products.filter(p => !p.is_active)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Products" subtitle={`${active.length} active · ${inactive.length} inactive`}
          onAdd={openAdd} addLabel="New Product" />

        <div className="flex-1 overflow-auto p-5 flex flex-col gap-5">

          {/* Quick-add presets */}
          {notAdded.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Quick Add</span>
                <span className="text-[10px] text-gray-400">— click to add instantly</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {notAdded.map(p => (
                  <button key={p.name} onClick={() => quickAdd(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 hover:border-solid text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all group">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:p.color }}/>
                    <Plus size={10} className="opacity-50 group-hover:opacity-100"/>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active products grid */}
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>
          ) : (
            <>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3 px-1">Active Products ({active.length})</div>
                {active.length === 0 && (
                  <div className="text-center py-10 text-sm text-gray-400 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                    No active products yet
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {active.map(p => (
                    <ProductCard key={p.id} product={p} subCount={subCounts[p.id]||0}
                      onEdit={() => openEdit(p)}
                      onToggle={() => toggleActive(p)}
                      onDelete={() => setDel(p)} />
                  ))}
                </div>
              </div>

              {inactive.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3 px-1">Inactive ({inactive.length})</div>
                  <div className="grid grid-cols-3 gap-3">
                    {inactive.map(p => (
                      <ProductCard key={p.id} product={p} subCount={subCounts[p.id]||0}
                        onEdit={() => openEdit(p)}
                        onToggle={() => toggleActive(p)}
                        onDelete={() => setDel(p)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {modal==='add' ? 'Add New Product' : 'Edit Product'}
              </h3>
              <button onClick={()=>setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: form.color+'15', border:`1px solid ${form.color}30` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                  style={{ background: form.color }}>
                  {form.name.slice(0,1).toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{form.name || 'Product name'}</div>
                  <div className="text-[10px] text-gray-400">{form.color}</div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Product Name *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                  placeholder="e.g. QuillBot" className={inp}/>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={()=>setForm({...form,color:c})}
                      className="w-6 h-6 rounded-lg transition-all flex items-center justify-center"
                      style={{ background:c, outline: form.color===c ? `2px solid ${c}` : 'none', outlineOffset:2 }}>
                      {form.color===c && <Check size={12} className="text-white"/>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"/>
                  <input value={form.color} onChange={e=>setForm({...form,color:e.target.value})}
                    placeholder="#000000" className={inp + " flex-1"}/>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check size={13}/>{modal==='add'?'Add Product':'Save Changes'}</>}
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
            <h3 className="font-bold text-center text-gray-900 dark:text-gray-100 mb-1">Delete Product?</h3>
            <p className="text-xs text-center text-gray-400 mb-5">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{delConfirm.name}</span> will be deleted.<br/>
              Products with existing subscriptions cannot be deleted.
            </p>
            <div className="flex gap-2">
              <button onClick={()=>setDel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={del} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}

// ── Product Card ─────────────────────────────────────────────
function ProductCard({ product:p, subCount, onEdit, onToggle, onDelete }:{
  product:Product; subCount:number
  onEdit:()=>void; onToggle:()=>void; onDelete:()=>void
}) {
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-xl p-4 transition-all ${p.is_active ? 'border-gray-100 dark:border-gray-800' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
      {/* Top */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
          style={{ background: p.color }}>
          {p.name.slice(0,1).toUpperCase()}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            <Pencil size={13}/>
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={13}/>
          </button>
        </div>
      </div>

      {/* Name */}
      <div className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-1">{p.name}</div>

      {/* Sub count */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-[10px] text-gray-400">
          <span className="font-bold text-gray-700 dark:text-gray-300">{subCount}</span> active subs
        </div>

        {/* Color dot + toggle */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }}/>
          <button onClick={onToggle} className="transition-colors" title={p.is_active?'Deactivate':'Activate'}>
            {p.is_active
              ? <ToggleRight size={22} style={{ color: p.color }}/>
              : <ToggleLeft size={22} className="text-gray-300"/>}
          </button>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="h-0.5 rounded-full mt-3" style={{ background: p.color+'40' }}/>
    </div>
  )
}
