'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Check, AlertCircle, Save, Globe, Phone, DollarSign, Link, Video, Gift } from 'lucide-react'

function Toast({msg,type,onClose}:{msg:string;type:'ok'|'err';onClose:()=>void}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose])
  return <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>{type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}</div>
}

const inp = "w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"

const SECTIONS = [
  {
    id: 'contact',
    label: 'Contact & Support',
    icon: Phone,
    color: '#10B981',
    fields: [
      { key:'whatsapp_number',      label:'WhatsApp Number',          placeholder:'+201000000000',  hint:'Used for support buttons across user dashboard' },
      { key:'site_name',            label:'Site Name',                placeholder:'Pro Keys',        hint:'Shown in browser title and emails' },
    ]
  },
  {
    id: 'currency',
    label: 'Currency & Pricing',
    icon: DollarSign,
    color: '#F59E0B',
    fields: [
      { key:'usd_to_egp_rate',      label:'USD → EGP Rate',           placeholder:'50',             hint:'Used to convert prices in user dashboard currency toggle' },
    ]
  },
  {
    id: 'extension',
    label: 'Chrome Extension',
    icon: Link,
    color: '#3B82F6',
    fields: [
      { key:'extension_url_1',      label:'Extension Download URL 1', placeholder:'https://...',    hint:'Download link shown after purchase' },
      { key:'extension_url_2',      label:'Extension Download URL 2', placeholder:'https://...',    hint:'Second extension download link' },
      { key:'extension_pc_guide',   label:'PC Install Guide URL',     placeholder:'https://...',    hint:'Link to PC installation guide' },
      { key:'extension_mobile_guide',label:'Mobile Guide URL',        placeholder:'https://...',    hint:'Link to mobile usage guide' },
    ]
  },
  {
    id: 'social',
    label: 'Social & Links',
    icon: Globe,
    color: '#8B5CF6',
    fields: [
      { key:'telegram_channel',     label:'Telegram Channel',         placeholder:'https://t.me/...', hint:'Optional Telegram channel link' },
      { key:'facebook_page',        label:'Facebook Page',            placeholder:'https://fb.com/...', hint:'Optional Facebook page link' },
      { key:'instagram_page',       label:'Instagram Page',           placeholder:'https://instagram.com/...', hint:'Optional Instagram link' },
    ]
  },
]

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string,string>>({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [changed,  setChanged]  = useState<Set<string>>(new Set())

  const load = useCallback(async()=>{
    const {data} = await supabase.from('site_settings').select('*')
    if (data) {
      const s:Record<string,string> = {}
      data.forEach((r:any)=>{ s[r.key]=r.value })
      setSettings(s)
    }
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  const update = (key:string, value:string) => {
    setSettings(prev=>({...prev,[key]:value}))
    setChanged(prev=>new Set(prev).add(key))
  }

  const save = async(keys?:string[]) => {
    const toSave = keys || Array.from(changed)
    if (toSave.length===0) return
    setSaving(true)

    const upserts = toSave.map(key=>({
      key,
      value: settings[key]||'',
      updated_at: new Date().toISOString()
    }))

    const {error} = await supabase
      .from('site_settings')
      .upsert(upserts, {onConflict:'key'})

    setSaving(false)
    if (error) { setToast({msg:error.message,type:'err'}); return }
    setToast({msg:`${toSave.length} setting${toSave.length>1?'s':''} saved`,type:'ok'})
    setChanged(new Set())
  }

  const saveSection = (fields:{key:string}[]) => {
    save(fields.map(f=>f.key))
  }

  if (loading) return (
    <div className="flex h-screen">
      <Sidebar/>
      <main className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/>
      </main>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Site Settings" subtitle="Configure global settings for Pro Keys dashboard"/>

        {/* Save all bar */}
        {changed.size > 0 && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex-shrink-0">
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              ⚠️ You have {changed.size} unsaved change{changed.size>1?'s':''}
            </span>
            <button onClick={()=>save()} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors disabled:opacity-60">
              {saving?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<><Save size={14}/>Save All Changes</>}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-5">
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            {SECTIONS.map(section=>{
              const Icon = section.icon
              const sectionChanged = section.fields.some(f=>changed.has(f.key))
              return (
                <div key={section.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:section.color+'15'}}>
                        <Icon size={16} style={{color:section.color}}/>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{section.label}</div>
                        <div className="text-[11px] text-gray-400">{section.fields.length} setting{section.fields.length>1?'s':''}</div>
                      </div>
                    </div>
                    <button onClick={()=>saveSection(section.fields)} disabled={saving||!sectionChanged}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sectionChanged?'bg-red-500 hover:bg-red-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-default'}`}>
                      <Save size={12}/>Save
                    </button>
                  </div>

                  {/* Fields */}
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {section.fields.map(field=>{
                      const isChanged = changed.has(field.key)
                      return (
                        <div key={field.key} className="px-5 py-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{field.label}</label>
                            {isChanged && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Modified</span>
                            )}
                          </div>
                          <input
                            value={settings[field.key]||''}
                            onChange={e=>update(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className={`${inp} ${isChanged?'border-amber-300 ring-2 ring-amber-400/10':''}`}
                          />
                          {field.hint && (
                            <p className="text-[11px] text-gray-400 mt-1.5">{field.hint}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Preview card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Gift size={16} className="text-gray-500"/>
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Preview</div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                {[
                  ['Site Name',     settings.site_name||'—'],
                  ['WhatsApp',      settings.whatsapp_number||'—'],
                  ['USD Rate',      settings.usd_to_egp_rate ? `1 USD = ${settings.usd_to_egp_rate} EGP` : '—'],
                  ['Ext URL 1',     settings.extension_url_1||'—'],
                  ['Ext URL 2',     settings.extension_url_2||'—'],
                ].map(([k,v])=>(
                  <div key={k} className="flex items-center gap-3 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className="text-xs text-gray-400 w-24 flex-shrink-0">{k}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
