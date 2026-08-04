'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import {
  MessageSquare, Check, X, AlertCircle, Paperclip,
  Download, Image as ImageIcon, FileText, ChevronLeft, Send, Trash2, Wifi, WifiOff, Pencil,
} from 'lucide-react'

type Attachment  = { id: string; file_path: string; file_name: string; file_type: string; uploaded_by: string; created_at?: string }
type TMsg        = { id: string; sender_type: 'member' | 'admin'; message: string; sender_name?: string; sender_avatar?: string; created_at: string }
type MemberInfo  = { id: string; full_name: string; member_code: string; avatar_url?: string; last_seen_at?: string }
interface Ticket {
  id: string; member_id?: string; subject: string; message: string
  status: string; priority: string; category?: string
  reply?: string; replied_at?: string; created_at: string
  ticket_attachments?: Attachment[]
  ticket_messages?: TMsg[]
  member?: MemberInfo
}

const GOLD = '#d99401'
const STATUS_COLORS: Record<string, string> = { open: '#EF4444', in_progress: '#F59E0B', resolved: '#10B981', closed: '#6B7280' }
const PRIORITY_COLORS: Record<string, string> = { low: '#6B7280', normal: '#3B82F6', high: '#F59E0B', urgent: '#EF4444' }
const CATEGORY_LABELS: Record<string, string> = { subscription: 'Subscription', payment: 'Payment', general: 'General' }

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check size={15}/> : <AlertCircle size={15}/>}{msg}
    </div>
  )
}

