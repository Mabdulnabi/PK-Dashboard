'use client'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import {
  Plus, MessageCircle, Clock, CheckCircle, AlertCircle, X,
  ChevronDown, ChevronUp, Paperclip, Download, Image as ImageIcon, FileText,
} from 'lucide-react'

type Attachment = { id: string; file_path: string; file_name: string; file_size: number; file_type: string; uploaded_by: string }
type Ticket = {
  id: string; subject: string; message: string; status: string; priority: string
  category: string; reply?: string; replied_at?: string; created_at: string
  ticket_attachments: Attachment[]
}

const CATEGORY_LABELS: Record<string, [string, string]> = {
  subscription: ['Subscription', 'اشتراك'],
  payment:      ['Payment',      'دفع'],
  general:      ['General',      'استفسار عام'],
}

function FileChip({ att }: { att: Attachment }) {
  const isImg = att.file_type?.startsWith('image/')
  const openFile = async () => {
    const res = await fetch(`/api/tickets/file?path=${encodeURIComponent(att.file_path)}`)
    const { url } = await res.json()
    if (url) window.open(url, '_blank')
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
  const [tickets,  setTickets]  = useState<Ticket[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ subject: '', message: '', priority: 'normal', category: 'general' })
  const [files,    setFiles]    = useState<File[]>([])
  const [sending,  setSending]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () =>
    fetch('/api/member/tickets').then(r => r.json()).then(d => {
      setTickets(d.tickets || [])
      setLoading(false)
    })

  useEffect(() => { load() }, [])

  const statusIcon = (s:string) =>
    s==='open'?<AlertCircle size={13} className="text-amber-500"/>:
    s==='resolved'?<CheckCircle size={13} className="text-emerald-500"/>:
    <Clock size={13} className="text-blue-500"/>

  const statusLabel = (s:string) =>
    s==='open'?t('Open','مفتوح'):s==='resolved'?t('Resolved','محلول'):t('Pending','قيد المعالجة')

  const statusStyle = (s:string) =>
    s==='open'?{bg:'#FEF3C7',color:'#92400E'}:
    s==='resolved'?{bg:'#DCFCE7',color:'#166534'}:
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

  const inp = "w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-red-500"

  return (
    <div className="p-3 md:p-6" dir={dir}>
      {/* Banner */}
      <div className="rounded-2xl mb-6 p-8" style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">{t('Support Center', 'مركز الدعم')}</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {t('Help ', 'المساعدة ')}<span className="text-red-400">{t('Desk', 'والدعم')}</span>
            </h1>
            <p className="text-sm text-gray-300">
              {t('Submit a support ticket or contact us directly on WhatsApp.', 'أرسل تذكرة دعم أو تواصل معنا مباشرة على واتساب.')}
            </p>
          </div>
          <a href={`https://wa.me/${settings.whatsapp_number?.replace(/\D/g, '')}`} target="_blank"
            className="bg-green-500/20 border border-green-500/30 rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-green-500/30 transition-colors flex-shrink-0">
            <MessageCircle size={20} className="text-green-400"/>
            <div className="text-right">
              <p className="text-xs text-gray-400">{t('WhatsApp Support', 'دعم واتساب')}</p>
              <p className="text-sm font-bold text-white" dir="ltr">{settings.whatsapp_number || '+20 100 000 0000'}</p>
            </div>
          </a>
        </div>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-200 dark:border-emerald-500/20">{msg}</div>
      )}

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
          <Plus size={15}/>{t('New Ticket', 'تذكرة جديدة')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
              <MessageCircle size={24} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-sm text-gray-400">{t('No support tickets yet', 'لا توجد تذاكر دعم بعد')}</p>
            </div>
          ) : tickets.map(ticket => {
            const st      = statusStyle(ticket.status)
            const cat     = CATEGORY_LABELS[ticket.category] || CATEGORY_LABELS.general
            const isOpen  = expanded === ticket.id
            const memberAtts = (ticket.ticket_attachments || []).filter(a => a.uploaded_by === 'member')
            const adminAtts  = (ticket.ticket_attachments || []).filter(a => a.uploaded_by === 'admin')
            return (
              <div key={ticket.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
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

                {/* Expanded: conversation */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-4">
                    {/* Member message */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase">{t('Your message', 'رسالتك')}</span>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.message}</div>
                      {memberAtts.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {memberAtts.map(a => <FileChip key={a.id} att={a}/>)}
                        </div>
                      )}
                    </div>

                    {/* Admin reply */}
                    {ticket.reply ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-emerald-500 uppercase">{t('Support reply', 'رد الدعم')}</span>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3.5 text-xs text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap">{ticket.reply}</div>
                        {adminAtts.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {adminAtts.map(a => <FileChip key={a.id} att={a}/>)}
                          </div>
                        )}
                        {ticket.replied_at && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(ticket.replied_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl px-3.5 py-2.5">
                        <Clock size={12}/>
                        {t('Awaiting support reply…', 'في انتظار رد فريق الدعم…')}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
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
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {sending ? t('Sending...', 'جاري الإرسال...') : t('Submit Ticket', 'إرسال التذكرة')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
