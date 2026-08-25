'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Puck } from '@puckeditor/core'
import type { Data } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import { puckConfig } from '@/lib/puck/config'
import { ArrowLeft, Check, AlertCircle } from 'lucide-react'

const GOLD = '#d99401'

const EMPTY_DATA: Data = { content: [], root: { props: {} } }

function Toast({ msg, type, onClose }: { msg:string; type:'ok'|'err'; onClose:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onClose,3000); return()=>clearTimeout(t) },[onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-500':'bg-red-500'}`}>
      {type==='ok'?<Check size={15}/>:<AlertCircle size={15}/>}{msg}
    </div>
  )
}

export default function LandingEditorPage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()

  const [toolName,  setToolName]  = useState('')
  const [toolImg,   setToolImg]   = useState('')
  const [data,      setData]      = useState<Data>(EMPTY_DATA)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState<{msg:string;type:'ok'|'err'}|null>(null)

  useEffect(()=>{
    fetch(`/api/admin/landing/${id}`)
      .then(r=>r.json())
      .then(d=>{
        setToolName(d.tool?.name || '')
        setToolImg(d.tool?.image_url || '')
        if (d.tool?.landing_data) {
          try { setData(JSON.parse(typeof d.tool.landing_data === 'string' ? d.tool.landing_data : JSON.stringify(d.tool.landing_data))) }
          catch { setData(EMPTY_DATA) }
        }
        setLoading(false)
      })
  },[id])

  const onPublish = async (published: Data) => {
    setSaving(true)
    const res = await fetch(`/api/admin/landing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ landing_data: published }),
    })
    setSaving(false)
    const json = await res.json()
    if (!res.ok) { setToast({ msg: json.error || 'Error saving', type: 'err' }); return }
    setToast({ msg: 'Landing page saved ✓', type: 'ok' })
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0D1117]">
      <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:`${GOLD} transparent transparent transparent`}}/>
    </div>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Custom top bar above Puck */}
      <header className="flex items-center gap-4 px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 z-50 shadow-sm">
        <button onClick={()=>router.push('/store')}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <ArrowLeft size={16}/>
        </button>
        <div className="flex items-center gap-2.5">
          {toolImg && <img src={toolImg} alt={toolName} className="w-7 h-7 rounded-lg object-contain bg-gray-100 dark:bg-gray-800 p-0.5"/>}
          <div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{toolName}</div>
            <div className="text-[10px] text-gray-400">Landing Page Editor</div>
          </div>
        </div>
        {saving && (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin"/>
            Saving…
          </div>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        <Puck
          config={puckConfig}
          data={data}
          onPublish={onPublish}
          onChange={setData}
        />
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
