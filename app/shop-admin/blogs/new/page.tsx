'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RichEditor from '@/components/ui/RichEditor'
import { ImagePlus, Send, Loader2, ChevronLeft } from 'lucide-react'

export default function AdminNewBlogPage() {
  const router = useRouter()

  const [title, setTitle]             = useState('')
  const [titleAr, setTitleAr]         = useState('')
  const [content, setContent]         = useState('')
  const [contentAr, setContentAr]     = useState('')
  const [cover, setCover]             = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [uploading, setUploading]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [editorLang, setEditorLang]   = useState<'en' | 'ar'>('en')

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
    try { const url = await uploadImage(file); setCover(url); setCoverPreview(url) }
    catch { setError('Image upload failed') }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    const res = await fetch('/api/admin/blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, title_ar: titleAr, content, content_ar: contentAr, cover_image_url: cover }),
    })
    const j = await res.json()
    setSaving(false)
    if (!res.ok) { setError(j.error || 'Error'); return }
    router.push('/shop-admin?tab=blogs')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-purple-600 mb-5">
          <ChevronLeft size={16}/> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Blog Post</h1>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            Published immediately
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Cover image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cover Image</label>
            {coverPreview ? (
              <div className="relative rounded-2xl overflow-hidden h-48">
                <img src={coverPreview} alt="" className="w-full h-full object-cover"/>
                <button type="button" onClick={() => { setCover(''); setCoverPreview('') }}
                  className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">Remove</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-purple-400 cursor-pointer transition-colors">
                {uploading ? <Loader2 size={24} className="animate-spin text-purple-500"/> : <><ImagePlus size={24} className="text-gray-400 mb-2"/><span className="text-sm text-gray-400">Click to upload cover</span></>}
                <input type="file" accept="image/*" className="hidden" onChange={handleCover}/>
              </label>
            )}
          </div>

          {/* Titles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title (English)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} dir="ltr" placeholder="Article title…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title (Arabic)</label>
              <input value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl" placeholder="عنوان المقال…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/30"/>
            </div>
          </div>

          {/* Editor lang toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Content:</span>
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
            <p className="text-xs text-gray-400 dark:text-gray-500">Post will be published immediately without review.</p>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm disabled:opacity-60"
              style={{ background: '#10b981' }}>
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
              Publish Now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
