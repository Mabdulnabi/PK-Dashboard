'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Check, AlertCircle, Upload, User } from 'lucide-react'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check size={15}/> : <AlertCircle size={15}/>}{msg}
    </div>
  )
}

export default function AdminProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl,   setAvatarUrl]   = useState('')
  const [preview,     setPreview]     = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/profile').then(r => r.json()).then(d => {
      setDisplayName(d.display_name || '')
      setAvatarUrl(d.avatar_url || '')
      setPreview(d.avatar_url || null)
    })
  }, [])

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const ext  = file.name.split('.').pop()
    const path = `admin-avatars/${user.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setToast({ msg: error.message, type: 'err' }); setUploading(false); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
    setPreview(data.publicUrl)
    setUploading(false)
  }

  const save = async () => {
    setSaving(true)
    const res  = await fetch('/api/admin/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl || null }),
    })
    setSaving(false)
    if (res.ok) setToast({ msg: 'Profile saved', type: 'ok' })
    else        setToast({ msg: 'Failed to save', type: 'err' })
  }

  const inp = "w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-red-400 transition-all"

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Admin Profile" subtitle="Customize how you appear to members"/>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-md">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 space-y-6">

              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    {preview
                      ? <img src={preview} className="w-full h-full object-cover" alt="avatar"/>
                      : <User size={32} className="text-emerald-400"/>
                    }
                  </div>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-md transition-colors disabled:opacity-60">
                    {uploading
                      ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      : <Upload size={12} className="text-white"/>
                    }
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}/>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Profile picture</p>
                  <p className="text-xs text-gray-400 mt-0.5">Shown to members in ticket replies</p>
                  {preview && (
                    <button onClick={() => { setPreview(null); setAvatarUrl('') }}
                      className="text-[11px] text-red-400 hover:text-red-600 mt-1 transition-colors">Remove photo</button>
                  )}
                </div>
              </div>

              {/* Display name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Support Team" className={inp}/>
                <p className="text-[11px] text-gray-400 mt-1">Members see this name on your replies</p>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Preview</p>
                <div className="flex gap-2 justify-end">
                  <div className="flex flex-col gap-0.5 items-end max-w-[80%]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-emerald-500">{displayName || 'Support Team'}</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                      Hello! How can I help you today?
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {preview
                      ? <img src={preview} className="w-full h-full object-cover" alt=""/>
                      : (displayName?.charAt(0) || 'S').toUpperCase()
                    }
                  </div>
                </div>
              </div>

              <button onClick={save} disabled={saving || !displayName.trim()}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}
