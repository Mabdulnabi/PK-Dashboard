'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  MessageSquare, Search, Send, Paperclip, X, ChevronLeft,
  StickyNote, Zap, Trash2, Edit3, Check, CheckCheck,
  File, UserCheck, Tag, Plus,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ar } from 'date-fns/locale'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const GOLD = '#d99401'

type Conversation = {
  id: string; member_id: string; status: string
  last_message: string | null; last_message_at: string | null
  unread_admin: number; updated_at: string
  member: { full_name: string; member_code: string; avatar_url: string | null; email: string } | null
}
type Attachment = { id?: string; url: string; name: string; mime_type: string; size_bytes: number; kind: 'image' | 'file' }
type Message = {
  id: string; conversation_id: string
  sender_type: 'member' | 'admin'; sender_id: string
  sender_name: string | null; sender_avatar: string | null
  content: string | null; status: string
  edited_at: string | null; deleted_at: string | null; created_at: string
  live_chat_attachments: Attachment[]
}
type Note = { id: string; admin_name: string | null; content: string; created_at: string }
type QuickReply = { id: string; title: string; content: string }

const fmtTime = (d: string) => format(new Date(d), 'HH:mm')
const fmtDist = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })
const fmtSize = (b: number) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`

function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    ;([
      [880, now,      now + 0.12],
      [1100, now + 0.1, now + 0.35],
    ] as [number, number, number][]).forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, end)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(start); osc.stop(end)
    })
  } catch {}
}

function Avatar({ url, name, size = 9 }: { url?: string|null; name?: string; size?: number }) {
  const cls = `rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-xs overflow-hidden`
  const st  = { width: `${size*4}px`, height: `${size*4}px` }
  if (url) return <img src={url} className={`${cls} object-cover`} style={st} alt={name}/>
  const bg = ['#6366f1','#8b5cf6','#ec4899','#f97316','#22c55e','#14b8a6', GOLD]
  const i  = (name?.charCodeAt(0) || 0) % bg.length
  return <div className={cls} style={{ ...st, background: bg[i] }}>{name?.[0]?.toUpperCase()}</div>
}

function StatusTick({ status }: { status: string }) {
  if (status === 'read')      return <CheckCheck size={12} style={{ color: '#60a5fa' }}/>
  if (status === 'delivered') return <CheckCheck size={12} className="text-gray-400"/>
  return <Check size={12} className="text-gray-400"/>
}

function AttachmentPreview({ a }: { a: Attachment }) {
  if (a.kind === 'image') return (
    <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
      <img src={a.url} alt={a.name} className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-black/10"/>
    </a>
  )
  return (
    <a href={a.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2 text-xs hover:bg-black/20 transition-colors">
      <File size={14}/><span className="truncate max-w-[140px]">{a.name}</span>
      <span className="text-[10px] opacity-60 flex-shrink-0">{fmtSize(a.size_bytes)}</span>
    </a>
  )
}

export default function LiveChatPage() {
  const [convs, setConvs]           = useState<Conversation[]>([])
  const [activeId, setActiveId]     = useState<string | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [notes, setNotes]           = useState<Note[]>([])
  const [quickReplies, setQR]       = useState<QuickReply[]>([])
  const [input, setInput]           = useState('')
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'all'|'unread'>('all')
  const [loading, setLoading]       = useState(true)
  const [sending, setSending]       = useState(false)
  const [panel, setPanel]           = useState<'none'|'notes'|'qr'|'labels'>('none')
  const [noteInput, setNoteInput]   = useState('')
  const [editNote, setEditNote]     = useState<Note|null>(null)
  const [qrInput, setQrInput]       = useState({ title:'', content:'' })
  const [editQr, setEditQr]         = useState<QuickReply|null>(null)
  const [showQrPicker, setQrPicker] = useState(false)
  const [editMsg, setEditMsg]       = useState<Message|null>(null)
  const [pendingFiles, setPending]  = useState<Attachment[]>([])
  const [uploading, setUploading]   = useState(false)
  const [onlineMembers, setOnline]  = useState<Set<string>>(new Set())
  const [typingConvs, setTyping]    = useState<Set<string>>(new Set())
  const [toast, setToast]           = useState<string | null>(null)
  const [adminProfile, setAdminProfile] = useState<{ id?: string; display_name?: string; avatar_url?: string } | null>(null)
  const [allLabels,   setAllLabels]   = useState<{ id: string; name: string; color: string }[]>([])
  const [convLabels,  setConvLabels]  = useState<Record<string, { id: string; name: string; color: string }[]>>({})
  const [labelForm,   setLabelForm]   = useState({ name: '', color: '#6366f1' })
  const [editLabel,   setEditLabel]   = useState<{ id: string; name: string; color: string } | null>(null)
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)
  const toastTimer      = useRef<any>(null)
  const activeIdRef     = useRef(activeId)
  activeIdRef.current   = activeId

  const activeConv = convs.find(c => c.id === activeId) || null

  const showToast = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  // ── Admin profile + labels ─────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/profile').then(r => r.json()).then(d => { if (!d.error) setAdminProfile(d) })
    fetch('/api/admin/live-chat/labels').then(r => r.json()).then(d => setAllLabels(d.labels || []))
  }, [])

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConvs = useCallback(async () => {
    const res   = await fetch(`/api/admin/live-chat?filter=${filter}&search=${encodeURIComponent(search)}`)
    const d     = await res.json()
    const list: Conversation[] = d.conversations || []
    const curId = activeIdRef.current
    // Always zero out unread for the currently-open conversation
    setConvs(curId ? list.map(c => c.id === curId ? { ...c, unread_admin: 0 } : c) : list)
    setLoading(false)
  }, [filter, search])

  useEffect(() => { loadConvs() }, [loadConvs])

  // ── Load quick replies ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/live-chat/quick-replies').then(r=>r.json()).then(d=>setQR(d.replies||[]))
  }, [])

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('admin-live-chat')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_chat_messages',
      }, async payload => {
        const msg = payload.new as Message
        if (!msg) return
        const isActive = msg.conversation_id === activeIdRef.current
        if (isActive) {
          // Re-fetch full messages with attachments; GET route also resets unread_admin in DB
          const r = await fetch(`/api/admin/live-chat/${msg.conversation_id}`)
          const d = await r.json()
          if (d.messages) setMessages(d.messages)
        }
        await loadConvs() // zero out active conv unread via loadConvs logic above
        // Only toast/sound for member messages on OTHER conversations
        if (msg.sender_type === 'member' && !isActive) {
          playSound()
          const convName = convs.find(c => c.id === msg.conversation_id)?.member?.full_name || 'Member'
          showToast(`${convName}: ${msg.content || '📎 Attachment'}`)
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        setTyping(prev => {
          const next = new Set(prev)
          if (payload.typing) next.add(payload.conv_id)
          else next.delete(payload.conv_id)
          return next
        })
        setTimeout(() => {
          setTyping(prev => { const n = new Set(prev); n.delete(payload.conv_id); return n })
        }, 3000)
      })
      .subscribe()

    // Presence: members track with { member_id, conv_id }
    // We key online status by conv_id for consistent lookup
    const presence = supabase.channel('member-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState()
        const online = new Set(
          Object.values(state).flat().map((p: any) => p.conv_id as string)
        )
        setOnline(online)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
      supabase.removeChannel(presence)
    }
  }, [activeId, loadConvs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling fallback for active conversation ───────────────────────────────
  useEffect(() => {
    if (!activeId) return
    const interval = setInterval(async () => {
      const r = await fetch(`/api/admin/live-chat/${activeId}`)
      const d = await r.json()
      if (d.messages) setMessages(d.messages)
    }, 5_000)
    return () => clearInterval(interval)
  }, [activeId])

  // ── Open conversation ───────────────────────────────────────────────────────
  const openConv = async (id: string) => {
    setActiveId(id)
    setPanel('none')
    const res = await fetch(`/api/admin/live-chat/${id}`)
    const d   = await res.json()
    setMessages(d.messages || [])
    setNotes(d.notes || [])
    if (d.labels) setConvLabels(prev => ({ ...prev, [id]: d.labels }))
    setConvs(prev => prev.map(c => c.id === id ? { ...c, unread_admin: 0 } : c))
  }

  const toggleLabel = async (labelId: string) => {
    if (!activeId) return
    await fetch('/api/admin/live-chat/labels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: activeId, label_id: labelId }),
    })
    const cur = convLabels[activeId] || []
    const has = cur.some(l => l.id === labelId)
    const label = allLabels.find(l => l.id === labelId)
    if (!label) return
    setConvLabels(prev => ({
      ...prev,
      [activeId]: has ? cur.filter(l => l.id !== labelId) : [...cur, label],
    }))
  }

  const saveLabel = async () => {
    if (!labelForm.name.trim()) return
    const body = editLabel
      ? { id: editLabel.id, name: labelForm.name, color: labelForm.color }
      : { name: labelForm.name, color: labelForm.color }
    const res = await fetch('/api/admin/live-chat/labels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (editLabel) {
      setAllLabels(prev => prev.map(l => l.id === editLabel.id ? d.label : l))
    } else if (d.label) {
      setAllLabels(prev => [...prev, d.label])
    }
    setLabelForm({ name: '', color: '#6366f1' })
    setEditLabel(null)
  }

  const deleteLabel = async (id: string) => {
    await fetch('/api/admin/live-chat/labels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, deleted: true }),
    })
    setAllLabels(prev => prev.filter(l => l.id !== id))
  }

  const markMessageRead = async (msgId: string) => {
    if (!activeId) return
    await fetch(`/api/admin/live-chat/${activeId}/messages`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: msgId, mark_read: true }),
    })
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: 'read' } : m))
  }

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [messages])

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px'
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!activeId || (!input.trim() && !pendingFiles.length) || sending) return
    setSending(true)

    if (editMsg) {
      await fetch(`/api/admin/live-chat/${activeId}/messages`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message_id: editMsg.id, content: input.trim() }),
      })
      setMessages(prev => prev.map(m => m.id === editMsg.id ? { ...m, content: input.trim(), edited_at: new Date().toISOString() } : m))
      setEditMsg(null); setInput(''); setSending(false)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      return
    }

    const res = await fetch(`/api/admin/live-chat/${activeId}/messages`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ content: input.trim() || null, attachments: pendingFiles }),
    })
    const d = await res.json()
    if (d.message) {
      playSound()
      setMessages(prev => {
        const exists = prev.find(m => m.id === d.message.id)
        return exists ? prev : [...prev, d.message]
      })
      loadConvs()
    }
    setInput(''); setPending([]); setSending(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // broadcast admin-typing false
    const ch = supabase.channel(`chat-widget-${activeId}`)
    ch.send({ type: 'broadcast', event: 'admin-typing', payload: { conv_id: activeId, typing: false } })
  }

  // ── Typing broadcast ────────────────────────────────────────────────────────
  const typingTimer = useRef<any>(null)
  const broadcastTyping = () => {
    if (!activeId) return
    const ch = supabase.channel(`chat-widget-${activeId}`)
    ch.send({ type: 'broadcast', event: 'admin-typing', payload: { conv_id: activeId, typing: true } })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      ch.send({ type: 'broadcast', event: 'admin-typing', payload: { conv_id: activeId, typing: false } })
    }, 2500)
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    setUploading(true)
    const form = new FormData(); form.append('file', file)
    const res  = await fetch('/api/admin/live-chat/upload', { method:'POST', body: form })
    const data = await res.json()
    if (data.url) setPending(prev => [...prev, data])
    setUploading(false)
  }

  // ── Delete message ──────────────────────────────────────────────────────────
  const deleteMessage = async (msg: Message) => {
    await fetch(`/api/admin/live-chat/${activeId}/messages`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message_id: msg.id, deleted: true }),
    })
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted_at: new Date().toISOString() } : m))
    // Reset unread badge — deleting while viewing means admin has seen everything
    if (activeId) {
      setConvs(prev => prev.map(c => c.id === activeId ? { ...c, unread_admin: 0 } : c))
      fetch(`/api/admin/live-chat/${activeId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unread_admin: 0 }),
      })
    }
  }

  // ── Notes ───────────────────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!noteInput.trim() || !activeId) return
    const res = await fetch(`/api/admin/live-chat/${activeId}/notes`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(editNote ? { note_id: editNote.id, content: noteInput } : { content: noteInput }),
    })
    const d = await res.json()
    if (editNote) setNotes(prev => prev.map(n => n.id === editNote.id ? { ...n, content: noteInput } : n))
    else if (d.note) setNotes(prev => [d.note, ...prev])
    setNoteInput(''); setEditNote(null)
  }

  const deleteNote = async (n: Note) => {
    if (!activeId) return
    await fetch(`/api/admin/live-chat/${activeId}/notes`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ note_id: n.id, deleted: true }),
    })
    setNotes(prev => prev.filter(x => x.id !== n.id))
  }

  // ── Quick Replies ───────────────────────────────────────────────────────────
  const saveQR = async () => {
    const res = await fetch('/api/admin/live-chat/quick-replies', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(editQr ? { id: editQr.id, ...qrInput } : qrInput),
    })
    const d = await res.json()
    if (editQr) setQR(prev => prev.map(q => q.id === editQr.id ? { ...q, ...qrInput } : q))
    else if (d.reply) setQR(prev => [...prev, d.reply])
    setQrInput({ title:'', content:'' }); setEditQr(null)
  }

  const deleteQR = async (q: QuickReply) => {
    await fetch('/api/admin/live-chat/quick-replies', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: q.id, deleted: true }),
    })
    setQR(prev => prev.filter(x => x.id !== q.id))
  }

  // ── Delete conversation ─────────────────────────────────────────────────────
  const deleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    await fetch(`/api/admin/live-chat/${id}`, { method:'DELETE' })
    setConvs(prev => prev.filter(c => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  // ── Take conversation ───────────────────────────────────────────────────────
  const takeConv = async () => {
    if (!activeId) return
    await fetch(`/api/admin/live-chat/${activeId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_admin_id: adminProfile?.id || null }),
    })
    showToast('Conversation assigned to you')
  }

  const inp = `w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none text-gray-800 dark:text-gray-200`

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0D1117] relative">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl text-white text-sm font-medium max-w-sm"
          style={{ background: GOLD, boxShadow: `0 8px 32px ${GOLD}55` }}>
          <span className="truncate flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100 flex-shrink-0"><X size={13}/></button>
        </div>
      )}

      {/* ── Conversations sidebar ─────────────────────────────────────────── */}
      <div className={`flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827]
        ${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-shrink-0`}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare size={18} style={{ color: GOLD }}/> Live Chat
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
              style={{ background: GOLD }}>
              {convs.filter(c=>c.unread_admin>0).length} unread
            </span>
          </div>
          <div className="relative mb-3">
            <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              className={`${inp} ps-8 py-2`}/>
          </div>
          <div className="flex gap-1.5">
            {(['all','unread'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors`}
                style={filter===f ? { background: GOLD, color: '#fff' } : { background: '#f3f4f6', color: '#6b7280' }}>
                {f === 'all' ? 'All' : 'Unread'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && Array.from({length:5}).map((_,i)=>(
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse"/>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4"/>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2"/>
              </div>
            </div>
          ))}

          {!loading && convs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageSquare size={32} className="mb-3 opacity-30"/>
              <p className="text-sm">No conversations yet</p>
            </div>
          )}

          {convs.map(c => {
            // Track online by conv_id (widget tracks with conv_id)
            const isOnline = onlineMembers.has(c.id)
            const isTyping = typingConvs.has(c.id)
            return (
              <div key={c.id} onClick={()=>openConv(c.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors relative group`}
                style={activeId===c.id ? { background: `${GOLD}12`, borderInlineEndWidth: 2, borderInlineEndColor: GOLD } : {}}>
                <div className="relative flex-shrink-0">
                  <Avatar url={c.member?.avatar_url} name={c.member?.full_name} size={10}/>
                  <span className={`absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${isOnline?'bg-green-500':'bg-gray-300 dark:bg-gray-600'}`}/>
                </div>
                <div className="flex-1 min-w-0 pe-6">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm truncate ${c.unread_admin>0?'font-bold text-gray-900 dark:text-gray-100':'font-medium text-gray-700 dark:text-gray-300'}`}>
                      {c.member?.full_name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {c.last_message_at ? fmtDist(c.last_message_at) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {isTyping ? <span className="font-medium" style={{ color: GOLD }}>typing…</span>
                        : c.last_message || <span className="italic opacity-60">No messages</span>}
                    </span>
                    {c.unread_admin > 0 && (
                      <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: GOLD }}>
                        {c.unread_admin > 9 ? '9+' : c.unread_admin}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{c.member?.member_code}</div>
                  {(convLabels[c.id] || []).length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(convLabels[c.id] || []).map(l => (
                        <span key={l.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: l.color + '22', color: l.color }}>
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Delete button — absolutely positioned, won't overlap content */}
                <button onClick={e=>deleteConv(c.id,e)}
                  className="absolute end-2 top-2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                  <Trash2 size={12}/>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Chat window ───────────────────────────────────────────────────── */}
      {activeId && activeConv ? (
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] flex-shrink-0">
              <button onClick={()=>setActiveId(null)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <ChevronLeft size={18}/>
              </button>
              <div className="relative">
                <Avatar url={activeConv.member?.avatar_url} name={activeConv.member?.full_name} size={10}/>
                <span className={`absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${onlineMembers.has(activeConv.id)?'bg-green-500':'bg-gray-300'}`}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{activeConv.member?.full_name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{activeConv.member?.member_code}</span>
                  <span>•</span>
                  <span className={onlineMembers.has(activeConv.id) ? 'text-green-500' : 'text-gray-400'}>
                    {onlineMembers.has(activeConv.id) ? '● Online' : '○ Offline'}
                  </span>
                  {typingConvs.has(activeId) && <span className="font-medium animate-pulse" style={{ color: GOLD }}>typing…</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={takeConv} title="Take conversation"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors hover:text-green-500">
                  <UserCheck size={16}/>
                </button>
                <button onClick={()=>setPanel(p=>p==='notes'?'none':'notes')}
                  className={`p-2 rounded-lg transition-colors ${panel==='notes'?'bg-amber-100 dark:bg-amber-900/30 text-amber-600':'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-amber-500'}`}>
                  <StickyNote size={16}/>
                </button>
                <button onClick={()=>setPanel(p=>p==='labels'?'none':'labels')}
                  className={`p-2 rounded-lg transition-colors`}
                  style={panel==='labels' ? { background: '#6366f120', color: '#6366f1' } : { color: '#6b7280' }}>
                  <Tag size={16}/>
                </button>
                <button onClick={()=>setPanel(p=>p==='qr'?'none':'qr')}
                  className={`p-2 rounded-lg transition-colors`}
                  style={panel==='qr' ? { background: `${GOLD}20`, color: GOLD } : {}}>
                  <Zap size={16}/>
                </button>
                <button onClick={()=>{ if(confirm('Close conversation?')) fetch(`/api/admin/live-chat/${activeId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'closed'})}).then(()=>{setConvs(prev=>prev.map(c=>c.id===activeId?{...c,status:'closed'}:c))}) }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors" title="Close conversation">
                  <X size={16}/>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{background:'#f0f2f5'}}
              onClick={()=>setQrPicker(false)}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                  <MessageSquare size={32} className="mb-3 opacity-30"/>
                  <p className="text-sm">No messages yet</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isAdmin   = msg.sender_type === 'admin'
                const isDeleted = !!msg.deleted_at
                const prevMsg   = messages[i - 1]
                const showDate  = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="text-[11px] bg-white dark:bg-gray-700 text-gray-500 px-3 py-1 rounded-full shadow-sm">
                          {format(new Date(msg.created_at), 'EEEE, MMM d')}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-end gap-2 ${isAdmin ? 'flex-row-reverse' : 'flex-row'} group`}>
                      {!isAdmin && <Avatar url={msg.sender_avatar} name={msg.sender_name||''} size={7}/>}
                      <div className={`max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        <div className={`rounded-2xl px-3 py-2 shadow-sm text-sm
                          ${isAdmin ? 'text-white rounded-br-sm' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'}
                          ${isDeleted ? 'opacity-50 italic' : ''}`}
                          style={isAdmin ? { background: GOLD } : {}}>
                          {isDeleted ? (
                            <span className="text-xs">🚫 Message deleted</span>
                          ) : (
                            <>
                              {msg.live_chat_attachments?.map((a, ai)=>(
                                <div key={ai} className="mb-2"><AttachmentPreview a={a}/></div>
                              ))}
                              {msg.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
                              {msg.edited_at && <span className="text-[10px] opacity-60 ms-1">(edited)</span>}
                            </>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] text-gray-400 ${isAdmin?'flex-row-reverse':''}`}>
                          <span>{fmtTime(msg.created_at)}</span>
                          {isAdmin && <StatusTick status={msg.status}/>}
                        </div>
                      </div>
                      {/* Actions */}
                      {!isDeleted && (
                        <div className={`opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity ${isAdmin?'flex-row-reverse':''}`}>
                          {isAdmin && msg.content && (
                            <button onClick={()=>{ setEditMsg(msg); setInput(msg.content||''); setTimeout(()=>{ if(textareaRef.current){ textareaRef.current.style.height='auto'; textareaRef.current.style.height=Math.min(textareaRef.current.scrollHeight,128)+'px' }},0) }}
                              className="p-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-500 hover:text-amber-500 shadow-sm">
                              <Edit3 size={11}/>
                            </button>
                          )}
                          {!isAdmin && msg.status !== 'read' && (
                            <button onClick={()=>markMessageRead(msg.id)} title="Mark as read"
                              className="p-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-500 hover:text-blue-500 shadow-sm">
                              <CheckCheck size={11}/>
                            </button>
                          )}
                          <button onClick={()=>deleteMessage(msg)}
                            className="p-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-500 hover:text-red-500 shadow-sm">
                            <Trash2 size={11}/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef}/>
            </div>

            {/* Pending attachments */}
            {pendingFiles.length > 0 && (
              <div className="flex gap-2 px-4 py-2 bg-white dark:bg-[#111827] border-t border-gray-100 dark:border-gray-800 overflow-x-auto flex-shrink-0">
                {pendingFiles.map((f,i)=>(
                  <div key={i} className="relative flex-shrink-0">
                    {f.kind==='image'
                      ? <img src={f.url} className="w-16 h-16 rounded-lg object-cover border border-gray-200"/>
                      : <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-[10px] text-gray-500 gap-1"><File size={16}/><span className="truncate w-12 text-center">{f.name}</span></div>
                    }
                    <button onClick={()=>setPending(prev=>prev.filter((_,j)=>j!==i))}
                      className="absolute -top-1.5 -end-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X size={9}/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Edit banner */}
            {editMsg && (
              <div className="flex items-center gap-2 px-4 py-2 border-t text-xs flex-shrink-0"
                style={{ background: `${GOLD}12`, borderColor: `${GOLD}40`, color: GOLD }}>
                <Edit3 size={12}/> Editing message
                <button onClick={()=>{ setEditMsg(null); setInput(''); if(textareaRef.current) textareaRef.current.style.height='auto' }} className="ms-auto p-1 rounded"><X size={12}/></button>
              </div>
            )}

            {/* Quick reply picker */}
            {showQrPicker && quickReplies.length > 0 && (
              <div className="absolute bottom-20 start-1/2 -translate-x-1/2 w-80 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20">
                {quickReplies.map(q=>(
                  <button key={q.id} onClick={()=>{ setInput(q.content); setQrPicker(false) }}
                    className="w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="text-xs font-bold" style={{ color: GOLD }}>{q.title}</div>
                    <div className="text-xs text-gray-500 truncate">{q.content}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <div className="px-3 py-2.5 bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" className="hidden" multiple
                  onChange={async e => { for (const f of Array.from(e.target.files||[])) await uploadFile(f); e.target.value='' }}/>
                <button onClick={()=>fileInputRef.current?.click()}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors flex-shrink-0">
                  <Paperclip size={18}/>
                </button>
                <button onClick={()=>setQrPicker(v=>!v)}
                  className="p-2 rounded-xl transition-colors flex-shrink-0"
                  style={showQrPicker ? { background: `${GOLD}20`, color: GOLD } : { color: '#6b7280' }}>
                  <Zap size={18}/>
                </button>
                <textarea ref={textareaRef} value={input}
                  onChange={handleInput}
                  onInput={broadcastTyping}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage() } }}
                  placeholder="Type a message…" rows={1}
                  className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none text-gray-800 dark:text-gray-200 leading-5"
                  style={{ minHeight: '40px', maxHeight: '128px', transition: 'height 0.1s' }}/>
                <button onClick={sendMessage} disabled={sending||uploading||(!input.trim()&&!pendingFiles.length)}
                  className="p-2.5 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  style={{ background: GOLD }}>
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : <Send size={16}/>}
                </button>
              </div>
            </div>
          </div>

          {/* ── Side panel ──────────────────────────────────────────────── */}
          {panel !== 'none' && (
            <div className="w-72 flex-shrink-0 border-s border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] flex flex-col overflow-hidden">

              {panel === 'notes' && (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <StickyNote size={14} className="text-amber-500"/> Internal Notes
                    </h3>
                    <button onClick={()=>setPanel('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X size={14}/></button>
                  </div>
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                    <textarea value={noteInput} onChange={e=>setNoteInput(e.target.value)} rows={3}
                      placeholder={editNote ? 'Edit note…' : 'Add a private note…'}
                      className={`${inp} resize-none`}/>
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveNote}
                        className="flex-1 py-1.5 text-xs font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
                        style={{ background: '#f59e0b' }}>
                        {editNote ? 'Update' : 'Add Note'}
                      </button>
                      {editNote && <button onClick={()=>{ setEditNote(null); setNoteInput('') }} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500">Cancel</button>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {notes.length === 0 && <p className="text-xs text-center text-gray-400 py-6">No notes yet</p>}
                    {notes.map(n=>(
                      <div key={n.id} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{n.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-gray-400">{n.admin_name} · {fmtDist(n.created_at)}</span>
                          <div className="flex gap-1">
                            <button onClick={()=>{ setEditNote(n); setNoteInput(n.content) }} className="p-1 text-gray-400 hover:text-amber-600 rounded"><Edit3 size={10}/></button>
                            <button onClick={()=>deleteNote(n)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={10}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {panel === 'labels' && (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Tag size={14} style={{ color: '#6366f1' }}/> Labels
                    </h3>
                    <button onClick={()=>setPanel('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X size={14}/></button>
                  </div>
                  {/* Assigned labels for this conversation */}
                  {activeId && (convLabels[activeId]||[]).length > 0 && (
                    <div className="px-3 pt-3 pb-1 flex gap-1.5 flex-wrap">
                      {(convLabels[activeId]||[]).map(l=>(
                        <span key={l.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: l.color+'22', color: l.color }}>
                          {l.name}
                          <button onClick={()=>toggleLabel(l.id)} className="hover:opacity-70"><X size={8}/></button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* All labels — toggle on/off */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {allLabels.length === 0 && <p className="text-xs text-center text-gray-400 py-4">No labels yet</p>}
                    {allLabels.map(l => {
                      const active = (convLabels[activeId||'']||[]).some(x=>x.id===l.id)
                      return (
                        <div key={l.id} className="flex items-center gap-2 group">
                          <button onClick={()=>toggleLabel(l.id)}
                            className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-start`}
                            style={active
                              ? { background: l.color+'22', borderColor: l.color, color: l.color }
                              : { background: 'transparent', borderColor: '#e5e7eb', color: '#6b7280' }}>
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }}/>
                            {editLabel?.id === l.id ? (
                              <input autoFocus value={editLabel.name} onChange={e=>setEditLabel(v=>v?{...v,name:e.target.value}:v)}
                                className="flex-1 bg-transparent outline-none text-xs" onClick={e=>e.stopPropagation()}/>
                            ) : (
                              <span className="flex-1 truncate">{l.name}</span>
                            )}
                            {active && <Check size={10}/>}
                          </button>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {editLabel?.id === l.id ? (
                              <>
                                <input type="color" value={editLabel.color} onChange={e=>setEditLabel(v=>v?{...v,color:e.target.value}:v)}
                                  className="w-5 h-5 rounded cursor-pointer border-0 p-0" style={{ background: 'none' }}/>
                                <button onClick={async ()=>{
                                    await fetch('/api/admin/live-chat/labels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editLabel.id,name:editLabel.name,color:editLabel.color})})
                                    setAllLabels(prev=>prev.map(x=>x.id===editLabel.id?{...x,name:editLabel.name,color:editLabel.color}:x))
                                    setEditLabel(null)
                                  }}
                                  className="p-1 text-gray-400 hover:text-green-500 rounded"><Check size={10}/></button>
                                <button onClick={()=>setEditLabel(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X size={10}/></button>
                              </>
                            ) : (
                              <>
                                <button onClick={()=>setEditLabel({...l})} className="p-1 text-gray-400 hover:text-indigo-500 rounded"><Edit3 size={10}/></button>
                                <button onClick={()=>deleteLabel(l.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={10}/></button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Create new label */}
                  <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <div className="flex gap-2">
                      <input type="color" value={labelForm.color} onChange={e=>setLabelForm(v=>({...v,color:e.target.value}))}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700 p-0.5"/>
                      <input value={labelForm.name} onChange={e=>setLabelForm(v=>({...v,name:e.target.value}))}
                        onKeyDown={e=>{ if(e.key==='Enter') saveLabel() }}
                        placeholder="New label name…" className={`${inp} flex-1`}/>
                    </div>
                    <button onClick={saveLabel} disabled={!labelForm.name.trim()}
                      className="w-full py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-40 hover:opacity-90 flex items-center justify-center gap-1"
                      style={{ background: '#6366f1' }}>
                      <Plus size={12}/> Create Label
                    </button>
                  </div>
                </>
              )}

              {panel === 'qr' && (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Zap size={14} style={{ color: GOLD }}/> Quick Replies
                    </h3>
                    <button onClick={()=>setPanel('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X size={14}/></button>
                  </div>
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
                    <input value={qrInput.title} onChange={e=>setQrInput(v=>({...v,title:e.target.value}))} placeholder="Title / shortcut" className={inp}/>
                    <textarea value={qrInput.content} onChange={e=>setQrInput(v=>({...v,content:e.target.value}))} rows={3} placeholder="Message content…" className={`${inp} resize-none`}/>
                    <div className="flex gap-2">
                      <button onClick={saveQR} disabled={!qrInput.title||!qrInput.content}
                        className="flex-1 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
                        style={{ background: GOLD }}>
                        {editQr ? 'Update' : 'Save Reply'}
                      </button>
                      {editQr && <button onClick={()=>{ setEditQr(null); setQrInput({title:'',content:''}) }} className="px-3 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500">Cancel</button>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {quickReplies.length===0 && <p className="text-xs text-center text-gray-400 py-6">No quick replies yet</p>}
                    {quickReplies.map(q=>(
                      <div key={q.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold" style={{ color: GOLD }}>{q.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{q.content}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={()=>{ setInput(q.content); setPanel('none') }} title="Use" className="p-1 text-gray-400 hover:text-green-500 rounded"><Send size={10}/></button>
                            <button onClick={()=>{ setEditQr(q); setQrInput({title:q.title,content:q.content}) }} className="p-1 text-gray-400 hover:text-amber-500 rounded"><Edit3 size={10}/></button>
                            <button onClick={()=>deleteQR(q)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={10}/></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400">
          <div className="text-center">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-20"/>
            <p className="text-sm font-medium">Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  )
}
