'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useLang } from '@/lib/lang-context'
import { useUISettings } from '@/lib/use-ui-settings'
import {
  MessageCircle, X, Send, Paperclip, ChevronDown,
  Check, CheckCheck, File, Trash2, Edit3, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { arEG, enUS } from 'date-fns/locale'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Attachment = { url: string; name: string; mime_type: string; size_bytes: number; kind: 'image' | 'file' }
type Message = {
  id: string; conversation_id: string
  sender_type: 'member' | 'admin'
  sender_name: string | null; sender_avatar: string | null
  content: string | null; status: string
  edited_at: string | null; deleted_at: string | null; created_at: string
  live_chat_attachments: Attachment[]
}

const GOLD = '#d99401'
const fmtTime = (d: string) => format(new Date(d), 'HH:mm')
const fmtSize = (b: number) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`

function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    ;([
      [880, now,      now + 0.12],
      [1100, now + 0.1, now + 0.35],
    ] as [number, number, number][]).forEach(([freq, start, end]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, end)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(start); osc.stop(end)
    })
  } catch {}
}

function StatusTick({ status }: { status: string }) {
  if (status === 'read')      return <CheckCheck size={11} style={{color:'#60a5fa'}} className="inline"/>
  if (status === 'delivered') return <CheckCheck size={11} className="text-gray-400 inline"/>
  return <Check size={11} className="text-gray-400 inline"/>
}

function AttachmentBubble({ a }: { a: Attachment }) {
  if (a.kind === 'image') return (
    <a href={a.url} target="_blank" rel="noopener noreferrer" className="block mt-1">
      <img src={a.url} alt={a.name} className="max-w-[180px] max-h-[180px] rounded-xl object-cover"/>
    </a>
  )
  return (
    <a href={a.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1 bg-black/10 rounded-lg px-2.5 py-1.5 text-xs hover:bg-black/20 transition-colors">
      <File size={12}/><span className="truncate max-w-[120px]">{a.name}</span>
      <span className="opacity-60 flex-shrink-0">{fmtSize(a.size_bytes)}</span>
    </a>
  )
}

export default function ChatWidget() {
  const { t, dir, lang } = useLang()
  const ui = useUISettings()
  const [open, setOpen]             = useState(false)
  const [convId, setConvId]         = useState<string | null>(null)
  const [memberId, setMemberId]     = useState<string | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [pending, setPending]       = useState<Attachment[]>([])
  const [unread, setUnread]         = useState(0)
  const [adminTyping, setAdminTyping] = useState(false)
  const [editMsg, setEditMsg]       = useState<Message | null>(null)
  const [initDone, setInitDone]     = useState(false)
  const [adminInfo, setAdminInfo]   = useState<{ name: string; avatar: string | null }>({ name: lang==='ar'?'الدعم':'Support', avatar: null })
  const [toast, setToast]           = useState<string | null>(null)
  const endRef      = useRef<HTMLDivElement>(null)
  const fileRef     = useRef<HTMLInputElement>(null)
  const textRef     = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<any>(null)
  const toastTimer  = useRef<any>(null)
  const openRef     = useRef(open)
  openRef.current   = open

  const showToast = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  // ── Init: get/create conversation ──────────────────────────────────────────
  const init = useCallback(async () => {
    if (initDone) return
    setInitDone(true)
    const [convRes, adminRes] = await Promise.all([
      fetch('/api/member/live-chat'),
      fetch('/api/member/live-chat/admin-info'),
    ])
    const convData  = await convRes.json()
    const adminData = await adminRes.json()
    if (adminData?.name) setAdminInfo({ name: adminData.name, avatar: adminData.avatar })
    if (!convData.conversation) return
    const conv = convData.conversation
    setConvId(conv.id)
    setMemberId(conv.member_id || null)
    setUnread(conv.unread_member || 0)

    const msgsRes = await fetch(`/api/member/live-chat/messages?conv_id=${conv.id}`)
    const md = await msgsRes.json()
    setMessages(md.messages || [])
  }, [initDone])

  useEffect(() => { init() }, [init])

  // ── Realtime subscription ───────────────────────────────────────────────────
  useEffect(() => {
    if (!convId) return
    const ch = supabase.channel(`chat-widget-${convId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_chat_messages',
        filter: `conversation_id=eq.${convId}`,
      }, async () => {
        // Re-fetch all messages to get full data including attachments
        const r = await fetch(`/api/member/live-chat/messages?conv_id=${convId}`)
        const d = await r.json()
        const msgs: Message[] = d.messages || []
        const prevLen = messages.length
        setMessages(msgs)
        // notify if new admin message arrived while closed
        const newAdminMsg = msgs.find(m => m.sender_type === 'admin' && !messages.find(p => p.id === m.id))
        if (newAdminMsg) {
          playSound()
          showToast(newAdminMsg.content || '📎 ' + t('Attachment', 'مرفق'))
          if (!openRef.current) setUnread(u => u + 1)
        }
      })
      .on('broadcast', { event: 'admin-typing' }, ({ payload }: any) => {
        if (payload.conv_id !== convId) return
        setAdminTyping(true)
        clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setAdminTyping(false), 3000)
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [convId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Presence ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!convId || !memberId) return
    const ch = supabase.channel('member-presence')
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        ch.track({ member_id: memberId, conv_id: convId })
      }
    })
    return () => { supabase.removeChannel(ch) }
  }, [convId, memberId])

  // ── Scroll & unread reset on open ─────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setUnread(0)
      fetch('/api/member/live-chat').catch(() => {}) // resets unread_member in DB
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages, open])

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (textRef.current) {
      textRef.current.style.height = 'auto'
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 120) + 'px'
    }
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  const send = async () => {
    if (!convId || (!input.trim() && !pending.length) || sending) return
    setSending(true)

    if (editMsg) {
      await fetch('/api/member/live-chat/messages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: editMsg.id, content: input.trim() }),
      })
      setMessages(prev => prev.map(m => m.id === editMsg.id ? { ...m, content: input.trim(), edited_at: new Date().toISOString() } : m))
      setEditMsg(null); setInput(''); setSending(false)
      if (textRef.current) textRef.current.style.height = 'auto'
      return
    }

    const res = await fetch('/api/member/live-chat/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conv_id: convId, content: input.trim() || null, attachments: pending }),
    })
    const d = await res.json()
    if (d.message) {
      playSound()
      setMessages(prev => prev.find(m => m.id === d.message.id) ? prev : [...prev, d.message])
    }
    setInput(''); setPending([]); setSending(false)
    if (textRef.current) textRef.current.style.height = 'auto'
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  const upload = async (file: File) => {
    setUploading(true)
    const form = new FormData(); form.append('file', file)
    const res  = await fetch('/api/member/live-chat/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) setPending(prev => [...prev, data])
    setUploading(false)
  }

  const deleteMsg = async (msg: Message) => {
    await fetch('/api/member/live-chat/messages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: msg.id, deleted: true }),
    })
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted_at: new Date().toISOString() } : m))
  }

  const isRtl = dir === 'rtl'
  const fabIcon = ui.live_chat_fab_icon

  return (
    <>
      {/* ── Toast notification ──────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 ${isRtl ? 'left-4' : 'right-4'} z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-white text-sm font-medium max-w-xs animate-in`}
          style={{ background: GOLD, boxShadow: `0 8px 32px ${GOLD}55` }}>
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            {adminInfo.avatar
              ? <img src={adminInfo.avatar} className="w-full h-full rounded-full object-cover" alt=""/>
              : <MessageCircle size={14}/>}
          </div>
          <div className="min-w-0">
            <div className="text-xs opacity-80">{adminInfo.name}</div>
            <div className="truncate">{toast}</div>
          </div>
          <button onClick={() => setToast(null)} className="ms-1 opacity-70 hover:opacity-100 flex-shrink-0"><X size={13}/></button>
        </div>
      )}

      {/* ── Widget ──────────────────────────────────────────────────────────── */}
      <div className={`fixed bottom-5 z-50 ${isRtl ? 'left-5' : 'right-5'}`}>

        {/* Chat window */}
        {open && (
          <div className={`absolute bottom-16 ${isRtl ? 'left-0' : 'right-0'} w-[340px] sm:w-[380px] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700`}
            style={{ maxHeight: '520px', minHeight: '420px' }}
            dir={dir}>

            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
              style={{ background: `linear-gradient(135deg,${GOLD} 0%,#b8790a 100%)` }}>
              <div className="w-9 h-9 rounded-full bg-white/20 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {adminInfo.avatar
                  ? <img src={adminInfo.avatar} className="w-full h-full object-cover" alt={adminInfo.name}/>
                  : <MessageCircle size={18} className="text-white"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{adminInfo.name}</div>
                <div className="text-[11px] text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block"/>
                  {t('We reply quickly', 'نرد بسرعة')}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronDown size={16}/>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
              style={{ background: '#f0f2f5', minHeight: 0 }}>

              {/* Welcome bubble — always shown at top */}
              <div className="flex items-end gap-1.5 mb-2">
                <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden"
                  style={{ background: GOLD, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {adminInfo.avatar
                    ? <img src={adminInfo.avatar} className="w-full h-full object-cover" alt=""/>
                    : <span className="text-white text-[9px] font-bold">{adminInfo.name[0]?.toUpperCase()}</span>}
                </div>
                <div className="max-w-[80%] flex flex-col gap-0.5 items-start">
                  <div className="rounded-2xl rounded-bl-sm px-3 py-2.5 text-[13px] bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm leading-relaxed">
                    {lang === 'ar'
                      ? <>أهلاً بيك في <strong>Pro Keys</strong> 👋<br/>اكتب رسالتك وهيتم الرد عليك في أقرب وقت.</>
                      : <>Welcome to <strong>Pro Keys</strong> 👋<br/>Write your message and we'll reply as soon as possible.</>
                    }
                  </div>
                </div>
              </div>

              {messages.map((msg, i) => {
                const isMine    = msg.sender_type === 'member'
                const isDeleted = !!msg.deleted_at
                const prevMsg   = messages[i - 1]
                const showDate  = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-2">
                        <span className="text-[10px] bg-white dark:bg-gray-700 text-gray-500 px-2.5 py-0.5 rounded-full shadow-sm">
                          {format(new Date(msg.created_at), 'MMM d', { locale: lang==='ar' ? arEG : enUS })}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'} group`}>
                      {!isMine && (
                        <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden"
                          style={{ background: GOLD, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {adminInfo.avatar
                            ? <img src={adminInfo.avatar} className="w-full h-full object-cover" alt=""/>
                            : <span className="text-white text-[9px] font-bold">{adminInfo.name[0]?.toUpperCase()}</span>}
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        <div className={`rounded-2xl px-3 py-2 text-sm shadow-sm
                          ${isMine
                            ? 'text-white rounded-br-sm'
                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                          } ${isDeleted ? 'opacity-50 italic' : ''}`}
                          style={isMine ? { background: GOLD } : {}}>
                          {isDeleted ? (
                            <span className="text-xs">🚫 {t('Message deleted', 'تم حذف الرسالة')}</span>
                          ) : (
                            <>
                              {msg.live_chat_attachments?.map((a, ai) => (
                                <AttachmentBubble key={ai} a={a}/>
                              ))}
                              {msg.content && <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">{msg.content}</p>}
                              {msg.edited_at && <span className="text-[10px] opacity-60"> ({t('edited','معدّل')})</span>}
                            </>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] text-gray-400 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <span>{fmtTime(msg.created_at)}</span>
                          {isMine && <StatusTick status={msg.status}/>}
                        </div>
                      </div>
                      {/* Member-side actions */}
                      {!isDeleted && isMine && (
                        <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5 transition-opacity">
                          {msg.content && (
                            <button onClick={() => { setEditMsg(msg); setInput(msg.content || ''); setTimeout(()=>{ if(textRef.current){ textRef.current.style.height='auto'; textRef.current.style.height=Math.min(textRef.current.scrollHeight,120)+'px' }},0) }}
                              className="p-1 rounded-lg bg-white dark:bg-gray-700 shadow-sm text-gray-400 hover:text-gray-700">
                              <Edit3 size={10}/>
                            </button>
                          )}
                          <button onClick={() => deleteMsg(msg)}
                            className="p-1 rounded-lg bg-white dark:bg-gray-700 shadow-sm text-gray-400 hover:text-red-500">
                            <Trash2 size={10}/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Admin typing */}
              {adminTyping && (
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden"
                    style={{ background: GOLD, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {adminInfo.avatar
                      ? <img src={adminInfo.avatar} className="w-full h-full object-cover" alt=""/>
                      : <span className="text-white text-[9px] font-bold">{adminInfo.name[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm flex gap-1 items-center">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${i*150}ms`}}/>
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>

            {/* Pending files */}
            {pending.length > 0 && (
              <div className="flex gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 overflow-x-auto flex-shrink-0">
                {pending.map((f, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    {f.kind === 'image'
                      ? <img src={f.url} className="w-12 h-12 rounded-lg object-cover border border-gray-200"/>
                      : <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><File size={16} className="text-gray-400"/></div>
                    }
                    <button onClick={() => setPending(p => p.filter((_, j) => j !== i))}
                      className="absolute -top-1 -end-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center">
                      <X size={8}/>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Edit banner */}
            {editMsg && (
              <div className="flex items-center gap-2 px-3 py-1.5 border-t text-[11px] flex-shrink-0"
                style={{ background: `${GOLD}15`, borderColor: `${GOLD}40`, color: GOLD }}>
                <Edit3 size={11}/> {t('Editing message', 'تعديل الرسالة')}
                <button onClick={() => { setEditMsg(null); setInput(''); if(textRef.current) textRef.current.style.height='auto' }} className="ms-auto"><X size={11}/></button>
              </div>
            )}

            {/* Composer */}
            <div className="px-3 py-2.5 bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-gray-700 flex items-end gap-2 flex-shrink-0">
              <input ref={fileRef} type="file" className="hidden" multiple
                onChange={async e => { for (const f of Array.from(e.target.files || [])) await upload(f); e.target.value = '' }}/>
              <button onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors flex-shrink-0"
                style={{ ['--hover-color' as any]: GOLD }}>
                {uploading ? <Loader2 size={16} className="animate-spin"/> : <Paperclip size={16}/>}
              </button>
              <textarea ref={textRef} value={input} onChange={handleInput}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={t('Type a message…', 'اكتب رسالة…')} rows={1}
                className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 outline-none text-gray-800 dark:text-gray-200 overflow-y-auto leading-5"
                style={{ minHeight: '38px', maxHeight: '120px', transition: 'height 0.1s' }}/>
              <button onClick={send} disabled={sending || uploading || (!input.trim() && !pending.length)}
                className="p-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                style={{ background: GOLD }}>
                {sending
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : <Send size={16}/>}
              </button>
            </div>
          </div>
        )}

        {/* FAB */}
        <button onClick={() => setOpen(v => !v)}
          className="relative w-14 h-14 rounded-full text-white shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center text-2xl"
          style={{ background: `linear-gradient(135deg,${GOLD} 0%,#b8790a 100%)`, boxShadow: `0 8px 24px ${GOLD}55` }}>
          {open
            ? <X size={22}/>
            : (fabIcon
                ? <span style={{ fontSize: 24, lineHeight: 1 }}>{fabIcon}</span>
                : <MessageCircle size={22}/>)}
          {!open && unread > 0 && (
            <span className="absolute -top-1 -end-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>
    </>
  )
}
