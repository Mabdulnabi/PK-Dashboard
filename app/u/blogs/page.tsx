'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { PenLine, Search, Clock, ChevronRight, Plus, User, Pencil, Trash2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Post {
  id: string
  title: string
  title_ar: string | null
  cover_image_url: string | null
  created_at: string
  published_at: string | null
  status: string
  member_id: string
  members: { full_name: string; avatar_url: string | null } | null
}

const STATUS_MAP: Record<string, { en: string; ar: string; cls: string }> = {
  approved:         { en: 'Published',       ar: 'منشور',            cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  pending:          { en: 'Under Review',    ar: 'قيد المراجعة',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  rejected:         { en: 'Rejected',        ar: 'مرفوض',            cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  revision_needed:  { en: 'Needs Revision',  ar: 'يحتاج تعديل',     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
}

export default function BlogsPage() {
  const { lang } = useLang()
  const ar = lang === 'ar'
  const router = useRouter()
  const [posts, setPosts]       = useState<Post[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState<'all' | 'mine'>('all')
  const [myMemberId, setMyId]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/member/verify').then(r => r.json()).then(d => { if (d?.member_id) setMyId(d.member_id) }).catch(() => {})
  }, [])

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (tab === 'mine') params.set('mine', '1')
    fetch(`/api/member/blogs?${params}`)
      .then(r => r.json())
      .then(d => { setPosts(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, tab])

  useEffect(() => { load() }, [load])

  // Realtime: update post status instantly when admin approves/rejects/revises
  useEffect(() => {
    const channel = supabase
      .channel('member-blogs-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blog_posts' }, payload => {
        const updated = payload.new as Post
        setPosts(prev => {
          const exists = prev.some(p => p.id === updated.id)
          if (exists) return prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
          // If a post moved to approved and wasn't in our list, reload
          if (updated.status === 'approved') { load(true); return prev }
          return prev
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const t = (en: string, ar_: string) => ar ? ar_ : en
  const getTitle  = (p: Post) => (ar && p.title_ar ? p.title_ar : p.title)
  const fmtDate   = (d: string) => new Date(d).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  // Show badge only on own posts OR non-approved posts (never "Published" on others' articles)
  const StatusBadge = ({ post }: { post: Post }) => {
    const isOwn = myMemberId && post.member_id === myMemberId
    if (!isOwn && post.status === 'approved') return null
    const s = STATUS_MAP[post.status]
    if (!s) return null
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{ar ? s.ar : s.en}</span>
  }

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('Community Blogs', 'مقالات المجتمع')}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('Read and share articles with the community', 'اقرأ وشارك مقالات مع المجتمع')}</p>
        </div>
        <button onClick={() => router.push('/u/blogs/new')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm"
          style={{ background: '#8b5cf6' }}>
          <Plus size={15}/> {t('Write Article', 'كتابة مقال')}
        </button>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {(['all', 'mine'] as const).map(t_ => (
            <button key={t_} onClick={() => setTab(t_)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${tab === t_ ? 'bg-purple-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              {t_ === 'all' ? t('All Articles', 'كل المقالات') : t('My Articles', 'مقالاتي')}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[180px] relative">
          <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${ar ? 'right-3' : 'left-3'}`}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search articles…', 'ابحث في المقالات…')}
            className={`w-full ${ar ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-1.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30`}/>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"/>)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <PenLine size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3"/>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('No articles yet. Be the first to write!', 'لا توجد مقالات بعد. كن أول من يكتب!')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} onClick={() => router.push(`/u/blogs/${post.id}`)}
              className={`flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-900 border cursor-pointer transition-all hover:shadow-sm
                ${post.status === 'pending'         ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/5' :
                  post.status === 'rejected'        ? 'border-red-200 dark:border-red-800/40 bg-red-50/30 dark:bg-red-900/5' :
                  post.status === 'revision_needed' ? 'border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-900/5' :
                  'border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800'}`}>
              {post.cover_image_url && (
                <img src={post.cover_image_url} alt="" className="w-20 h-16 rounded-xl object-cover flex-shrink-0"/>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge post={post}/>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 leading-snug">{getTitle(post)}</h3>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
                  {post.members && <span className="flex items-center gap-1"><User size={11}/>{post.members.full_name}</span>}
                  <span className="flex items-center gap-1"><Clock size={11}/>{fmtDate(post.published_at || post.created_at)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <ChevronRight size={16} className={`text-gray-300 dark:text-gray-600 ${ar ? 'rotate-180' : ''}`}/>
                {myMemberId && post.member_id === myMemberId && post.status === 'revision_needed' && (
                  <button
                    onClick={e => { e.stopPropagation(); router.push(`/u/blogs/${post.id}/edit`) }}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                    <Pencil size={10}/>{ar ? 'تعديل' : 'Edit'}
                  </button>
                )}
                {myMemberId && post.member_id === myMemberId && post.status === 'rejected' && (
                  <button
                    onClick={async e => {
                      e.stopPropagation()
                      if (!confirm(ar ? 'هل تريد حذف هذا المقال؟' : 'Delete this article?')) return
                      await fetch(`/api/member/blogs/${post.id}`, { method: 'DELETE' })
                      setPosts(prev => prev.filter(p => p.id !== post.id))
                    }}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                    <Trash2 size={10}/>{ar ? 'حذف' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
