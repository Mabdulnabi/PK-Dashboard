'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { Check, X, Pencil, Trash2, AlertCircle, RefreshCw, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {type === 'ok' ? <Check size={15} /> : <AlertCircle size={15} />}{msg}
    </div>
  )
}

export default function BlogsAdminPage() {
  const [posts,       setPosts]       = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [filter,      setFilter]      = useState<'all' | 'pending' | 'approved' | 'rejected' | 'revision_needed'>('all')
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [blogAction,  setBlogAction]  = useState<{ id: string; type: 'reject' | 'revision'; text: string } | null>(null)
  const [adminNote,   setAdminNote]   = useState<{ id: string; text: string } | null>(null)
  const [toast,       setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const res = await fetch('/api/admin/blogs')
    const d   = await res.json()
    if (Array.isArray(d)) { setPosts(d); setLoading(false) }
    else { setError(d?.error || 'Failed to load'); setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('admin-blogs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'blog_posts' }, payload => {
        const p = payload.new as any
        setPosts(prev => prev.some((x: any) => x.id === p.id) ? prev : [{ ...p, members: null }, ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'blog_posts' }, payload => {
        const deleted = payload.old as any
        if (deleted?.id) setPosts(prev => prev.filter((p: any) => p.id !== deleted.id))
        else load()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const approveBlog = async (id: string, action: 'approve' | 'reject' | 'revision', reason?: string) => {
    const res = await fetch(`/api/admin/blogs/${id}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    if (res.ok) {
      const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revision_needed'
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus, rejection_reason: reason || null, updated_at: new Date().toISOString() } : p))
      setBlogAction(null)
      setToast({ msg: action === 'approve' ? 'Post approved' : action === 'reject' ? 'Post rejected' : 'Revision requested', type: 'ok' })
    } else {
      setToast({ msg: 'Error updating post', type: 'err' })
    }
  }

  const saveNote = async (id: string, note: string) => {
    const res = await fetch(`/api/admin/blogs/${id}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'note', reason: note }),
    })
    if (res.ok) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, admin_note: note } : p))
      setAdminNote(null)
      setToast({ msg: 'Note saved', type: 'ok' })
    }
  }

  const deletePost = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/blogs/${id}`, { method: 'DELETE' })
    if (res.ok) { setPosts(prev => prev.filter((p: any) => p.id !== id)); setToast({ msg: 'Post deleted', type: 'ok' }) }
    else { const j = await res.json().catch(() => ({})); setToast({ msg: j.error || 'Error', type: 'err' }) }
  }

  const filtered = filter === 'all' ? posts : posts.filter((p: any) => p.status === filter)
  const pending  = posts.filter((p: any) => p.status === 'pending').length

  const statusLabel = (s: string) => s.replace('_', ' ')
  const statusCls   = (s: string) =>
    s === 'pending'         ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
    s === 'approved'        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
    s === 'revision_needed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  const borderCls   = (s: string) =>
    s === 'pending'         ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/5' :
    s === 'revision_needed' ? 'border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-900/5' :
                              'border-gray-100 dark:border-gray-800'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Blogs" subtitle="Moderate member blog posts" />

        <div className="flex-1 overflow-auto p-6">
          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
              {(['all', 'pending', 'approved', 'revision_needed', 'rejected'] as const).map(f => {
                const count = f === 'all' ? posts.length : posts.filter((p: any) => p.status === f).length
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${filter === f ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    {f.replace('_', ' ')}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === f ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={load} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium px-2 py-1">
              <RefreshCw size={12} />Refresh
            </button>
            <a href="/store/blogs/new"
              className="ms-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors">
              + New Post
            </a>

          </div>

          {loading && <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 text-xs text-red-600 dark:text-red-400 font-mono mb-3">{error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
              <FileText size={32} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No blog posts found</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-3 max-w-4xl">
              {filtered.map((post: any) => {
                const isExp = expanded === post.id
                return (
                  <div key={post.id} className={`border rounded-xl overflow-hidden ${borderCls(post.status)}`}>
                    {/* Header row */}
                    <div className="flex items-start gap-3 p-4">
                      {post.cover_image_url && (
                        <img src={post.cover_image_url} alt="" className="w-14 h-12 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{post.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusCls(post.status)}`}>{statusLabel(post.status)}</span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          By <strong className="text-gray-600 dark:text-gray-300">{post.members?.full_name || (post.member_id ? 'Unknown' : '🛡️ Admin')}</strong>
                          {' · '}{new Date(post.updated_at || post.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                        {post.rejection_reason && <p className="text-[11px] mt-1 text-amber-600 dark:text-amber-400">📝 Feedback: {post.rejection_reason}</p>}
                        {post.admin_note && <p className="text-[11px] mt-1 text-gray-400 italic">🔒 Note: {post.admin_note}</p>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                        <button onClick={() => setExpanded(isExp ? null : post.id)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
                          {isExp ? 'Hide' : 'Read'}
                        </button>
                        {post.status !== 'approved' && (
                          <button onClick={() => approveBlog(post.id, 'approve')}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors">
                            <Check size={11} />Approve
                          </button>
                        )}
                        {post.status !== 'revision_needed' && (
                          <button onClick={() => setBlogAction({ id: post.id, type: 'revision', text: '' })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors">
                            <Pencil size={11} />Revision
                          </button>
                        )}
                        {post.status !== 'rejected' && (
                          <button onClick={() => setBlogAction({ id: post.id, type: 'reject', text: '' })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 text-[11px] font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                            <X size={11} />Reject
                          </button>
                        )}
                        {!post.member_id && (
                          <a href={`/store/blogs/${post.id}/edit`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[11px] font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                            <Pencil size={11} />Edit
                          </a>
                        )}
                        <button onClick={() => setAdminNote({ id: post.id, text: post.admin_note || '' })}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
                          🔒 Note
                        </button>
                        <button onClick={() => deletePost(post.id, post.title)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800/50 text-red-500 text-[11px] font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                          <Trash2 size={11} />Delete
                        </button>
                      </div>
                    </div>

                    {/* Inline action box */}
                    {blogAction && blogAction.id === post.id && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          {blogAction.type === 'revision' ? 'Request Revision — what should the member fix?' : 'Rejection reason for the member:'}
                        </p>
                        <textarea value={blogAction.text} onChange={e => setBlogAction(a => a ? { ...a, text: e.target.value } : a)} rows={3}
                          placeholder={blogAction.type === 'revision' ? 'e.g. Please add more detail in section 2…' : 'Reason for rejection…'}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-purple-400 resize-none mb-2" />
                        <div className="flex items-center gap-2">
                          <button onClick={() => approveBlog(post.id, blogAction.type, blogAction.text || undefined)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-colors ${blogAction.type === 'revision' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'}`}>
                            <Check size={11} />{blogAction.type === 'revision' ? 'Send Revision Request' : 'Reject Post'}
                          </button>
                          <button onClick={() => setBlogAction(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Admin note modal */}
                    {adminNote && adminNote.id === post.id && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">🔒 Private admin note (not visible to member)</p>
                        <textarea value={adminNote.text} onChange={e => setAdminNote(a => a ? { ...a, text: e.target.value } : a)} rows={2}
                          placeholder="Internal note…"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-purple-400 resize-none mb-2" />
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveNote(post.id, adminNote.text)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-900 text-white text-xs font-bold transition-colors">
                            <Check size={11} />Save Note
                          </button>
                          <button onClick={() => setAdminNote(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Expanded content */}
                    {isExp && post.content && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: post.content }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
