'use client'
import { useRef, useEffect, useCallback } from 'react'
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Link2, Image, Video, Heading1, Heading2, AlignLeft, AlignCenter,
  AlignRight, Undo, Redo, Minus,
} from 'lucide-react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  onImageUpload?: (file: File) => Promise<string>
  dir?: 'ltr' | 'rtl'
}

export default function RichEditor({ value, onChange, placeholder = 'Start writing…', minHeight = 300, onImageUpload, dir = 'ltr' }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const lastHtml  = useRef(value)

  useEffect(() => {
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
      lastHtml.current = value
    }
  }, []) // mount only

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    sync()
  }, [])

  const sync = () => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    if (html !== lastHtml.current) {
      lastHtml.current = html
      onChange(html)
    }
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) exec('createLink', url)
  }

  const insertVideo = () => {
    const url = prompt('Enter YouTube / video URL:')
    if (!url) return
    const ytMatch = url.match(/(?:youtu\.be\/|v=)([\w-]+)/)
    const embed = ytMatch
      ? `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen loading="lazy" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px"></iframe></div>`
      : `<div class="video-wrap"><video src="${url}" controls style="width:100%;border-radius:12px"></video></div>`
    exec('insertHTML', embed)
  }

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    let url = ''
    if (onImageUpload) {
      try { url = await onImageUpload(file) } catch {}
    }
    if (!url) url = URL.createObjectURL(file)
    exec('insertHTML', `<img src="${url}" alt="" style="max-width:100%;border-radius:10px;margin:8px 0"/>`)
    e.target.value = ''
  }

  const btn = (icon: React.ReactNode, cmd: () => void, title: string) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); cmd() }}
      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors flex-shrink-0">
      {icon}
    </button>
  )

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 flex-wrap">
        {btn(<Undo size={13}/>, () => exec('undo'), 'Undo')}
        {btn(<Redo size={13}/>, () => exec('redo'), 'Redo')}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"/>
        {btn(<Heading1 size={13}/>, () => exec('formatBlock', '<h1>'), 'H1')}
        {btn(<Heading2 size={13}/>, () => exec('formatBlock', '<h2>'), 'H2')}
        {btn(<span className="text-[11px] font-bold">P</span>, () => exec('formatBlock', '<p>'), 'Paragraph')}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"/>
        {btn(<Bold size={13}/>, () => exec('bold'), 'Bold')}
        {btn(<Italic size={13}/>, () => exec('italic'), 'Italic')}
        {btn(<Underline size={13}/>, () => exec('underline'), 'Underline')}
        {btn(<Strikethrough size={13}/>, () => exec('strikeThrough'), 'Strikethrough')}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"/>
        {btn(<List size={13}/>, () => exec('insertUnorderedList'), 'Bullet list')}
        {btn(<ListOrdered size={13}/>, () => exec('insertOrderedList'), 'Numbered list')}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"/>
        {btn(<AlignLeft size={13}/>, () => exec('justifyLeft'), 'Align left')}
        {btn(<AlignCenter size={13}/>, () => exec('justifyCenter'), 'Center')}
        {btn(<AlignRight size={13}/>, () => exec('justifyRight'), 'Align right')}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"/>
        {btn(<Minus size={13}/>, () => exec('insertHorizontalRule'), 'Divider')}
        {btn(<Link2 size={13}/>, insertLink, 'Insert link')}
        {btn(<Video size={13}/>, insertVideo, 'Embed video')}
        <label title="Insert image" className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer flex-shrink-0">
          <Image size={13}/>
          <input type="file" accept="image/*" className="hidden" onChange={handleImage}/>
        </label>
      </div>

      {/* Editor area */}
      <style>{`
        .rich-editor { outline: none; }
        .rich-editor:empty:before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; }
        .rich-editor h1 { font-size: 1.75rem; font-weight: 700; margin: 1rem 0 0.5rem; }
        .rich-editor h2 { font-size: 1.35rem; font-weight: 700; margin: 0.75rem 0 0.4rem; }
        .rich-editor p  { margin: 0.4rem 0; }
        .rich-editor ul { list-style: disc; padding-${dir==='rtl'?'right':'left'}: 1.5rem; margin: 0.4rem 0; }
        .rich-editor ol { list-style: decimal; padding-${dir==='rtl'?'right':'left'}: 1.5rem; margin: 0.4rem 0; }
        .rich-editor a  { color: #d99401; text-decoration: underline; }
        .rich-editor hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
        .rich-editor .video-wrap { margin: 0.75rem 0; }
        .rich-editor img { max-width: 100%; }
        .dark .rich-editor hr { border-top-color: #374151; }
      `}</style>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="rich-editor px-4 py-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
        style={{ minHeight, direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left' }}
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
      />
    </div>
  )
}
