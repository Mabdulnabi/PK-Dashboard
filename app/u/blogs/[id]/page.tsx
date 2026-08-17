'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { Clock, User, Star, Send, Loader2, ChevronLeft, MessageCircle } from 'lucide-react'

interface Post {
  id: string
  title: string
  title_ar: string | null
  content: string
  content_ar: string | null
  cover_image_url: string | null
  published_at: string
  created_at: string
  status: string
  members: { full_name: string; avatar_url: string | null } | null
}
interface Comment {
  id: string
  content: string
  rating: number | null
  created_at: string
  members: { full_name: string; avatar_url: string | null } | null
}

export default function BlogPostPage({ params }: { params: { id: string } }) {
  const { lang } = useLang()
  const ar = lang === 'ar'
  const router = useRouter()

  const [post, setPost]         = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading]   = useState(true)
  const [comment, setComment]   = useState('')
  const [rating, setRating]     = useState(0)
  const [hovRating, setHovRating] = useState(0)
  const [sending, setSending]   = useState(false)

  const t = (en: string, ar_: string) => ar ? ar_ : en
  const formatDate = (d: string) => new Date(d).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    Promise.all([
      fetch(`/api/member/blogs/${params.id}`).then(r => r.json()),
      fetch(`/api/member/blogs/${params.id}/comments`).then(r => r.json()),
    ]).then(([p, c]) => {
      if (p?.id) setPost(p)
      if (Array.isArray(c)) setComments(c)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [params.id])

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSending(true)
    const res = await fetch(`/api/member/blogs/${params.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment, rating: rating || null }),
    })
    if (res.ok) {
      const c = await res.json()
      setComments(prev => [c, ...prev])
      setComment('')
      setRating(0)
    }
    setSending(false)
  }

  const avgRating = comments.filter(c => c.rating).reduce((a, c) => a + (c.rating || 0), 0) / (comments.filter(c => c.rating).length || 1)

  if (loading) return <div className="p-6"><div className="h-8 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse mb-4 w-2/3"/><div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"/></div>
  if (!post)   return <div className="p-6 text-center text-gray-500">{t('Post not found', 'المقال غير موجود')}</div>

  const title   = ar && post.title_ar   ? post.title_ar   : post.title
  const rawContent = ar && post.content_ar ? post.content_ar : post.content
  const contentDir = rawContent.startsWith('<div data-dir="rtl">') ? 'rtl' : 'ltr'
  const content = rawContent.replace(/^<div data-dir="(?:rtl|ltr)">/, '').replace(/<\/div>$/, '')

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto" dir={ar ? 'rtl' : 'ltr'}>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-purple-600 mb-5">
        <ChevronLeft size={16} className={ar ? 'rotate-180' : ''}/>  {t('Back to Articles', 'العودة للمقالات')}
      </button>

      {post.cover_image_url && (
        <img src={post.cover_image_url} alt="" className="w-full h-52 object-cover rounded-2xl mb-6"/>
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-3">{title}</h1>

      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-2 flex-wrap">
        {post.members && <span className="flex items-center gap-1"><User size={11}/>{post.members.full_name}</span>}
        <span className="flex items-center gap-1"><Clock size={11}/>{formatDate(post.published_at || post.created_at)}</span>
        {comments.filter(c => c.rating).length > 0 && (
          <span className="flex items-center gap-1"><Star size={11} className="text-yellow-400 fill-yellow-400"/>{avgRating.toFixed(1)} ({comments.filter(c => c.rating).length})</span>
        )}
      </div>

      <hr className="border-gray-100 dark:border-gray-800 my-5"/>

      {/* Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
        dir={contentDir}
        style={{ textAlign: contentDir === 'rtl' ? 'right' : 'left' }}
        dangerouslySetInnerHTML={{ __html: content }}/>

      {/* Comments */}
      <div className="mt-10">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageCircle size={16} className="text-purple-500"/>
          {t('Discussion', 'النقاش')} {comments.length > 0 && <span className="text-sm text-gray-400">({comments.length})</span>}
        </h2>

        {/* Comment form */}
        {post.status === 'approved' && (
          <form onSubmit={submitComment} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-1 mb-3">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button"
                  onMouseEnter={() => setHovRating(s)} onMouseLeave={() => setHovRating(0)}
                  onClick={() => setRating(s === rating ? 0 : s)}
                  className="focus:outline-none">
                  <Star size={18} className={`transition-colors ${s <= (hovRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}/>
                </button>
              ))}
              {rating > 0 && <span className="text-xs text-gray-400 ms-1">{rating}/5</span>}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder={t('Share your thoughts…', 'شارك رأيك…')}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30 resize-none mb-3"/>
            <div className={`flex ${ar ? 'justify-start' : 'justify-end'}`}>
              <button type="submit" disabled={sending || !comment.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: '#8b5cf6' }}>
                {sending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                {t('Post Comment', 'نشر التعليق')}
              </button>
            </div>
          </form>
        )}

        {/* Comment list */}
        <div className="space-y-3">
          {comments.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {c.members?.avatar_url ? (
                  <img src={c.members.avatar_url} alt={c.members.full_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0"/>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 text-xs font-bold flex-shrink-0">
                    {c.members?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.members?.full_name}</span>
                {c.rating && (
                  <div className="flex items-center gap-0.5 ms-auto">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={11} className={s <= c.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 dark:text-gray-700'}/>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{c.content}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1.5">{new Date(c.created_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US')}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">{t('No comments yet. Start the conversation!', 'لا توجد تعليقات بعد. ابدأ النقاش!')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
