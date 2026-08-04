'use client'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import {
  Plus, MessageCircle, Clock, CheckCircle, AlertCircle, X,
  ChevronDown, ChevronUp, Paperclip, Download, Image as ImageIcon, FileText,
} from 'lucide-react'

type Attachment = { id: string; file_path: string; file_name: string; file_size: number; file_type: string; uploaded_by: string }
type TMsg      = { id: string; sender_type: 'member' | 'admin'; message: string; sender_name?: string; sender_avatar?: string; created_at: string }
type Ticket = {
  id: string; subject: string; message: string; status: string; priority: string
  category: string; reply?: string; replied_at?: string; created_at: string
  ticket_attachments: Attachment[]
  ticket_messages: TMsg[]
}

const CATEGORY_LABELS: Record<string, [string, string]> = {
  subscription: ['Subscription', 'اشتراك'],
  payment:      ['Payment',      'دفع'],
  general:      ['General',      'استفسار عام'],
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

  const openFile = async () => {
    const res = await fetch(`/api/tickets/file?path=${encodeURIComponent(att.file_path)}`)
    const { url } = await res.json()
    if (url) window.open(url, '_blank')
  }

  if (isImg && inline && imgUrl) {
    return (
      <button onClick={openFile} className="block rounded-xl overflow-hidden max-w-[240px] hover:opacity-90 transition-opacity">
        <img src={imgUrl} alt={att.file_name} className="w-full h-auto max-h-48 object-cover"/>
      </button>
    )
  }

  return (
    <button onClick={openFile}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs text-gray-600 dark:text-gray-300 max-w-[200px]">
      {isImg ? <ImageIcon size={12} className="flex-shrink-0 text-blue-400"/> : <FileText size={12} className="flex-shrink-0 text-gray-400"/>}
      <span className="truncate">{att.file_name}</span>
      <Download size={10} className="flex-shrink-0 text-gray-400"/>
    </button>
  )
}