function FileChip({ att, inline = false }: { att: Attachment; inline?: boolean }) {
  const isImg = att.file_type?.startsWith('image/')
  const [imgUrl, setImgUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isImg && inline) {
      fetch(`/api/tickets/file?path=${encodeURIComponent(att.file_path)}`)
        .then(r => r.json()).then(d => { if (d.url) setImgUrl(d.url) })
    }
  }, [att.file_path, isImg, inline])

  const open = async () => {
    const res = await fetch(`/api/tickets/file?path=${encodeURIComponent(att.file_path)}`)
    const { url } = await res.json()
    if (url) window.open(url, '_blank')
  }

  if (isImg && inline && imgUrl) {
    return (
      <button onClick={open} className="block mt-1 rounded-xl overflow-hidden max-w-[240px] hover:opacity-90 transition-opacity">
        <img src={imgUrl} alt={att.file_name} className="w-full h-auto max-h-48 object-cover"/>
      </button>
    )
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
  if (member?.avatar_url)
    return <img src={member.avatar_url} alt={member.full_name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }}/>
  const colors = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#3b82f6']
  const color  = colors[(member?.full_name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}

export default function TicketsPage() {
  const [tickets,      setTickets]      = useState<Ticket[]>([])
  const [members,      setMembers]      = useState<Record<string, MemberInfo>>({})
  const [loading,      setLoading]      = useState(true)
  const [activeId,     setActiveId]     = useState<string | null>(null)
  const [replyText,    setReplyText]    = useState('')
  const [replyFiles,   setReplyFiles]   = useState<File[]>([])
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [fStatus,      setFStatus]      = useState('all')
  const [adminProfile, setAdminProfile] = useState<{ id?: string; display_name: string; avatar_url?: string } | null>(null)
  const [editMsgId,    setEditMsgId]    = useState<string | null>(null)
  const [editMsgText,  setEditMsgText]  = useState('')
  const [page,         setPage]         = useState(1)
  const perPage = 30
  const fileRef    = useRef<HTMLInputElement>(null)
  const threadEnd  = useRef<HTMLDivElement>(null)

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

  // Poll every 15s; faster (8s) when a ticket is open
  useEffect(() => {
    const id = setInterval(() => load(true), activeId ? 8000 : 15000)
    return () => clearInterval(id)
  }, [load, activeId])

  // Scroll thread to bottom on open or new messages
  useEffect(() => {
    if (activeId) setTimeout(() => threadEnd.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [activeId, tickets])

  const activeTicket = tickets.find(t => t.id === activeId) || null

  const sendReply = async () => {
    if (!activeTicket) return
    if (!replyText.trim() && replyFiles.length === 0) return
    setSaving(true)
    const res = await fetch(`/api/admin/tickets/${activeTicket.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyText, status: 'in_progress', admin_id: adminProfile?.id ?? null }),
    })
    if (!res.ok) { setSaving(false); setToast({ msg: 'Failed to send reply', type: 'err' }); return }
    for (const file of replyFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('ticket_id', activeTicket.id)
      await fetch('/api/admin/tickets/upload', { method: 'POST', body: fd })
    }
    setSaving(false)
    setToast({ msg: 'Reply sent', type: 'ok' })
    setReplyText('')
    setReplyFiles([])
    load(true)
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/tickets', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setToast({ msg: `Status → ${status.replace('_', ' ')}`, type: 'ok' })
    load(true)
  }

  const deleteTicket = async (id: string) => {
    if (!confirm('Permanently delete this ticket and all its messages?')) return
    await fetch('/api/admin/tickets', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (activeId === id) setActiveId(null)
    setToast({ msg: 'Ticket deleted', type: 'ok' })
    load(true)
  }

  const startEditMsg = (id: string, text: string) => { setEditMsgId(id); setEditMsgText(text) }

  const saveEditMsg = async () => {
    if (!editMsgId || !editMsgText.trim()) return
    const res = await fetch(`/api/admin/tickets/messages/${editMsgId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: editMsgText }),
    })
    if (!res.ok) { setToast({ msg: 'Failed to edit message', type: 'err' }); return }
    setEditMsgId(null)
    setEditMsgText('')
    load(true)
  }

  const deleteMsg = async (id: string) => {
    if (!confirm('Delete this message?')) return
    const res = await fetch(`/api/admin/tickets/messages/${id}`, { method: 'DELETE' })
    if (!res.ok) { setToast({ msg: 'Failed to delete message', type: 'err' }); return }
    setToast({ msg: 'Message deleted', type: 'ok' })
    load(true)
  }

  const isOnline = (m?: MemberInfo) => {
    if (!m?.last_seen_at) return false
    return Date.now() - new Date(m.last_seen_at).getTime() < 5 * 60 * 1000
  }

  const filtered   = tickets.filter(t => fStatus === 'all' || t.status === fStatus)
  const counts     = {
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
    closed:      tickets.filter(t => t.status === 'closed').length,
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged      = filtered.slice((page - 1) * perPage, page * perPage)

  // Build thread for active ticket
  const activeMember = activeTicket ? members[activeTicket.member_id || ''] : undefined
  const thread = activeTicket ? [
    { sender: 'member' as const, text: activeTicket.message, time: activeTicket.created_at, id: 'orig',
      name: activeMember?.full_name, avatar: activeMember?.avatar_url },
    ...((activeTicket.ticket_messages || [])
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(m => ({
        sender: m.sender_type as 'member' | 'admin',
        text:   m.message,
        time:   m.created_at,
        id:     m.id,
        name:   m.sender_type === 'member'
          ? activeMember?.full_name
          : (m.sender_name || adminProfile?.display_name || 'Support Team'),
        avatar: m.sender_type === 'member'
          ? activeMember?.avatar_url
          : (m.sender_avatar || adminProfile?.avatar_url || undefined),
      }))
    ),
  ] : []

  // Build attachment "messages" sorted by created_at so they interleave with messages
  const attBubbles = (activeTicket?.ticket_attachments || []).map(a => ({
    id:     a.id,
    sender: a.uploaded_by as 'member' | 'admin',
    att:    a,
    time:   a.created_at || activeTicket!.created_at,
    name:   a.uploaded_by === 'admin'
      ? (adminProfile?.display_name || 'Support Team')
      : (activeMember?.full_name || 'Member'),
    avatar: a.uploaded_by === 'admin' ? adminProfile?.avatar_url : activeMember?.avatar_url,
  }))

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Tickets" subtitle={`${counts.open} open · ${counts.in_progress} in progress`}/>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: ticket list ── */}
          <div className={`flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] ${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-shrink-0`}>

            {/* Filter tabs */}
            <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
                {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                  <button key={s} onClick={() => { setFStatus(s); setPage(1) }}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all ${fStatus === s ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500'}`}>
                    {s === 'all' ? `All (${tickets.length})` : `${s.replace('_', ' ')} ${counts[s as keyof typeof counts] > 0 ? `(${counts[s as keyof typeof counts]})` : ''}`}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${GOLD} transparent transparent transparent` }}/>
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <MessageSquare size={28} className="opacity-30 mb-2"/>
                  <p className="text-sm">No tickets</p>
                </div>
              )}

              {paged.map(t => {
                const m = members[t.member_id || '']
                const isActive = activeId === t.id
                const msgCount = (t.ticket_messages || []).length
                const online   = isOnline(m)
                return (
                  <div key={t.id}
                    className="flex items-center gap-3 px-3 py-3 border-b border-gray-50 dark:border-gray-800/60 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                    style={isActive ? { background: `${GOLD}12`, borderInlineEndWidth: 2, borderInlineEndColor: GOLD } : {}}
                    onClick={() => { setActiveId(t.id); setReplyText(''); setReplyFiles([]) }}>
                    <div className="relative flex-shrink-0">
                      <MemberAvatar member={m} size={36}/>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${online ? 'bg-emerald-400' : 'bg-gray-300'}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{t.subject}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {m && <span className="text-[10px] text-gray-500 truncate">{m.full_name}</span>}
                        {m && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex-shrink-0">{m.member_code}</span>}
                        {online && <span className="text-[9px] text-emerald-500 font-bold flex-shrink-0">● online</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: STATUS_COLORS[t.status]+'20', color: STATUS_COLORS[t.status] }}>
                          {t.status.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: PRIORITY_COLORS[t.priority]+'20', color: PRIORITY_COLORS[t.priority] }}>
                          {t.priority}
                        </span>
                        {msgCount > 0 && <span className="text-[9px] text-gray-400 ml-auto">{msgCount} msg{msgCount !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="text-[9px] text-gray-400">
                        {new Date(t.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteTicket(t.id) }}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {filtered.length > perPage && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">←</button>
                  <span>{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">→</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: conversation panel ── */}
          {activeId && activeTicket ? (
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

              {/* Conversation header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] flex-shrink-0">
                <button onClick={() => setActiveId(null)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                  <ChevronLeft size={18}/>
                </button>
                <div className="relative flex-shrink-0">
                  <MemberAvatar member={activeMember} size={36}/>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#111827] ${isOnline(activeMember) ? 'bg-emerald-400' : 'bg-gray-300'}`}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{activeTicket.subject}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {activeMember && <span>{activeMember.full_name}</span>}
                    {activeMember && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">{activeMember.member_code}</span>}
                    {isOnline(activeMember)
                      ? <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5"><Wifi size={10}/>Online</span>
                      : activeMember?.last_seen_at
                        ? <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><WifiOff size={10}/>Last seen {new Date(activeMember.last_seen_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                        : null
                    }
                    {activeTicket.category && <span className="text-gray-400">{CATEGORY_LABELS[activeTicket.category] || activeTicket.category}</span>}
                  </div>
                </div>

                {/* Delete + Status switcher */}
                <div className="flex items-center gap-1">
                <button onClick={() => deleteTicket(activeTicket.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0" title="Delete ticket">
                  <Trash2 size={15}/>
                </button>
                </div>
                {/* Status switcher */}
                <div className="flex gap-1">
                  {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                    <button key={s} onClick={() => updateStatus(activeTicket.id, s)}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
                      style={activeTicket.status === s
                        ? { background: STATUS_COLORS[s], color: '#fff' }
                        : { background: '#f3f4f6', color: '#6b7280' }}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thread — scrollable, fills remaining space */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#f0f2f5' }}>
                {/* Text messages */}
                {thread.map(m => (
                  <div key={m.id} className={`flex gap-2 group/msg ${m.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                    {m.sender === 'member' ? (
                      <MemberAvatar member={activeMember} size={28}/>
                    ) : (
                      m.avatar
                        ? <img src={m.avatar} alt={m.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0"/>
                        : <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {m.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                    )}
                    <div className={`flex flex-col gap-0.5 max-w-[75%] ${m.sender === 'admin' ? 'items-end' : ''}`}>
                      <span className={`text-[10px] font-semibold ${m.sender === 'admin' ? 'text-emerald-500' : 'text-gray-500'}`}>
                        {m.name || (m.sender === 'admin' ? 'Support Team' : 'Member')}
                        {m.sender === 'member' && activeMember?.member_code && (
                          <span className="ml-1 text-indigo-400 font-bold">{activeMember.member_code}</span>
                        )}
                      </span>

                      {/* Bubble + action toolbar */}
                      <div className={`flex items-end gap-1 ${m.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                        {editMsgId === m.id ? (
                          <div className="flex flex-col gap-1 min-w-[200px]">
                            <textarea value={editMsgText} onChange={e => setEditMsgText(e.target.value)}
                              autoFocus rows={3}
                              className="resize-none px-3 py-2 text-sm rounded-xl border border-emerald-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none"
                              style={{ minWidth: 200 }}/>
                            <div className="flex gap-1">
                              <button onClick={saveEditMsg}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-semibold">
                                <Check size={10}/> Save
                              </button>
                              <button onClick={() => setEditMsgId(null)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-semibold">
                                <X size={10}/> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                            m.sender === 'admin'
                              ? 'bg-emerald-500 text-white rounded-br-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-bl-sm'
                          }`}>
                            {m.text}
                          </div>
                        )}

                        {/* Hover actions — only for non-original messages */}
                        {m.id !== 'orig' && editMsgId !== m.id && (
                          <div className={`flex gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity ${m.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                            <button onClick={() => startEditMsg(m.id, m.text)}
                              className="w-5 h-5 rounded-md flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors shadow-sm">
                              <Pencil size={10}/>
                            </button>
                            <button onClick={() => deleteMsg(m.id)}
                              className="w-5 h-5 rounded-md flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors shadow-sm">
                              <Trash2 size={10}/>
                            </button>
                          </div>
                        )}
                      </div>

                      <span className="text-[9px] text-gray-400">
                        {new Date(m.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Attachments as inline bubbles */}
                {attBubbles.map(b => (
                  <div key={b.id} className={`flex gap-2 ${b.sender === 'admin' ? 'flex-row-reverse' : ''}`}>
                    {b.sender === 'member' ? (
                      <MemberAvatar member={activeMember} size={28}/>
                    ) : (
                      b.avatar
                        ? <img src={b.avatar} alt={b.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0"/>
                        : <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {b.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                    )}
                    <div className={`flex flex-col gap-0.5 max-w-[75%] ${b.sender === 'admin' ? 'items-end' : ''}`}>
                      <span className={`text-[10px] font-semibold ${b.sender === 'admin' ? 'text-emerald-500' : 'text-gray-500'}`}>
                        {b.name}
                      </span>
                      <FileChip att={b.att} inline/>
                      <span className="text-[9px] text-gray-400">
                        {new Date(b.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  </div>
                ))}

                <div ref={threadEnd}/>
              </div>

              {/* Reply box — always visible at bottom */}
              <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] px-4 py-3 space-y-2">
                {/* Admin identity */}
                <div className="flex items-center gap-2">
                  {adminProfile?.avatar_url
                    ? <img src={adminProfile.avatar_url} className="w-5 h-5 rounded-full object-cover" alt=""/>
                    : <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold">
                        {adminProfile?.display_name?.charAt(0) || 'S'}
                      </div>
                  }
                  <span className="text-[10px] text-gray-400">
                    Replying as <span className="font-semibold text-emerald-500">{adminProfile?.display_name || 'Support Team'}</span>
                  </span>
                </div>

                {/* Textarea + send */}
                <div className="flex gap-2 items-end">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                    placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                    rows={3}
                    className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 outline-none focus:border-emerald-400 transition-colors"
                    style={{ minHeight: '72px', maxHeight: '140px' }}/>
                  <button onClick={sendReply} disabled={saving || (!replyText.trim() && replyFiles.length === 0)}
                    className="p-3 rounded-xl text-white disabled:opacity-40 transition-colors flex-shrink-0"
                    style={{ background: '#10b981' }}>
                    {saving
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      : <Send size={16}/>}
                  </button>
                </div>

                {/* Attach */}
                <div className="flex items-center gap-3">
                  <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt" className="hidden"
                    onChange={e => setReplyFiles(Array.from(e.target.files || []))}/>
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <Paperclip size={12}/> Attach
                    {replyFiles.length > 0 && <span className="text-emerald-500 font-semibold">{replyFiles.length} file(s)</span>}
                  </button>
                  {replyFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {replyFiles.map((f, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-500">
                          {f.name}
                          <button onClick={() => setReplyFiles(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                            <X size={9}/>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20"/>
                <p className="text-sm font-medium">Select a ticket to view the conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
    </div>
  )
}
