'use client'
import { useRef, useState } from 'react'
import { Upload, Trash2, ImageIcon } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  folder?: string
  label?: string
  className?: string
  inputClassName?: string
}

export default function ImageUploadInput({
  value, onChange, folder = 'general', label, className = '', inputClassName = '',
}: Props) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')

  async function handleFile(file: File) {
    setBusy(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setBusy(false)
    if (!res.ok || !data.url) { setError(data.error || 'Upload failed'); return }
    onChange(data.url)
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>}

      {/* Preview */}
      {value && (
        <div className="relative w-full h-28 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 group">
          <img src={value} alt="Preview" className="w-full h-full object-contain"/>
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={11}/>
          </button>
        </div>
      )}

      {/* URL input + upload button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {!value && (
            <ImageIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 pointer-events-none"/>
          )}
          <input
            value={value}
            onChange={e => { setError(''); onChange(e.target.value) }}
            placeholder="https://… أو ارفع صورة"
            dir="ltr"
            className={`w-full text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-red-400 transition-colors py-2 pr-3 ${value ? 'pl-3' : 'pl-7'} ${inputClassName}`}
          />
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-600 dark:text-gray-300 text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0"
        >
          {busy
            ? <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/>
            : <Upload size={12}/>
          }
          {busy ? 'جاري…' : 'رفع'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
