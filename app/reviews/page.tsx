'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Star, Trash2, ThumbsUp, ThumbsDown, MessageCircle, Check, AlertCircle } from 'lucide-react'

interface Review {
  id: string; tool_id: string; member_name: string; stars: number
  comment?: string; approved: boolean; created_at: string
  shop_tools?: { name: string }
}

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check size={15} /> : <AlertCircle size={15} />}{msg}
    </div>
  )
}

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} fill={i <= n ? '#F59E0B' : 'none'} stroke={i <= n ? '#F59E0B' : '#D1D5DB'} />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | 'pending' | 'approved'>('all')
  const [toast,   setToast]   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/reviews')
    const d   = await res.json()
    setReviews(d.reviews || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (id: string, approved: boolean) => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    })
    if (res.ok) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, approved } : r))
      setToast({ msg: approved ? 'Review approved' : 'Review hidden', type: 'ok' })
    } else {
      setToast({ msg: 'Error updating review', type: 'err' })
    }
  }

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setReviews(prev => prev.filter(r => r.id !== id))
      setToast({ msg: 'Review deleted', type: 'ok' })
    } else {
      setToast({ msg: 'Error deleting review', type: 'err' })
    }
  }

  const filtered = filter === 'all' ? reviews : reviews.filter(r => filter === 'pending' ? !r.approved : r.approved)
  const pending  = reviews.filter(r => !r.approved).length

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Reviews" subtitle="Manage tool reviews from members" />

        <div className="flex-1 overflow-auto p-6">
          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              {([['all', 'All', reviews.length], ['pending', 'Pending', pending], ['approved', 'Approved', reviews.length - pending]] as const).map(([id, label, count]) => (
                <button key={id} onClick={() => setFilter(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filter === id ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{count}</span>
                </button>
              ))}
            </div>
            <button onClick={() => load()} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium px-2 py-1">↺ Refresh</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
              <MessageCircle size={32} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No reviews found</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-4xl">
              {filtered.map(r => (
                <div key={r.id} className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex items-start gap-4 ${!r.approved ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-100 dark:border-gray-800'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{r.member_name}</span>
                      <StarRow n={r.stars} />
                      {!r.approved && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">Pending</span>}
                      {r.approved  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">Approved</span>}
                      <span className="text-[10px] text-gray-400 ms-auto">{r.shop_tools?.name}</span>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">{r.comment}</p>}
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5">{new Date(r.created_at).toLocaleString('en-GB')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!r.approved && (
                      <button onClick={() => approve(r.id, true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors">
                        <ThumbsUp size={12} />Approve
                      </button>
                    )}
                    {r.approved && (
                      <button onClick={() => approve(r.id, false)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <ThumbsDown size={12} />Hide
                      </button>
                    )}
                    <button onClick={() => remove(r.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