export default function HelpdeskPage() {
  const settings = useSiteSettings()
  const { t, lang, dir } = useLang()
  const [tickets,    setTickets]   = useState<Ticket[]>([])
  const [loading,    setLoading]   = useState(true)
  const [expanded,   setExpanded]  = useState<string | null>(null)
  const [showForm,   setShowForm]  = useState(false)
  const [form,       setForm]      = useState({ subject: '', message: '', priority: 'normal', category: 'general' })
  const [files,      setFiles]     = useState<File[]>([])
  const [sending,    setSending]   = useState(false)
  const [msg,        setMsg]       = useState('')
  const [fStatus,      setFStatus]      = useState('all')
  const [replyText,    setReplyText]    = useState('')
  const [replySending, setReplySending] = useState(false)
  const [adminProfile, setAdminProfile] = useState<{ display_name?: string; avatar_url?: string } | null>(null)
  const replyFileRef = useRef<HTMLInputElement>(null)
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/profile').then(r => r.json()).then(d => {
      if (d && !d.error) setAdminProfile(d)
    }).catch(() => {})
  }, [])

  const load = (silent = false) =>
    fetch('/api/member/tickets').then(r => r.json()).then(d => {
      setTickets(d.tickets || [])
      if (!silent) setLoading(false)
    })

  useEffect(() => { load() }, [])

  // Realtime: poll every 8s when a ticket is expanded
  useEffect(() => {
    if (!expanded) return
    const id = setInterval(() => load(true), 8000)
    return () => clearInterval(id)
  }, [expanded])

  const statusIcon = (s:string) =>
    s==='open'       ? <AlertCircle size={13} className="text-amber-500"/> :
    s==='resolved'   ? <CheckCircle size={13} className="text-emerald-500"/> :
    s==='closed'     ? <X size={13} className="text-gray-500"/> :
    s==='in_progress'? <Clock size={13} style={{color:'#d99401'}}/> :
    <Clock size={13} className="text-blue-500"/>

  const statusLabel = (s:string) =>
    s==='open'        ? t('Open','مفتوح') :
    s==='resolved'    ? t('Resolved','محلول') :
    s==='closed'      ? t('Closed','مغلق') :
    s==='in_progress' ? t('In Progress','قيد المعالجة') :
    t('Pending','قيد الانتظار')

  const statusStyle = (s:string) =>
    s==='open'        ? {bg:'#FEF3C7',color:'#92400E'} :
    s==='resolved'    ? {bg:'#DCFCE7',color:'#166534'} :
    s==='closed'      ? {bg:'#F3F4F6',color:'#4B5563'} :
    s==='in_progress' ? {bg:'#FEF9EC',color:'#92610A'} :
    {bg:'#DBEAFE',color:'#1E40AF'}

  const submit = async () => {
    if (!form.subject.trim() || !form.message.trim()) return
    setSending(true)
    const res  = await fetch('/api/member/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setSending(false); setMsg(data.error || t('Failed to submit ticket', 'فشل إرسال التذكرة')); return }

    // Upload attachments
    if (data.ticket_id && files.length > 0) {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('ticket_id', data.ticket_id)
        await fetch('/api/member/tickets/upload', { method: 'POST', body: fd })
      }
    }

    setSending(false)
    setMsg(t('Ticket submitted successfully!', 'تم إرسال التذكرة بنجاح!'))
    setShowForm(false)
    setForm({ subject: '', message: '', priority: 'normal', category: 'general' })
    setFiles([])
    load()
  }

  const sendMemberReply = async (ticketId: string) => {
    if (!replyText.trim()) return
    setReplySending(true)
    const res = await fetch(`/api/member/tickets/${ticketId}/reply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: replyText }),
    })
    if (res.ok) {
      // Upload any reply attachments
      if (replyFiles.length > 0) {
        for (const file of replyFiles) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('ticket_id', ticketId)
          await fetch('/api/member/tickets/upload', { method: 'POST', body: fd })
        }
      }
      setReplyText('')
      setReplyFiles([])
      load(true)
    }
    setReplySending(false)
  }

  const inp = "w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#d99401]"

  return (
    <div className="p-3 md:p-6" dir={dir}>
      {/* Banner */}
      <div className="rounded-2xl mb-6 p-5 md:p-8" style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)' }}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">{t('Support Center', 'مركز الدعم')}</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {t('Help ', 'المساعدة ')}<span style={{color:'#d99401'}}>{t('Desk', 'والدعم')}</span>
            </h1>
            <p className="text-sm text-gray-300">
              {t('Submit a support ticket or contact us directly on WhatsApp.', 'أرسل تذكرة دعم أو تواصل معنا مباشرة على واتساب.')}
            </p>
          </div>
          <a href={`https://wa.me/${settings.whatsapp_number?.replace(/\D/g, '')}`} target="_blank"
            className="bg-green-500/20 border border-green-500/30 rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-green-500/30 transition-colors flex-shrink-0">
            <MessageCircle size={20} className="text-green-400"/>
            <div className="text-end">
              <p className="text-xs text-gray-400">{t('WhatsApp Support', 'دعم واتساب')}</p>
              <p className="text-sm font-bold text-white" dir="ltr">{settings.whatsapp_number || '+20 100 000 0000'}</p>
            </div>
          </a>
        </div>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-200 dark:border-emerald-500/20">{msg}</div>
      )}

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => {
            const count = s === 'all' ? tickets.length : tickets.filter(tk => tk.status === s).length
            return (
              <button key={s} onClick={() => setFStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${fStatus === s ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                style={fStatus === s ? { background: '#d99401' } : {}}>
                {s === 'all' ? t('All', 'الكل') :
                 s === 'open' ? t('Open', 'مفتوح') :
                 s === 'in_progress' ? t('In Progress', 'قيد المعالجة') :
                 s === 'resolved' ? t('Resolved', 'محلول') :
                 t('Closed', 'مغلق')}
                {count > 0 && <span className="ml-1 opacity-60 text-[10px]">({count})</span>}
              </button>
            )
          })}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors flex-shrink-0" style={{background:'#d99401'}}>
          <Plus size={15}/>{t('New Ticket', 'تذكرة جديدة')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/></div>
      ) : (
        <div className="flex flex-col gap-3">
          {(fStatus === 'all' ? tickets : tickets.filter(tk => tk.status === fStatus)).length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
              <MessageCircle size={24} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-sm text-gray-400">{t('No tickets found', 'لا توجد تذاكر')}</p>
            </div>
          ) : (fStatus === 'all' ? tickets : tickets.filter(tk => tk.status === fStatus)).map((ticket, idx) => {
            const st      = statusStyle(ticket.status)
            const cat     = CATEGORY_LABELS[ticket.category] || CATEGORY_LABELS.general
            const isOpen  = expanded === ticket.id
            const memberAtts = (ticket.ticket_attachments || []).filter(a => a.uploaded_by === 'member')
            const adminAtts  = (ticket.ticket_attachments || []).filter(a => a.uploaded_by === 'admin')
            const isEven  = idx % 2 === 0
            return (
              <div key={ticket.id} className={`border rounded-2xl overflow-hidden ${isEven ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800' : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-100/60 dark:border-blue-900/30'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : ticket.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{ticket.subject}</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex-shrink-0">{t(cat[0], cat[1])}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{ticket.message}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: st.bg, color: st.color }}>
                      {statusIcon(ticket.status)}{statusLabel(ticket.status)}
                    </span>
                    {isOpen ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
                  </div>
                </div>

                {/* Expanded: conversation thread */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-3">
                    {/* Build chronological message list:
                        Start with original message, then ticket_messages in order */}
                    {(() => {
                      const msgs: { sender: 'member' | 'admin'; text: string; time: string; id: string; name?: string; avatar?: string }[] = [
                        { sender: 'member', text: ticket.message, time: ticket.created_at, id: 'orig' },
                        ...((ticket.ticket_messages || [])
                          .slice()
                          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                          .map(m => ({
                            sender: m.sender_type, text: m.message, time: m.created_at, id: m.id,
                            name:   m.sender_type === 'admin' ? (m.sender_name || adminProfile?.display_name || 'Support') : undefined,
                            avatar: m.sender_type === 'admin' ? (m.sender_avatar || adminProfile?.avatar_url || undefined) : undefined,
                          }))
                        ),
                      ]
                      return msgs.map(m => (
                        <div key={m.id} className={`flex gap-2 ${m.sender === 'admin' ? 'flex-row-reverse' : 'flex-row'}`} style={{direction:'ltr'}}>
                          {/* Avatar */}
                          {m.sender === 'admin' && (
                            m.avatar
                              ? <img src={m.avatar} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt=""/>
                              : <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                  {(m.name || 'S').charAt(0).toUpperCase()}
                                </div>
                          )}
                          <div className={`flex flex-col gap-0.5 max-w-[85%] ${m.sender === 'admin' ? 'items-end' : 'items-start'}`} style={{direction: dir}}>
                            <span className={`text-[10px] font-semibold ${m.sender === 'member' ? 'text-gray-400' : 'text-emerald-500'}`}>
                              {m.sender === 'member' ? t('You', 'أنت') : (m.name || t('Support', 'الدعم'))}
                            </span>
                            <div className={`rounded-xl p-3.5 text-xs whitespace-pre-wrap ${
                              m.sender === 'member'
                                ? 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            }`}>{m.text}</div>
                            <span className="text-[10px] text-gray-300 dark:text-gray-600">
                              {new Date(m.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                        </div>
                      ))
                    })()}

                    {/* Attachments — shown as inline bubbles */}
                    {(ticket.ticket_attachments || []).map(a => (
                      <div key={a.id} className={`flex gap-2 ${a.uploaded_by === 'admin' ? 'flex-row-reverse' : 'flex-row'}`} style={{direction:'ltr'}}>
                        {a.uploaded_by === 'admin' && (
                          adminProfile?.avatar_url
                            ? <img src={adminProfile.avatar_url} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt=""/>
                            : <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">S</div>
                        )}
                        <div className={`flex flex-col gap-0.5 max-w-[85%] ${a.uploaded_by === 'admin' ? 'items-end' : 'items-start'}`} style={{direction: dir}}>
                          <span className={`text-[10px] font-semibold ${a.uploaded_by === 'member' ? 'text-gray-400' : 'text-emerald-500'}`}>
                            {a.uploaded_by === 'member' ? t('You', 'أنت') : (adminProfile?.display_name || t('Support', 'الدعم'))}
                          </span>
                          <FileChip att={a} inline/>
                        </div>
                      </div>
                    ))}

                    {/* No messages yet — awaiting */}
                    {!ticket.reply && (ticket.ticket_messages || []).length === 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl px-3.5 py-2.5">
                        <Clock size={12}/>
                        {t('Awaiting support reply…', 'في انتظار رد فريق الدعم…')}
                      </div>
                    )}

                    {/* Member reply box — hidden only if closed */}
                    {ticket.status !== 'closed' && (
                      <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-2">
                        <div className="flex gap-2">
                          <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                            placeholder={t('Write a follow-up message…', 'اكتب رسالة متابعة…')}
                            rows={2} className={inp + ' resize-none flex-1 py-2.5 text-xs'}/>
                          <button onClick={() => sendMemberReply(ticket.id)} disabled={replySending || !replyText.trim()}
                            className="px-3 rounded-xl disabled:opacity-40 text-white text-xs font-bold transition-colors flex-shrink-0" style={{background:'#d99401'}}>
                            {replySending ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : t('Send', 'إرسال')}
                          </button>
                        </div>
                        {/* Attach for reply */}
                        <input ref={replyFileRef} type="file" multiple accept="image/*,.pdf,.txt" className="hidden"
                          onChange={e => setReplyFiles(Array.from(e.target.files || []))}/>
                        <button type="button" onClick={() => replyFileRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <Paperclip size={12}/>{t('Attach', 'إرفاق ملف')}
                          {replyFiles.length > 0 && <span className="text-red-500 font-semibold">{replyFiles.length} {t('file(s)', 'ملف')}</span>}
                        </button>
                        {replyFiles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {replyFiles.map((f, i) => (
                              <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-500">
                                {f.name}<button onClick={() => setReplyFiles(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={9}/></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {ticket.status === 'closed' && (
                      <p className="text-[11px] text-gray-400 text-center pt-1">{t('This ticket is closed.', 'هذه التذكرة مغلقة.')}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${ticket.priority === 'urgent' ? 'bg-red-50 text-red-500' : ticket.priority === 'high' ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-500'}`}>
                        {ticket.priority === 'urgent' ? t('Urgent', 'عاجل') : ticket.priority === 'high' ? t('High', 'عالي') : t('Normal', 'عادي')}
                      </span>
                      <span>{new Date(ticket.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New ticket modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('New Support Ticket', 'تذكرة دعم جديدة')}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t('Category', 'النوع')}</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inp}>
                  <option value="subscription">{t('Subscription inquiry', 'استفسار بخصوص اشتراك')}</option>
                  <option value="payment">{t('Payment', 'دفع')}</option>
                  <option value="general">{t('General inquiry', 'استفسار عام')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t('Subject', 'الموضوع')}</label>
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder={t('What do you need help with?', 'بماذا تحتاج مساعدة؟')} className={inp}/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t('Priority', 'الأولوية')}</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className={inp}>
                  <option value="normal">{t('Normal', 'عادي')}</option>
                  <option value="high">{t('High', 'عالي')}</option>
                  <option value="urgent">{t('Urgent', 'عاجل')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t('Message', 'الرسالة')}</label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={4} placeholder={t('Describe your issue...', 'اشرح مشكلتك...')} className={inp + ' resize-none'}/>
              </div>
              {/* File attach */}
              <div>
                <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.txt" className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files || []))}/>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  <Paperclip size={13}/>{t('Attach files', 'إرفاق ملفات')}
                  {files.length > 0 && <span className="text-red-500 font-semibold">{files.length} {t('file(s)', 'ملف')}</span>}
                </button>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {files.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                        {f.name}
                        <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={10}/></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={submit} disabled={sending}
                className="w-full py-3 rounded-xl disabled:opacity-50 text-white text-sm font-bold transition-colors" style={{background:'#d99401'}}>
                {sending ? t('Sending...', 'جاري الإرسال...') : t('Submit Ticket', 'إرسال التذكرة')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
