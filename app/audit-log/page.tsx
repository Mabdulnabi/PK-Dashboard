'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Shield, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'member.login':          { label: 'تسجيل دخول',      color: '#22c55e' },
  'member.login.failed':   { label: 'فشل دخول',         color: '#ef4444' },
  'member.create':         { label: 'عضو جديد',          color: '#3b82f6' },
  'payment.confirm':       { label: 'تأكيد دفع',         color: '#d99401' },
  'password.reset':        { label: 'إعادة كلمة مرور',  color: '#a855f7' },
  'password.reset.admin':  { label: 'ريست بالادمن',      color: '#f97316' },
}

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_LABELS[action] || { label: action, color: '#6b7280' }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  )
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState<any[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [action,  setAction]  = useState('')
  const [loading, setLoading] = useState(false)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    if (action) params.set('action', action)
    const r = await fetch(`/api/admin/audit-logs?${params}`)
    const d = await r.json()
    setLogs(d.logs || [])
    setTotal(d.total || 0)
    setLoading(false)
  }, [page, search, action])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar/>
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'rgba(217,148,1,0.12)'}}>
                <Shield size={18} style={{color:'#d99401'}}/>
              </div>
              <div>
                <h1 className="text-lg font-black">سجل النشاط</h1>
                <p className="text-xs text-gray-400">{total.toLocaleString('ar-EG')} سجل</p>
              </div>
            </div>
            <button onClick={load} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--card)] transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
              تحديث
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="بحث..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] outline-none focus:border-[#d99401]"
              />
            </div>
            <select
              value={action}
              onChange={e => { setAction(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] outline-none"
            >
              <option value="">كل الأحداث</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]" style={{background:'var(--card)'}}>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400">الحدث</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400">المنفذ</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400">الهدف</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400">التفاصيل</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400">الـ IP</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-400">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && logs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-xs">جاري التحميل...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-xs">لا توجد سجلات</td></tr>
                  ) : logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card)] transition-colors">
                      <td className="px-4 py-3"><ActionBadge action={log.action}/></td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold">{log.actor_name || '—'}</div>
                        <div className="text-[10px] text-gray-400">{log.actor_type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-300">{log.target_type || '—'}</div>
                        <div className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{log.target_id || ''}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <pre className="text-[9px] text-gray-400 whitespace-pre-wrap font-mono truncate">
                            {JSON.stringify(log.details, null, 0).slice(0, 80)}
                          </pre>
                        ) : <span className="text-gray-500">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{log.ip || '—'}</td>
                      <td className="px-4 py-3 text-[10px] text-gray-400 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
              <span>صفحة {page} من {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--card)] transition-colors">
                  <ChevronRight size={13}/>
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--card)] transition-colors">
                  <ChevronLeft size={13}/>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
