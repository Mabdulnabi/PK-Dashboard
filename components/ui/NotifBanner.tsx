'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Notif {
  id: string
  title: string
  title_en?: string
  message: string
  message_en?: string
  type: string
  is_read: boolean
  created_at: string
}

interface Props {
  /** keywords to match against title/title_en — shows banner if any unread notification matches */
  match: string[]
  lang: string
}

const TYPE_STYLE: Record<string, { border: string; icon: string; iconColor: string }> = {
  success: { border: 'rgba(16,185,129,0.35)', icon: '✓', iconColor: '#10b981' },
  warning: { border: 'rgba(245,158,11,0.35)',  icon: '⚠', iconColor: '#f59e0b' },
  error:   { border: 'rgba(239,68,68,0.35)',   icon: '✕', iconColor: '#ef4444' },
  info:    { border: 'rgba(99,102,241,0.35)',  icon: 'ℹ', iconColor: '#6366f1' },
}

export default function NotifBanner({ match, lang }: Props) {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const isRtl = lang === 'ar'

  useEffect(() => {
    fetch('/api/member/notifications')
      .then(r => r.json())
      .then(d => {
        const all: Notif[] = d.notifications || []
        const relevant = all.filter(n =>
          !n.is_read &&
          match.some(kw =>
            n.title?.includes(kw) || n.title_en?.includes(kw)
          )
        )
        setNotifs(relevant)
      })
      .catch(() => {})

    const handler = (e: Event) => {
      const n = (e as CustomEvent).detail as Notif
      if (match.some(kw => n.title?.includes(kw) || n.title_en?.includes(kw))) {
        setNotifs(prev => [n, ...prev.filter(x => x.id !== n.id)])
      }
    }
    window.addEventListener('pk-member-notification', handler)
    return () => window.removeEventListener('pk-member-notification', handler)
  }, [])

  const visible = notifs.filter(n => !dismissed.has(n.id))
  if (!visible.length) return null

  const n = visible[0]
  const s = TYPE_STYLE[n.type] || TYPE_STYLE.info
  const title   = isRtl ? n.title   : (n.title_en   || n.title)
  const message = isRtl ? n.message : (n.message_en || n.message)

  return (
    <div className="mx-3 md:mx-6 mt-3 rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${s.border}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)`,
      }}>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{background: s.border, color: s.iconColor}}>
        {s.icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{title}</p>
        {message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{message}</p>}
        {visible.length > 1 && (
          <p className="text-[11px] text-gray-400 mt-1">
            {isRtl ? `+${visible.length - 1} إشعارات أخرى` : `+${visible.length - 1} more`}
          </p>
        )}
      </div>
      <button onClick={() => setDismissed(prev => new Set([...prev, n.id]))}
        className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 transition-colors flex-shrink-0">
        <X size={12}/>
      </button>
    </div>
  )
}
