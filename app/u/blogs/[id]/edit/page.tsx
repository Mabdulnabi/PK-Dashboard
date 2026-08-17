'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import RichEditor from '@/components/ui/RichEditor'
import { ImagePlus, Send, Loader2, ChevronLeft } from 'lucide-react'

export default function EditBlogPage({ params }: { params: { id: string } }) {
  const { lang } = useLang()
  const ar = lang === 'ar'
  const router = useRouter()

  const [loading, setLoading]       = useState(true)
  const [title, setTitle]           = useState('')
  const [titleAr, setTitleAr]       = useState('')
  const [content, setContent]       = useState('')
  const [contentAr, setContentAr]   = useState('')
  const [cover, setCover]           = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [editorLang, setEditorLang] = useState<'en' | 'ar'>('en')
  const [adminFeedback, setFeedback] = useState<string | null>(null)

  const t = (en: string, ar_: string) => ar ? ar_ : en

  useEffect(() => {
    fetch(`/api/member/blogs/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (!d?.id) { router.push('/u/blogs'); return }
        setTitle(d.title || '')
        setTitleAr(d.title_ar || '')
        setContent(d.content || '')
        setContentAr(d.content_ar || '')
        setCover(d.cover_image_url || '')
        setCoverPreview(d.cover_image_url || '')
        setFeedback(d.rejection_reason || null)
        setLoading(false)
      })
      .catch(() => router.push('/u/blogs'))
  }, [params.id, router])

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/member/upload', { method: 'POST', body: form })
    const j = await res.json()
    if (!res.ok) throw new Error(j.error)
    return j.url
  }

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setCover(url)
      setCoverPreview(url)
    } catch { setError('Image upload failed') }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError(t('Title is required', 'العنوان مطلوب')); return }
    setSaving(true)
    const res = await fetch(`/api/member/blogs/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, title_ar: titleAr, content, content_ar: contentAr, cover_image_url: cover }),
    })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) { setError(j.error || 'Error'); return }
    window.dispatchEvent(new CustomEvent('blogs-reload'))
    router.push('/u/blogs')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-purple-500"/>
    </div>
  )

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto" dir={ar ? 'rtl' : 'ltr'}>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 mb-4">
        <ChevronLeft size={16} className={ar ? 'rotate-180' : ''}/> {t('Back', 'رجوع')}
      </button>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('Edit Article', 'تعديل المقال')}</h1>

      {adminFeedback && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/10 text-sm text-blue-700 dark:text-blue-300">
          <span className="font-semibold">{t('Admin feedback: ', 'ملاحظة الأدمن: ')}</span>{adminFeedback}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cover image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('Cover Image', 'صورة الغلاف')}</label>
          {coverPreview ? (
            <div className="relative rounded-2xl overflow-hidden h-48">
              <img src={coverPreview} alt="" className="w-full h-full object-cover"/>
              <button type="button" onClick={() => { setCover(''); setCoverPreview('') }}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">{t('Remove', 'حذف')}</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 cursor-pointer transition-colors">
              {uploading ? <Loader2 size={24} className="animate-spin text-purple-500"/> : <><ImagePlus size={24} className="text-gray-400 mb-2"/><span className="text-sm text-gray-400">{t('Click to upload cover', 'اضغط لرفع الغلاف')}</span></>}
              <input type="file" accept="image/*" className="hidden" onChange={handleCover}/>
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('Title (English)', 'العنوان (إنجليزي)')}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} dir="ltr" placeholder="Article title…"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('Title (Arabic)', 'العنوان (عربي)')}</label>
            <input value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl" placeholder="عنوان المقال…"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"/>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('Content:', 'المحتوى:')}</span>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['en', 'ar'] as const).map(l => (
              <button key={l} type="button" onClick={() => setEditorLang(l)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${editorLang === l ? 'bg-purple-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {l === 'en' ? 'English' : 'عربي'}
              </button>
            ))}
          </div>
        </div>

        {editorLang === 'en' ? (
          <RichEditor value={content} onChange={setContent} placeholder="Write your article in English…" minHeight={280} onImageUpload={uploadImage} dir="ltr"/>
        ) : (
          <RichEditor value={contentAr} onChange={setContentAr} placeholder="اكتب مقالك بالعربية…" minHeight={280} onImageUpload={uploadImage} dir="rtl"/>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('Your article will be reviewed before publishing.', 'سيتم مراجعة مقالك قبل النشر.')}</p>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm disabled:opacity-60"
            style={{ background: '#8b5cf6' }}>
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
            {t('Resubmit for Review', 'إعادة إرسال للمراجعة')}
          </button>
        </div>
      </form>
    </div>
  )
}
