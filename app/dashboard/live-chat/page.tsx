'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  MessageSquare, Search, Send, Paperclip, X, ChevronLeft,
  MoreVertical, StickyNote, Zap, Trash2, Edit3, Check, CheckCheck,
  Clock, Image as ImageIcon, File, Plus, Circle,
  UserCheck, Users,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ar } from 'date-fns/locale'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
const fmtDate = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })
const fmtSize = (b: number) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`

function Avatar({ url, name, size = 9 }: { url?: string|null; name?: string; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-xs`
  if (url) return <img src={url} className={`${cls} object-cover`} alt={name}/>
  const bg = ['#6366f1','#8b5cf6','#ec4899','#f97316','#22c55e','#14b8a6','#d99401']
  const i  = (name?.charCodeAt(0) || 0) % bg.length
  return <div className={cls} style={{background:bg[i]}}>{name?.[0]?.toUpperCase()}</div>
}

function StatusTick({ status }: { status: string }) {
  if (status === 'read')      return <CheckCheck size={12} className="text-blue-400"/>
  if (status === 'delivered') return <CheckCheck size={12} className="text-gray-400"/>
  return <Check size={12} className="text-gray-400"/>
}

function AttachmentPreview({ a }: { a: Attachment }) {
  if (a.kind === 'image') return (
    <a href={a.url} target="_blank" rel="noopener" className="block">
      <img src={a.url} alt={a.name} className="max-w-[200px] max-h-[200px] rounded-lg object-cover border border-black/10"/>
    </a>
  )
  return (
    <a href={a.url} target="_blank" rel="noopener"
      className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2 text-xs hover:bg-black/20 transition-colors">
      <File size={14}/> <span className="truncate max-w-[140px]">{a.name}</span>
      <span className="text-gray-400 flex-shrink-0">{fmtSize(a.size_bytes)}</span>
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
  const [panel, setPanel]           = useState<'none'|'notes'|'qr'>('none')
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
  const messagesEndRef              = useRef<HTMLDivElement>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)
  const channelRef                  = useRef<any>(null)
  const presenceRef                 = useRef<any>(null)

  const activeConv = convs.find(c => c.id === activeId) || null

  // ── Load conversations ──────────────────────────────────────────────────────
  const loadConvs = useCallback(async () => {
    const res = await fetch(`/api/admin/live-chat?filter=${filter}&search=${encodeURIComponent(search)}`)
    const d   = await res.json()
    setConvs(d.conversations || [])
    setLoading(false)
  }, [filter, search])

  useEffect(() => { loadConvs() }, [loadConvs])

  // ── Load quick replies ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/live-chat/quick-replies').then(r=>r.json()).then(d=>setQR(d.replies||[]))
  }, [])

  // ── Realtime: subscribe to all message inserts / conv updates ──────────────
  useEffect(() => {
    const ch = supabase.channel('admin-live-chat')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_chat_messages'
      }, payload => {
        const msg = payload.new as Message
        if (!msg) return
        // update conversation list
        loadConvs()
        // update open conversation
        if (msg.conversation_id === activeId) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === msg.id)
            if (exists) return prev.map(m => m.id === msg.id ? { ...m, ...msg } : m)
            return [...prev, { ...msg, live_chat_attachments: [] }]
          })
          // mark as delivered if from member
          if (msg.sender_type === 'member') {
            fetch(`/api/admin/live-chat/${msg.conversation_id}`, { method:'PATCH',
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ unread_admin: 0 })
            })
          }
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        setTyping(prev => {
          const next = new Set(prev)
          if (payload.typing) next.add(payload.conv_id)
          else next.delete(payload.conv_id)
          return next
        })
        if (payload.typing) setTimeout(() => {
          setTyping(prev => { const n = new Set(prev); n.delete(payload.conv_id); return n })
        }, 3000)
      })
      .subscribe()

    channelRef.current = ch

    // Presence for online status
    const presence = supabase.channel('member-presence')
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState()
        const online = new Set(Object.values(state).flat().map((p: any) => p.member_id as string))
        setOnline(online)
      })
      .subscribe()
    presenceRef.current = presence

    return () => {
      supabase.removeChannel(ch)
      supabase.removeChannel(presence)
    }
  }, [activeId, loadConvs])

  // ── Open conversation ───────────────────────────────────────────────────────
  const openConv = async (id: string) => {
    setActiveId(id)
    setPanel('none')
    const res = await fetch(`/api/admin/live-chat/${id}`)
    const d   = await res.json()
    setMessages(d.messages || [])
    setNotes(d.notes || [])
    setConvs(prev => prev.map(c => c.id === id ? { ...c, unread_admin: 0 } : c))
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!activeId || (!input.trim() && !pendingFiles.length) || sending) return
    setSending(true)

    // if editing
    if (editMsg) {
      await fetch(`/api/admin/live-chat/${activeId}/messages`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message_id: editMsg.id, content: input.trim() }),
      })
      setMessages(prev => prev.map(m => m.id === editMsg.id ? { ...m, content: input.trim(), edited_at: new Date().toISOString() } : m))
      setEditMsg(null)
      setInput('')
      setSending(false)
      return
    }

    const res = await fetch(`/api/admin/live-chat/${activeId}/messages`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ content: input.trim() || null, attachments: pendingFiles }),
    })
    const d = await res.json()
    if (d.message) {
      setMessages(prev => {
        const exists = prev.find(m => m.id === d.message.id)
        return exists ? prev : [...prev, d.message]
      })
      loadConvs()
    }
    setInput('')
    setPending([])
    setSending(false)
  }

  // ── Upload file ─────────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0D1117]">

      {/* ── Conversations sidebar ─────────────────────────────────────────── */}
      <div className={`flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827]
        ${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-shrink-0`}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-500"/> Live Chat
            </h1>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
              {convs.filter(c=>c.unread_admin>0).length} unread
            </span>
          </div>
          <div className="relative mb-3">
            <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or code…"
              className="w-full ps-8 pe-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-indigo-400 text-gray-800 dark:text-gray-200"/>
          </div>
          <div className="flex gap-1.5">
            {(['all','unread'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter===f ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
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
            const isOnline = onlineMembers.has(c.member_id)
            const isTyping = typingConvs.has(c.id)
            return (
              <div key={c.id} onClick={()=>openConv(c.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors relative group
                  ${activeId===c.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-e-2 border-e-indigo-500' : ''}`}>
                <div className="relative flex-shrink-0">
                  <Avatar url={c.member?.avatar_url} name={c.member?.full_name} size={10}/>
                  <span className={`absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${isOnline?'bg-green-500':'bg-gray-300 dark:bg-gray-600'}`}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm truncate ${c.unread_admin>0?'font-bold text-gray-900 dark:text-gray-100':'font-medium text-gray-800 dark:text-gray-200'}`}>
                      {c.member?.full_name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {c.last_message_at ? fmtDate(c.last_message_at) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {isTyping ? <span className="text-indigo-500 font-medium">typing…</span>
                        : c.last_message || <span className="italic opacity-60">No messages</span>}
                    </span>
                    {c.unread_admin > 0 && (
                      <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {c.unread_admin > 9 ? '9+' : c.unread_admin}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{c.member?.member_code}</div>
                </div>
                <button onClick={e=>deleteConv(c.id,e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all absolute end-2 top-2">
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
                <span className={`absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${onlineMembers.has(activeConv.member_id)?'bg-green-500':'bg-gray-300'}`}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{activeConv.member?.full_name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{activeConv.member?.member_code}</span>
                  <span>•</span>
                  <span className={onlineMembers.has(activeConv.member_id)?'text-green-500':'text-gray-400'}>
                    {onlineMembers.has(activeConv.member_id) ? '● Online' : '○ Offline'}
                  </span>
                  {typingConvs.has(activeId) && <span className="text-indigo-500 font-medium animate-pulse">typing…</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={()=>{ fetch(`/api/admin/live-chat/${activeId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({assigned_admin_id:'me'})}) }}
                  title="Take conversation"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-500 transition-colors">
                  <UserCheck size={16}/>
                </button>
                <button onClick={()=>setPanel(p=>p==='notes'?'none':'notes')}
                  className={`p-2 rounded-lg transition-colors ${panel==='notes'?'bg-amber-100 dark:bg-amber-900/30 text-amber-600':'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-amber-500'}`}>
                  <StickyNote size={16}/>
                </button>
                <button onClick={()=>setPanel(p=>p==='qr'?'none':'qr')}
                  className={`p-2 rounded-lg transition-colors ${panel==='qr'?'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600':'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-500'}`}>
                  <Zap size={16}/>
                </button>
                <button onClick={()=>{ if(confirm('Close conversation?')) fetch(`/api/admin/live-chat/${activeId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'closed'})}).then(()=>setConvs(prev=>prev.map(c=>c.id===activeId?{...c,status:'closed'}:c))) }}
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
                const isAdmin = msg.sender_type === 'admin'
                const isDeleted = !!msg.deleted_at
                const prevMsg = messages[i - 1]
                const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
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
                        {!isAdmin && !prevMsg?.sender_name && (
                          <span className="text-[10px] text-gray-500 ms-1">{msg.sender_name}</span>
                        )}
                        <div className={`relative rounded-2xl px-3 py-2 shadow-sm text-sm
                          ${isAdmin
                            ? 'bg-indigo-500 text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                          } ${isDeleted ? 'opacity-50 italic' : ''}`}>
                          {isDeleted ? (
                            <span className="text-xs">🚫 Message deleted</span>
                          ) : (
                            <>
                              {msg.live_chat_attachments?.map(a=>(
                                <div key={a.url} className="mb-2"><AttachmentPreview a={a}/></div>
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
                            <button onClick={()=>{ setEditMsg(msg); setInput(msg.content||'') }}
                              className="p-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-500 hover:text-indigo-500 shadow-sm">
                              <Edit3 size={11}/>
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

            {/* Pending attachments preview */}
            {pendingFiles.length > 0 && (
              <div className="flex gap-2 px-4 py-2 bg-white dark:bg-[#111827] border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
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
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-200 dark:border-indigo-800 text-xs text-indigo-600 dark:text-indigo-400">
                <Edit3 size={12}/> Editing message
                <button onClick={()=>{ setEditMsg(null); setInput('') }} className="ms-auto p-1 hover:bg-indigo-100 rounded"><X size={12}/></button>
              </div>
            )}

            {/* Quick reply picker */}
            {showQrPicker && quickReplies.length > 0 && (
              <div className="absolute bottom-20 start-1/2 -translate-x-1/2 w-80 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20">
                {quickReplies.map(q=>(
                  <button key={q.id} onClick={()=>{ setInput(q.content); setQrPicker(false) }}
                    className="w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{q.title}</div>
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
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-500 transition-colors flex-shrink-0">
                  <Paperclip size={18}/>
                </button>
                <button onClick={()=>setQrPicker(v=>!v)}
                  className={`p-2 rounded-xl transition-colors flex-shrink-0 ${showQrPicker?'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600':'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-indigo-500'}`}>
                  <Zap size={18}/>
                </button>
                <textarea value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage() } }}
                  placeholder="Type a message…" rows={1}
                  className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-indigo-400 text-gray-800 dark:text-gray-200 max-h-32 overflow-y-auto"
                  style={{minHeight:'40px'}}/>
                <button onClick={sendMessage} disabled={sending||uploading||(!input.trim()&&!pendingFiles.length)}
                  className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : <Send size={16}/>}
                </button>
              </div>
            </div>
          </div>

          {/* ── Side panel (Notes / Quick Replies) ──────────────────────── */}
          {panel !== 'none' && (
            <div className="w-72 flex-shrink-0 border-s border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] flex flex-col overflow-hidden">

              {/* Notes panel */}
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
                      className="w-full resize-none px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-amber-400 text-gray-800 dark:text-gray-200"/>
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveNote} className="flex-1 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600">
                        {editNote ? 'Update' : 'Add Note'}
                      </button>
                      {editNote && <button onClick={()=>{ setEditNote(null); setNoteInput('') }} className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50">Cancel</button>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {notes.length === 0 && <p className="text-xs text-center text-gray-400 py-6">No notes yet</p>}
                    {notes.map(n=>(
                      <div key={n.id} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{n.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-gray-400">{n.admin_name} · {fmtDate(n.created_at)}</span>
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

              {/* Quick Replies panel */}
              {panel === 'qr' && (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Zap size={14} className="text-indigo-500"/> Quick Replies
                    </h3>
                    <button onClick={()=>setPanel('none')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><X size={14}/></button>
                  </div>
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
                    <input value={qrInput.title} onChange={e=>setQrInput(v=>({...v,title:e.target.value}))} placeholder="Title / shortcut"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-indigo-400 text-gray-800 dark:text-gray-200"/>
                    <textarea value={qrInput.content} onChange={e=>setQrInput(v=>({...v,content:e.target.value}))} rows={3} placeholder="Message content…"
                      className="w-full resize-none px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none focus:border-indigo-400 text-gray-800 dark:text-gray-200"/>
                    <div className="flex gap-2">
                      <button onClick={saveQR} disabled={!qrInput.title||!qrInput.content}
                        className="flex-1 py-1.5 text-xs font-bold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-40">
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
                            <p className="text-xs font-bold text-indigo-500">{q.title}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{q.content}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={()=>{ setInput(q.content); setPanel('none') }} title="Use" className="p-1 text-gray-400 hover:text-indigo-500 rounded"><Send size={10}/></button>
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
