'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Plus, Key, Copy, Download, RefreshCw, Check, X, AlertCircle, Eye, EyeOff, Trash2, Activity } from 'lucide-react'

interface Product { id:string; name:string; tool_url:string; product_id:string; secret_key:string; token_ttl:number; is_active:boolean; total_clicks:number }

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"

function generateSecretKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  return 'pk_live_' + Array.from({length:32}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('')
}

function generateProductId(name:string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g,'_').slice(0,20) + '_' + Math.random().toString(36).slice(2,6)
}

export default function OneClickPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [logs, setLogs]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'products'|'log'>('products')
  const [modal, setModal]       = useState<'add'|'edit'|'script'|null>(null)
  const [editItem, setEditItem] = useState<Product|null>(null)
  const [toast, setToast]       = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [saving, setSaving]     = useState(false)
  const [showKey, setShowKey]   = useState<Record<string,boolean>>({})
  const [copied, setCopied]     = useState('')
  const [scriptProduct, setScriptProduct] = useState<Product|null>(null)
  const [dashUrl, setDashUrl]   = useState('https://your-dashboard.vercel.app')

  const emptyForm = { name:'', tool_url:'https://', product_id:'', secret_key:generateSecretKey(), token_ttl:30 }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    const [pRes, lRes] = await Promise.all([
      supabase.from('oneclick_products').select('*').order('created_at', {ascending:false}),
      supabase.from('oneclick_log').select('*').order('created_at', {ascending:false}).limit(50),
    ])
    if (pRes.data) setProducts(pRes.data)
    if (lRes.data) setLogs(lRes.data)
    setLoading(false)
  }, [])

  useEffect(()=>{ load() },[load])

  const openAdd = () => {
    setForm({...emptyForm, secret_key: generateSecretKey()})
    setEditItem(null); setModal('add')
  }

  const openEdit = (p:Product) => {
    setForm({ name:p.name, tool_url:p.tool_url, product_id:p.product_id, secret_key:p.secret_key, token_ttl:p.token_ttl })
    setEditItem(p); setModal('edit')
  }

  const openScript = (p:Product) => { setScriptProduct(p); setModal('script') }

  const save = async () => {
    if (!form.name || !form.tool_url) return
    setSaving(true)
    const pid = editItem ? form.product_id : generateProductId(form.name)
    const payload = { name:form.name, tool_url:form.tool_url, product_id:pid, secret_key:form.secret_key, token_ttl:form.token_ttl }
    const res = editItem
      ? await supabase.from('oneclick_products').update(payload).eq('id', editItem.id)
      : await supabase.from('oneclick_products').insert(payload)
    setSaving(false)
    if (res.error) { setToast({msg:res.error.message,type:'err'}); return }
    setToast({msg:editItem?'Product updated':'Product added',type:'ok'})
    setModal(null); load()
  }

  const del = async (p:Product) => {
    await supabase.from('oneclick_products').delete().eq('id', p.id)
    setToast({msg:'Deleted',type:'ok'}); load()
  }

  const rotateKey = async (p:Product) => {
    const newKey = generateSecretKey()
    await supabase.from('oneclick_products').update({secret_key: newKey}).eq('id', p.id)
    setToast({msg:'Secret key rotated',type:'ok'}); load()
  }

  const copy = (text:string, id:string) => {
    navigator.clipboard.writeText(text)
    setCopied(id); setTimeout(()=>setCopied(''),1500)
  }

  const phpScript = (p:Product) => `<?php
/**
 * Pro Keys OneClick Login Script
 * Product: ${p.name}
 * Generated: ${new Date().toLocaleDateString()}
 * 
 * Upload to your cPanel/VPS and link customers to this file.
 */

$product_id = "${p.product_id}";
$secret_key = "${p.secret_key}";
$dashboard_url = "${dashUrl}";
$token_ttl = ${p.token_ttl};  // seconds

// Generate signed payload (HMAC-SHA256, same as aMember)
$payload   = time() + $token_ttl;
$signature = hash_hmac('sha256', (string)$payload, $secret_key);
$token     = $payload . '.' . $signature;

// Call Pro Keys API to register token
$api_url = $dashboard_url . '/api/oneclick/generate';
$ch = curl_init($api_url);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode(['product_id' => $product_id]),
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_TIMEOUT        => 10,
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);

if (!isset($response['success']) || !$response['success']) {
    die('OneClick Error: ' . ($response['error'] ?? 'Unknown error'));
}

// Redirect to tool with signed token
header('Location: ' . $response['url']);
exit;
`

  const statusColor = (s:string) =>
    s==='success' ? 'text-emerald-500' : s==='expired' ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="OneClick Manager" subtitle="aMember-style auto-login scripts" />

        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {([['products','Products',Key],['log','Audit Log',Activity]] as const).map(([id,label,Icon])=>(
              <button key={id} onClick={()=>setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab===id?'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
                <Icon size={12}/>{label}
              </button>
            ))}
          </div>
          {tab==='products' && (
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors">
              <Plus size={13}/>Add Product
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5">

          {/* ── Products ── */}
          {tab==='products' && (
            <div className="flex flex-col gap-3">
              {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
              {!loading && products.length===0 && (
                <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                  <Key size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-3"/>
                  <p className="text-sm text-gray-400 mb-3">No products yet</p>
                  <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600">
                    <Plus size={13}/>Add First Product
                  </button>
                </div>
              )}
              {products.map(p => (
                <div key={p.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Key size={18} className="text-red-500"/>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{p.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{p.product_id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:p.is_active?'#DCFCE7':'#FEE2E2',color:p.is_active?'#166534':'#991B1B'}}>
                        {p.is_active?'Active':'Inactive'}
                      </span>
                      <span className="text-[10px] text-gray-400">{p.total_clicks} clicks</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-[10px] text-gray-400 mb-1">Tool URL</div>
                      <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">{p.tool_url}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 mb-1">Secret Key</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate flex-1">
                          {showKey[p.id] ? p.secret_key : '••••••••••••••••••••'}
                        </div>
                        <button onClick={()=>setShowKey(k=>({...k,[p.id]:!k[p.id]}))} className="text-gray-400 hover:text-gray-600">
                          {showKey[p.id]?<EyeOff size={12}/>:<Eye size={12}/>}
                        </button>
                        <button onClick={()=>copy(p.secret_key,'key_'+p.id)} className="text-gray-400 hover:text-red-500">
                          {copied==='key_'+p.id?<Check size={12} className="text-emerald-500"/>:<Copy size={12}/>}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={()=>openScript(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">
                      <Download size={11}/>Get PHP Script
                    </button>
                    <button onClick={()=>openEdit(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      Edit
                    </button>
                    <button onClick={()=>rotateKey(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                      <RefreshCw size={10}/>Rotate Key
                    </button>
                    <button onClick={()=>del(p)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors ml-auto">
                      <Trash2 size={10}/>Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Audit Log ── */}
          {tab==='log' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {['Status','Product','Token','IP','Time'].map(h=>(
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length===0 && <tr><td colSpan={5} className="text-center py-10 text-sm text-gray-400">No activity yet</td></tr>}
                  {logs.map(l=>(
                    <tr key={l.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-2.5"><span className={`text-[11px] font-bold ${statusColor(l.status)}`}>{l.status}</span></td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-500">{l.product_id}</td>
                      <td className="px-4 py-2.5 text-[10px] font-mono text-gray-400">{l.token?.slice(0,20)}...</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{l.ip_address||'—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Add/Edit Modal ── */}
      {(modal==='add'||modal==='edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{modal==='add'?'Add Product':'Edit Product'}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Product Name *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value,product_id:editItem?form.product_id:generateProductId(e.target.value)})}
                  placeholder="e.g. QuillBot Premium" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Tool URL *</label>
                <input value={form.tool_url} onChange={e=>setForm({...form,tool_url:e.target.value})}
                  placeholder="https://quillbot.com" className={inp}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Product ID</label>
                <input value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})}
                  className={inp+" font-mono"} readOnly={!!editItem}/>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Secret Key</label>
                  <button onClick={()=>setForm({...form,secret_key:generateSecretKey()})}
                    className="text-[10px] text-red-500 hover:underline flex items-center gap-1">
                    <RefreshCw size={10}/>Generate new
                  </button>
                </div>
                <input value={form.secret_key} onChange={e=>setForm({...form,secret_key:e.target.value})}
                  className={inp+" font-mono text-[10px]"}/>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Token TTL (seconds)</label>
                <input type="number" value={form.token_ttl} onChange={e=>setForm({...form,token_ttl:parseInt(e.target.value)})}
                  className={inp}/>
                <p className="text-[10px] text-gray-400 mt-1">How long the login link stays valid — default 30s</p>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={()=>setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-1.5">
                {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Check size={13}/>{modal==='add'?'Add Product':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PHP Script Modal ── */}
      {modal==='script' && scriptProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">PHP OneClick Script — {scriptProduct.name}</h3>
              <button onClick={()=>setModal(null)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5 block">Your Dashboard URL</label>
                <input value={dashUrl} onChange={e=>setDashUrl(e.target.value)}
                  placeholder="https://your-dashboard.vercel.app" className={inp}/>
                <p className="text-[10px] text-gray-400 mt-1">The URL where your Pro Keys dashboard is hosted</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Generated Script</label>
                  <div className="flex gap-2">
                    <button onClick={()=>copy(phpScript(scriptProduct),'script')}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500">
                      {copied==='script'?<Check size={11} className="text-emerald-500"/>:<Copy size={11}/>}
                      Copy
                    </button>
                    <button onClick={()=>{
                      const blob = new Blob([phpScript(scriptProduct)],{type:'text/plain'})
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `oneclick_${scriptProduct.product_id}.php`
                      a.click()
                    }} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500">
                      <Download size={11}/>Download .php
                    </button>
                  </div>
                </div>
                <pre className="bg-gray-900 text-gray-300 rounded-xl p-4 text-[10px] font-mono overflow-x-auto leading-relaxed">
                  {phpScript(scriptProduct)}
                </pre>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mb-1">Instructions</p>
                <ol className="text-[10px] text-amber-600 dark:text-amber-500 space-y-0.5 list-decimal list-inside">
                  <li>Enter your dashboard URL above</li>
                  <li>Download the PHP file</li>
                  <li>Upload it to your cPanel or VPS</li>
                  <li>Link your customers to this file</li>
                  <li>Each click generates a 30-second signed login URL</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
