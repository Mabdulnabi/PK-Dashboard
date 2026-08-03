'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { MessageSquare, Check, X, AlertCircle, ChevronDown, ChevronUp, Paperclip, Download, Image as ImageIcon, FileText, User } from 'lucide-react'

type Attachment  = { id: string; file_path: string; file_name: string; file_type: string; uploaded_by: string }
type TMsg        = { id: string; sender_type: 'member' | 'admin'; message: string; sender_name?: string; sender_avatar?: string; created_at: string }
type MemberInfo  = { id: string; full_name: string; member_code: string; avatar_url?: string }
interface Ticket {
  id: string; member_id?: string; subject: string; message: string
  status: string; priority: string; category?: string
  reply?: string; replied_at?: string; created_at: string
  ticket_attachments?: Attachment[]
  ticket_messages?: TMsg[]
  member?: MemberInfo
}

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check size={15}/> : <AlertCircle size={15}/>}{msg}
    </div>
  )
}

function FileChip({ att }: { att: Attachment }) {
  const isImg = att.file_type?.startsWith('image/')
  const open = async () => {
    const res = await fetch(`/api/tickets/file?path=${encodeURIComponent(att.file_path)}`)
    const { url } = await res.json()
    if (url) window.open(url, '_blank')
  }
  return (
    <button onClick={open}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-[11px] text-gray-600 dark:text-gray-300 max-w-[180px]">
      {isImg ? <ImageIcon size={11} className="text-blue-400 flex-shrink-0"/> : <FileText size={11} className="text-gray-400 flex-shrink-0"/>}
      <span className="truncate">{att.file_name}</span>
      <Download size={9} className="text-gray-400 flex-shrink-0"/>
    </button>
  )
}

