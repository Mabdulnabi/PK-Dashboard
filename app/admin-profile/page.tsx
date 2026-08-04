'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Check, AlertCircle, Camera, Eye, EyeOff } from 'lucide-react'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check size={15}/> : <AlertCircle size={15}/>}{msg}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">{title}</h2>
      {children}
    </div>
  )
}

export default function AdminProfilePage() {
  const [displayName, setDisplayName] = useState('')
  const [fullName,    setFullName]    = useState('')
  const [adminEmail,  setAdminEmail]  = useState('')
  const [whatsapp,    setWhatsapp]    = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [preview,     setPreview]     = useState<string | null>(null)
  const [avatarUrl,   setAvatarUrl]   = useState('')
  const [uploading,   setUploading]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/profile').then(r => r.json()).then(d => {
      if (d.error === 'unauthorized') { window.location.href = '/auth/login'; return }
      setDisplayName(d.display_name || '')
      setFullName(d.full_name || '')
      setWhatsapp(d.whatsapp || '')
      setAvatarUrl(d.avatar_url || '')
      setPreview(d.avatar_url || null)
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setAdminEmail(user.email)
    })
  }, [])

  const uploadAvatar = async (file: File) => {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); setToast({ msg: 'Not authenticated', type: 'err' }); return }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('admin_id', user.id)
    const res  = await fetch('/api/admin/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) {
      setPreview(data.url)
      setAvatarUrl(data.url)
      setToast({ msg: 'Photo updated', type: 'ok' })
    } else {
      setToast({ msg: data.error || 'Upload failed', type: 'err' })
    }
  }

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        full_name:    fullName,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        whatsapp:     whatsapp || null,
        email:        adminEmail || undefined,
        password:     password || undefined,
      }),
    })
    setSaving(false)
    setPassword('')
    if (res.ok) setToast({ msg: 'Profile saved ✓', type: 'ok' })
    else        setToast({ msg: 'Failed to save', type: 'err' })
  }

  const inp = "w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-red-400 transition-all"
  const initials = (displayName || fullName || 'S').charAt(0).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="My Profile" subtitle="Manage your account settings"/>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-lg space-y-5">

            {/* Avatar + identity */}
            <Section title="Identity">
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-emerald-500 flex items-center justify-center ring-4 ring-gray-100 dark:ring-gray-800">
                    {preview
                      ? <img src={preview} className="w-full h-full object-cover" alt="avatar"/>
                      : <span className="text-2xl font-bold text-white">{initials}</span>
                    }
                  </div>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-md transition-colors disabled:opacity-60">
                    {uploading
                      ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      : <Camera size={12} className="text-white"/>
                    }
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}/>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Display Name <span className="text-gray-400 normal-case font-normal">(shown to members)</span></label>
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                      placeholder="Support Team" className={inp}/>
                  </div>
                </div>
              </div>

              {/* Full name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Your real name" className={inp}/>
              </div>

              {/* Reply preview */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">How members see your replies</p>
                <div className="flex gap-2 justify-end">
                  <div className="flex flex-col gap-0.5 items-end max-w-[75%]">
                    <span className="text-[10px] font-semibold text-emerald-500">{displayName || 'Support Team'}</span>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                      Hello! How can I help you today?
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {preview ? <img src={preview} className="w-full h-full object-cover" alt=""/> : initials}
                  </div>
                </div>
              </div>
            </Section>

            {/* Account credentials */}
            <Section title="Account Credentials">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                  type="email" placeholder="admin@example.com" className={inp} dir="ltr"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Leave blank to keep current" className={inp + ' pr-10'}/>
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
            </Section>

            {/* Contact */}
            <Section title="Contact">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">WhatsApp Number</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  type="tel" placeholder="+201234567890" className={inp} dir="ltr"/>
                <p className="text-[11px] text-gray-400 mt-1">Used internally for team communication</p>
              </div>
            </Section>

            <button onClick={save} disabled={saving || !displayName.trim()}
              className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-colors">
              {saving ? 'Saving…' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}
