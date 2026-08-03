'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Trash2, Check, AlertCircle, Pencil, X, GripVertical, Sparkles, Bell, Palette } from 'lucide-react'

interface Suggestion { id: string; name: string; color: string; sort_order: number }

const PRESET_COLORS = [
  '#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6',
  '#EC4899','#06B6D4','#6366F1','#14B8A6','#F97316',
  '#84CC16','#A855F7','#10A37F','#D85A30','#0077B5',
]

function Toast({ msg, type, onClose }:{ msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onClose,3000); return ()=>clearTimeout(t) },[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"

export default function SettingsPage() {
  const [tab, setTab] = useState<'quickadd'|'alerts'|'appearance'>('quickadd')
  const [invoiceLogo,    setInvoiceLogo]    = useState('')
  const [siteName,       setSiteName]       = useState('')
  const [logoUploading,  setLogoUploading]  = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading]   = useState(true)
  const [toast,   setToast]     = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving,  setSaving]    = useState(false)
  const [modal,   setModal]     = useState<'add'|'edit'|null>(null)
  const [editItem,setEditItem]  = useState<Suggestion|null>(null)
  const [delConfirm, setDel]    = useState<Suggestion|null>(null)

  const emptyForm = { name:'', color:'#EF4444' }
  const [form, setForm] = useState(emptyForm)

  // Alert settings
  const [alertDays, setAlertDays]       = useState('3,7,14')
  const [telegramId, setTelegramId]     = useState('')
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [tgEnabled, setTgEnabled]       = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('quick_add_suggestions')
      .select('*')
      .order('sort_order')
    if (data) setSuggestions(data)

    const { data: alertData } = await supabase
      .from('alert_settings')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()
    if (alertData) {
      setAlertDays(alertData.notify_days_before?.join(',') || '3,7,14')
      setTelegramId(alertData.telegram_chat_id || '')
      setEmailEnabled(alertData.email_enabled ?? true)
      setTgEnabled(alertData.telegram_enabled ?? false)
    }
    const { data: uiData } = await supabase.from('ui_settings').select('key,value')
    const ui: Record<string,string> = {}
    ;(uiData||[]).forEach((r:any)=>{ ui[r.key]=r.value })
    setInvoiceLogo(ui.invoice_logo || '')
    setSiteName(ui.site_name || '')

    setLoading(false)
  },[])

  useEffect(()=>{ load() },[load])

  // ── Suggestions CRUD ──────────────────────────────────────
  const openAdd = () => { setForm(emptyForm); setEditItem(null); setModal('add') }
  const openEdit = (s:Suggestion) => { setForm({ name:s.name, color:s.color }); setEditItem(s); setModal('edit') }

  const saveSuggestion = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const res = editItem
      ? await supabase.from('quick_add_suggestions').update({ name:form.name, color:form.color }).eq('id', editItem.id)
      : await supabase.from('quick_add_suggestions').insert({ name:form.name, color:form.color, sort_order: suggestions.length })
    setSaving(false)
    if (res.error) { setToast({ msg:res.error.message, type:'err' }); return }
    setToast({ msg: editItem ? 'Updated' : 'Suggestion added', type:'ok' })
    setModal(null); load()
  }

  const deleteSuggestion = async (s:Suggestion) => {
    await supabase.from('quick_add_suggestions').delete().eq('id', s.id)
    setToast({ msg:'Removed from Quick Add', type:'ok' })
    setDel(null); load()
  }

  // ── Alert settings save ───────────────────────────────────
  const saveAlerts = async () => {
    setSaving(true)
    const userId = (await supabase.auth.getUser()).data.user?.id
    const days = alertDays.split(',').map(d=>parseInt(d.trim())).filter(d=>!isNaN(d))
    await supabase.from('alert_settings').upsert({
      user_id: userId,
      notify_days_before: days,
      telegram_chat_id: telegramId || null,
      email_enabled: emailEnabled,
      telegram_enabled: tgEnabled,
    }, { onConflict: 'user_id' })
    setSaving(false)
    setToast({ msg:'Alert settings saved', type:'ok' })
  }

  const uploadLogo = async (file: File) => {
    setLogoUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `invoice-logos/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true })
    if (upErr) { setToast({ msg: upErr.message, type:'err' }); setLogoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('public-assets').getPublicUrl(path)
    setInvoiceLogo(publicUrl)
    await fetch('/api/admin/ui-settings', {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ invoice_logo: publicUrl }),
    })
    setLogoUploading(false)
    setToast({ msg:'Invoice logo saved', type:'ok' })
  }

  const saveInvoiceSettings = async () => {
    setSaving(true)
    await fetch('/api/admin/ui-settings', {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ site_name: siteName, invoice_logo: invoiceLogo }),
    })
    setSaving(false)
    setToast({ msg:'Invoice settings saved', type:'ok' })
  }

  const tabs = [
    { id:'quickadd',    label:'Quick Add',   icon:Sparkles },
    { id:'alerts',      label:'Alerts',      icon:Bell },
    { id:'appearance',  label:'Appearance',  icon:Palette },
  ] as const

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Settings" subtitle="Manage your dashboard preferences" />

        <div className="flex-1 overflow-auto p-5">
          <div className="max-w-2xl mx-auto flex flex-col gap-5">

            {/* Tab bar */}
            <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-1">
              {tabs.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id} onClick={()=>setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      tab===t.id
                        ? 'bg-red-500 text-white shadow-sm shadow-red-500/30'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}>
                    <Icon size={13}/>{t.label}
                  </button>
                )
              })}
            </div>

            {/* ══ TAB: Quick Add ══ */}
            {tab==='quickadd' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Quick Add Suggestions</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">These appear in Products page as one-click shortcuts</div>
                  </div>
                  <button onClick={openAdd}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
                    <Plus size={13}/>Add
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-3">
                    <Sparkles size={28} className="text-gray-200 dark:text-gray-700"/>
                    <p className="text-sm text-gray-400">No suggestions yet</p>
                    <button onClick={openAdd}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600">
                      <Plus size={12}/>Add First Suggestion
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {suggestions.map((s,i) => (
                      <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-colors">
                        <GripVertical size={14} className="text-gray-200 dark:text-gray-700 group-hover:text-gray-400 cursor-grab flex-shrink-0"/>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background:s.color }}>
                          {s.name.slice(0,1).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{s.name}</div>
                          <div className="text-[10px] font-mono text-gray-400">{s.color}</div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>openEdit(s)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Pencil size={12}/>
                          </button>
                          <button onClick={()=>setDel(s)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ TAB: Alerts ══ */}
            {tab==='alerts' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-4">
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Notification Settings</div>
                  <div className="text-[10px] text-gray-400">Configure when and how you get expiry alerts</div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">
                    Notify days before expiry
                  </label>
                  <input value={alertDays} onChange={e=>setAlertDays(e.target.value)}
                    placeholder="3,7,14" className={inp}/>
                  <p className="text-[10px] text-gray-400 mt-1">Comma-separated — e.g. 3,7,14 sends alerts 3, 7, and 14 days before</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Channels</label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className={`w-9 h-5 rounded-full transition-colors relative ${emailEnabled?'bg-red-500':'bg-gray-200 dark:bg-gray-700'}`}
                      onClick={()=>setEmailEnabled(!emailEnabled)}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${emailEnabled?'translate-x-4':'translate-x-0.5'}`}/>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Email notifications</div>
                      <div className="text-[10px] text-gray-400">Receive alerts via email</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className={`w-9 h-5 rounded-full transition-colors relative ${tgEnabled?'bg-red-500':'bg-gray-200 dark:bg-gray-700'}`}
                      onClick={()=>setTgEnabled(!tgEnabled)}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tgEnabled?'translate-x-4':'translate-x-0.5'}`}/>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Telegram notifications</div>
                      <div className="text-[10px] text-gray-400">Receive alerts via Telegram bot</div>
                    </div>
                  </label>
                </div>

                {tgEnabled && (
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Telegram Chat ID</label>
                    <input value={telegramId} onChange={e=>setTelegramId(e.target.value)}
                      placeholder="e.g. 123456789" className={inp}/>
                    <p className="text-[10px] text-gray-400 mt-1">Get your Chat ID from @userinfobot on Telegram</p>
                  </div>
                )}

                <button onClick={saveAlerts} disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>Save Alert Settings</>}
                </button>
              </div>
            )}

            {/* ══ TAB: Appearance ══ */}
            {tab==='appearance' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-4">
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Appearance</div>
                  <div className="text-[10px] text-gray-400">Customize how the dashboard looks</div>
                </div>
                {/* Invoice Branding */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-4">
                  <div>
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-100">Invoice Branding</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Logo and site name shown on customer invoices</div>
                  </div>

                  {/* Logo upload */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2 block">Logo</label>
                    <div className="flex items-center gap-4">
                      {/* Preview */}
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                        {invoiceLogo
                          ? <img src={invoiceLogo} alt="logo" className="w-full h-full object-contain p-1"/>
                          : <span className="text-[10px] text-gray-300 dark:text-gray-600 text-center leading-tight">No logo</span>
                        }
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-fit">
                          {logoUploading
                            ? <div className="w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"/>
                            : <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">📁 Upload Logo</span>
                          }
                          <input type="file" accept="image/*" className="hidden"
                            onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadLogo(f) }}/>
                        </label>
                        {invoiceLogo && (
                          <button onClick={()=>{ setInvoiceLogo(''); fetch('/api/admin/ui-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({invoice_logo:''})}) }}
                            className="text-[10px] text-red-400 hover:text-red-500 text-left">Remove logo</button>
                        )}
                        <p className="text-[9px] text-gray-400">PNG, JPG, SVG — recommended 200×200px</p>
                      </div>
                    </div>
                  </div>

                  {/* Site name */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Site / Business Name</label>
                    <input value={siteName} onChange={e=>setSiteName(e.target.value)}
                      placeholder="Pro Keys" className={inp}/>
                  </div>

                  <button onClick={saveInvoiceSettings} disabled={saving}
                    className="self-start flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-60">
                    {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Check size={12}/>}
                    Save Invoice Settings
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2 block">Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id:'light', label:'Light', bg:'#F8FAFC', border:'#E2E8F0', text:'#0F172A' },
                      { id:'dark',  label:'Dark',  bg:'#0D1117', border:'#1C2128', text:'#F1F5F9' },
                    ].map(t => (
                      <button key={t.id}
                        onClick={()=>{
                          document.documentElement.classList.toggle('dark', t.id==='dark')
                          localStorage.setItem('theme', t.id)
                          setToast({ msg:`${t.label} mode enabled`, type:'ok' })
                        }}
                        className="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:border-red-400"
                        style={{ background:t.bg, borderColor:t.border }}>
                        {/* Mini preview */}
                        <div className="w-full h-16 rounded-lg overflow-hidden flex" style={{ background:t.bg, border:`1px solid ${t.border}` }}>
                          <div className="w-8 h-full" style={{ background: t.id==='dark'?'#111827':'#1F2937' }}/>
                          <div className="flex-1 p-1.5 flex flex-col gap-1">
                            <div className="h-2 rounded w-3/4" style={{ background:t.id==='dark'?'#1C2128':'#E2E8F0' }}/>
                            <div className="h-2 rounded w-1/2" style={{ background:t.id==='dark'?'#1C2128':'#E2E8F0' }}/>
                            <div className="h-4 rounded mt-auto" style={{ background:'#EF4444', opacity:0.8 }}/>
                          </div>
                        </div>
                        <span className="text-xs font-bold" style={{ color:t.text }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {modal==='add'?'Add Quick Suggestion':'Edit Suggestion'}
              </h3>
              <button onClick={()=>setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background:form.color+'15', border:`1px solid ${form.color}30` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ background:form.color }}>
                  {form.name.slice(0,1).toUpperCase()||'?'}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{form.name||'Name'}</div>
                  <div className="text-[10px] font-mono text-gray-400">{form.color}</div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Tool Name *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                  onKeyDown={e=>e.key==='Enter'&&saveSuggestion()}
                  placeholder="e.g. Notion AI" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map(c=>(
                    <button key={c} onClick={()=>setForm({...form,color:c})}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                      style={{ background:c, outline:form.color===c?`2px solid ${c}`:'none', outlineOffset:2 }}>
                      {form.color===c && <Check size={11} className="text-white"/>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})}
                    className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"/>
                  <input value={form.color} onChange={e=>setForm({...form,color:e.target.value})}
                    placeholder="#000000" className={inp+" flex-1 font-mono"}/>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={saveSuggestion} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add'?'Add':'Save'}</>}
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
            <h3 className="font-bold text-center text-gray-900 dark:text-gray-100 mb-1">Remove Suggestion?</h3>
            <p className="text-xs text-center text-gray-400 mb-5">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{delConfirm.name}</span> will be removed from Quick Add.
            </p>
            <div className="flex gap-2">
              <button onClick={()=>setDel(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={()=>deleteSuggestion(delConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold">Remove</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