function MemberAvatar({ member, size = 28 }: { member?: MemberInfo; size?: number }) {
  const initials = member?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  if (member?.avatar_url) {
    return <img src={member.avatar_url} alt={member.full_name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }}/>
  }
  const colors = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#3b82f6']
  const color  = colors[(member?.full_name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}

const inp = "w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 transition-all"
const STATUS_COLORS: any = { open: '#EF4444', in_progress: '#F59E0B', resolved: '#10B981', closed: '#6B7280' }
const PRIORITY_COLORS: any = { low: '#6B7280', normal: '#3B82F6', high: '#F59E0B', urgent: '#EF4444' }
const CATEGORY_LABELS: Record<string, string> = { subscription: 'Subscription', payment: 'Payment', general: 'General' }

export default function SupportPage() {
  const router = useRouter()
  const [tickets,    setTickets]    = useState<Ticket[]>([])
  const [members,    setMembers]    = useState<Record<string, MemberInfo>>({})
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [replyText,  setReplyText]  = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [fStatus,    setFStatus]    = useState('all')
  const [adminProfile, setAdminProfile] = useState<{ id?: string; display_name: string; avatar_url?: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/auth/login')
    })
  }, [router])

  const load = useCallback(async (silent = false) => {
    const res = await fetch('/api/admin/tickets')
    if (res.status === 401) { window.location.href = '/auth/login'; return }
    const json = await res.json()
    const ticketData = json.tickets

    if (ticketData) {
      const memberMap: Record<string, MemberInfo> = {}
      for (const t of ticketData) {
        if (t.member) memberMap[t.member_id] = t.member
      }
      setMembers(memberMap)
      setTickets(ticketData)
    }
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/admin/profile').then(r => r.json()).then(setAdminProfile) }, [])

  // Poll every 8s when a ticket is expanded
  useEffect(() => {
    if (!expanded) return
    const id = setInterval(() => load(true), 8000)
    return () => clearInterval(id)
  }, [expanded, load])

  const sendReply = async (t: Ticket) => {
    if (!replyText.trim()) return
    setSaving(true)
    const res = await fetch(`/api/admin/tickets/${t.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyText, status: 'in_progress', admin_id: adminProfile?.id ?? null }),
    })
    if (!res.ok) { setSaving(false); setToast({ msg: 'Failed to send reply', type: 'err' }); return }

    for (const file of replyFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('ticket_id', t.id)
      await fetch('/api/admin/tickets/upload', { method: 'POST', body: fd })
    }

    setSaving(false)
    setToast({ msg: 'Reply sent', type: 'ok' })
    setReplyText('')
    setReplyFiles([])
    setExpanded(null)
    load()
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setToast({ msg: `Status: ${status}`, type: 'ok' })
    load()
  }

  const filtered = tickets.filter(t => fStatus === 'all' || t.status === fStatus)
  const counts   = { open: tickets.filter(t => t.status === 'open').length, in_progress: tickets.filter(t => t.status === 'in_progress').length }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Support" subtitle={`${counts.open} open · ${counts.in_progress} in progress`}/>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
              <button key={s} onClick={() => setFStatus(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${fStatus === s ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} tickets</span>
        </div>

        <div className="flex-1 overflow-auto p-5 flex flex-col gap-3">
          {loading && <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
              <MessageSquare size={28} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-sm text-gray-400">No tickets</p>
            </div>
          )}
          {filtered.map(t => {
            const member     = members[t.member_id || '']
            const memberAtts = (t.ticket_attachments || []).filter(a => a.uploaded_by === 'member')
            const adminAtts  = (t.ticket_attachments || []).filter(a => a.uploaded_by === 'admin')
            return (
              <div key={t.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                {/* Ticket header row */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => { setExpanded(expanded === t.id ? null : t.id); setReplyText(''); setReplyFiles([]) }}>

                  {/* Member avatar */}
                  <MemberAvatar member={member} size={32}/>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Member name + code */}
                      {member && (
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {member.member_code}
                        </span>
                      )}
                      {member && (
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 flex-shrink-0">{member.full_name}</span>
                      )}
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">· {t.subject}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: PRIORITY_COLORS[t.priority] + '20', color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
                      {t.category && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex-shrink-0">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400">{new Date(t.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLORS[t.status] + '20', color: STATUS_COLORS[t.status] }}>
                    {t.status.replace('_', ' ')}
                  </span>
                  {expanded === t.id ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0"/> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0"/>}
                </div>

                {/* Expanded panel */}
                {expanded === t.id && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 space-y-3">

                    {/* Conversation thread */}
                    {(() => {
                      const msgs: { sender: 'member' | 'admin'; text: string; time: string; id: string; name?: string; avatar?: string }[] = [
                        { sender: 'member', text: t.message, time: t.created_at, id: 'orig',
                          name: member?.full_name, avatar: member?.avatar_url },
                        ...((t.ticket_messages || [])
                          .slice()
                          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                          .map(m => ({
                            sender: m.sender_type, text: m.message, time: m.created_at, id: m.id,
                            name:   m.sender_type === 'member' ? member?.full_name : (m.sender_name || adminProfile?.display_name || 'Support Team'),
                            avatar: m.sender_type === 'member' ? member?.avatar_url : (adminProfile?.avatar_url || m.sender_avatar || undefined),
                          }))
                        ),
                      ]
                      return msgs.map(m => (
                        <div key={m.id} className={`flex gap-2 ${m.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                          {/* Avatar */}
                          {m.sender === 'member' ? (
                            <MemberAvatar member={member} size={24}/>
                          ) : (
                            m.avatar
                              ? <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0"/>
                              : <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                  {m.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'S'}
                                </div>
                          )}
                          <div className={`flex flex-col gap-0.5 max-w-[85%] ${m.sender === 'admin' ? 'items-end' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              {member?.member_code && m.sender === 'member' && (
                                <span className="text-[9px] font-bold text-indigo-500">{member.member_code}</span>
                              )}
                              <span className={`text-[10px] font-semibold ${m.sender === 'admin' ? 'text-emerald-500' : 'text-gray-500'}`}>
                                {m.name || (m.sender === 'admin' ? 'Support Team' : 'Member')}
                              </span>
                            </div>
                            <div className={`rounded-lg p-2.5 text-xs whitespace-pre-wrap ${
                              m.sender === 'admin'
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>{m.text}</div>
                            <span className="text-[9px] text-gray-300 dark:text-gray-600">
                              {new Date(m.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        </div>
                      ))
                    })()}

                    {/* Attachments */}
                    {memberAtts.length > 0 && <div className="flex flex-wrap gap-2">{memberAtts.map(a => <FileChip key={a.id} att={a}/>)}</div>}
                    {adminAtts.length > 0 && <div className="flex flex-wrap gap-2 justify-end">{adminAtts.map(a => <FileChip key={a.id} att={a}/>)}</div>}

                    {/* Status buttons */}
                    <div className="flex gap-2 pt-1">
                      {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                        <button key={s} onClick={() => updateStatus(t.id, s)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${t.status === s ? 'text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                          style={t.status === s ? { background: STATUS_COLORS[s] } : {}}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    {/* Reply box */}
                    <div className="space-y-2 pt-1">
                      {/* Admin identity preview */}
                      <div className="flex items-center gap-2 mb-1">
                        {adminProfile?.avatar_url
                          ? <img src={adminProfile.avatar_url} className="w-5 h-5 rounded-full object-cover" alt=""/>
                          : <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold">
                              {adminProfile?.display_name?.charAt(0) || 'S'}
                            </div>
                        }
                        <span className="text-[10px] font-semibold text-gray-400">
                          Replying as <span className="text-emerald-500">{adminProfile?.display_name || 'Support Team'}</span>
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                          placeholder="Type your reply..." className={inp + ' resize-none h-16 flex-1'}/>
                        <button onClick={() => sendReply(t)} disabled={saving}
                          className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold disabled:opacity-60 flex-shrink-0">
                          {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Send'}
                        </button>
                      </div>
                      <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt" className="hidden"
                        onChange={e => setReplyFiles(Array.from(e.target.files || []))}/>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Paperclip size={12}/>Attach files
                        {replyFiles.length > 0 && <span className="text-red-500 font-semibold">{replyFiles.length} file(s)</span>}
                      </button>
                      {replyFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {replyFiles.map((f, i) => (
                            <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-500">
                              {f.name}<button onClick={() => setReplyFiles(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={9}/></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}
