'use client'
import { Bell, Plus, Sun, Moon, X, Check } from 'lucide-react'
import { useAdminTheme } from '@/lib/admin-theme'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

interface AdminNotif {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'danger'
  link?: string | null
  is_read: boolean
  created_at: string
}

const TYPE_COLOR: Record<string, string> = {
  info:    '#3B82F6',
  warning: '#F59E0B',
  success: '#22C55E',
  danger:  '#EF4444',
}

export default function Topbar({ title, subtitle, onAdd, addLabel = 'Add New' }: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string
}) {
  const { dark, toggle } = useAdminTheme()
  const [open,   setOpen]   = useState(false)
  const [notifs, setNotifs] = useState<AdminNotif[]>([])
  const dropRef = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.is_read).length

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      if (!res.ok) return
      const { notifications } = await res.json()
      setNotifs(notifications || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifs])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markRead = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 flex-shrink-0 bg-white dark:bg-[#0D1117] border-b border-gray-200 dark:border-[#1a2233]">
      <div>
        <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{title}</h1>
        {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a2233] transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notification bell */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a2233] transition-colors relative"
            title="Notifications"
          >
            <Bell size={15} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 w-80 bg-white dark:bg-[#0D1117] border border-gray-200 dark:border-[#1a2233] rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1a2233]">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  Notifications {unread > 0 && <span className="text-red-500">({unread})</span>}
                </span>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-[10px] text-blue-500 hover:underline font-medium">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)}><X size={13} className="text-gray-400"/></button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <Check size={20} className="text-gray-300"/>
                    <span className="text-xs text-gray-400">No notifications</span>
                  </div>
                )}
                {notifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { markRead(n.id); if (n.link) setOpen(false) }}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-[#1a2233] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a2233]/50 transition-colors ${!n.is_read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
                  >
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: TYPE_COLOR[n.type] ?? '#6B7280' }}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        {n.link ? (
                          <Link href={n.link} className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 hover:underline truncate">
                            {n.title}
                          </Link>
                        ) : (
                          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">{n.title}</p>
                        )}
                        {!n.is_read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1"/>}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[9px] text-gray-300 dark:text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/20"
          >
            <Plus size={13} />{addLabel}
          </button>
        )}
      </div>
    </header>
  )
}
