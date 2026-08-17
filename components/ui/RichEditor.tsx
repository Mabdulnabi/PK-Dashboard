'use client'
import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Youtube from '@tiptap/extension-youtube'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Link2, Image as ImageIcon, Video,
  Heading1, Heading2, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Minus, Code,
} from 'lucide-react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  onImageUpload?: (file: File) => Promise<string>
  dir?: 'ltr' | 'rtl'
}

export default function RichEditor({
  value, onChange, placeholder = 'Start writing…',
  minHeight = 300, onImageUpload, dir: initialDir = 'ltr',
}: Props) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const skipSync = useRef(false)
  // Parse direction from saved HTML wrapper if present
  const parseDir = (html: string): 'ltr' | 'rtl' => {
    const m = html.match(/^<div data-dir="(rtl|ltr)">/)
    return m ? (m[1] as 'ltr' | 'rtl') : initialDir
  }
  const stripDir = (html: string) => html.replace(/^<div data-dir="(?:rtl|ltr)">/, '').replace(/<\/div>$/, '')

  const [currentDir, setCurrentDir] = useState<'ltr' | 'rtl'>(() => parseDir(value))

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ allowBase64: false, inline: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'rich-link' } }),
      Youtube.configure({ width: '100%', controls: true, modestBranding: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: stripDir(value),
    editorProps: {
      attributes: {
        class: 'rich-editor-body focus:outline-none',
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      skipSync.current = true
      const html = editor.getHTML()
      onChange(currentDir === 'rtl' ? `<div data-dir="rtl">${html}</div>` : html)
    },
  })

  // Apply direction to the live DOM node — this is what actually fixes lists/bullets
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom as HTMLElement
    dom.dir = currentDir
    dom.style.direction  = currentDir
    dom.style.textAlign  = currentDir === 'rtl' ? 'right' : 'left'
  }, [editor, currentDir])

  // Sync external value changes (e.g. language switch)
  useEffect(() => {
    if (!editor) return
    if (skipSync.current) { skipSync.current = false; return }
    const clean = stripDir(value)
    if (editor.getHTML() !== clean) editor.commands.setContent(clean)
    const d = parseDir(value)
    if (d !== currentDir) setCurrentDir(d)
  }, [value, editor])

  const applyDir = (d: 'ltr' | 'rtl') => {
    setCurrentDir(d)
    if (!editor) return
    const html = editor.getHTML()
    onChange(d === 'rtl' ? `<div data-dir="rtl">${html}</div>` : html)
    editor.chain().focus().run()
  }

  const insertImage = async (file: File) => {
    if (!editor) return
    let url = ''
    if (onImageUpload) {
      try { url = await onImageUpload(file) } catch { return }
    } else {
      url = URL.createObjectURL(file)
    }
    editor.chain().focus().setImage({ src: url }).run()
  }

  const insertVideo = () => {
    const url = prompt('Paste a YouTube URL:')
    if (url && editor) editor.chain().focus().setYoutubeVideo({ src: url }).run()
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (!url || !editor) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  if (!editor) return null

  const Btn = ({ icon, action, active = false, title }: { icon: React.ReactNode; action: () => void; active?: boolean; title: string }) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); action() }}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors flex-shrink-0 text-sm
        ${active
          ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}>
      {icon}
    </button>
  )

  const Sep = () => <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5 flex-shrink-0"/>

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 flex-wrap bg-gray-50 dark:bg-gray-950">
        <Btn icon={<Undo size={13}/>} action={() => editor.chain().focus().undo().run()} title="Undo"/>
        <Btn icon={<Redo size={13}/>} action={() => editor.chain().focus().redo().run()} title="Redo"/>
        <Sep/>
        <Btn icon={<Heading1 size={13}/>} action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"/>
        <Btn icon={<Heading2 size={13}/>} action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"/>
        <Btn icon={<span className="text-[11px] font-semibold">P</span>} action={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph"/>
        <Sep/>
        <Btn icon={<Bold size={13}/>}          action={() => editor.chain().focus().toggleBold().run()}         active={editor.isActive('bold')}      title="Bold"/>
        <Btn icon={<Italic size={13}/>}        action={() => editor.chain().focus().toggleItalic().run()}       active={editor.isActive('italic')}    title="Italic"/>
        <Btn icon={<UnderlineIcon size={13}/>} action={() => editor.chain().focus().toggleUnderline().run()}    active={editor.isActive('underline')} title="Underline"/>
        <Btn icon={<Strikethrough size={13}/>} action={() => editor.chain().focus().toggleStrike().run()}       active={editor.isActive('strike')}    title="Strikethrough"/>
        <Btn icon={<Code size={13}/>}          action={() => editor.chain().focus().toggleCode().run()}         active={editor.isActive('code')}      title="Inline code"/>
        <Sep/>
        <Btn icon={<List size={13}/>}        action={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Bullet list"/>
        <Btn icon={<ListOrdered size={13}/>} action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"/>
        <Sep/>
        <Btn icon={<AlignLeft size={13}/>}   action={() => editor.chain().focus().setTextAlign('left').run()}   active={editor.isActive({ textAlign: 'left' })}   title="Align left"/>
        <Btn icon={<AlignCenter size={13}/>} action={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"/>
        <Btn icon={<AlignRight size={13}/>}  action={() => editor.chain().focus().setTextAlign('right').run()}  active={editor.isActive({ textAlign: 'right' })}  title="Align right"/>
        {/* Direction toggle — next to alignment buttons */}
        <button type="button" title="Right to Left (Arabic/Hebrew)" onMouseDown={e => { e.preventDefault(); applyDir('rtl') }}
          className={`px-2 h-7 flex items-center rounded-md text-[11px] font-bold transition-colors flex-shrink-0
            ${currentDir === 'rtl'
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          RTL
        </button>
        <button type="button" title="Left to Right (English/Latin)" onMouseDown={e => { e.preventDefault(); applyDir('ltr') }}
          className={`px-2 h-7 flex items-center rounded-md text-[11px] font-bold transition-colors flex-shrink-0
            ${currentDir === 'ltr'
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
          LTR
        </button>
        <Sep/>
        <Btn icon={<Minus size={13}/>} action={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"/>
        <Btn icon={<Link2 size={13}/>} action={insertLink}  title="Insert link"/>
        <Btn icon={<Video size={13}/>} action={insertVideo} title="Embed YouTube video"/>
        <label title="Insert image"
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer flex-shrink-0">
          <ImageIcon size={13}/>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = '' }}/>
        </label>
      </div>

      {/* Tiptap content area */}
      <style>{`
        .rich-editor-body { padding: 12px 16px; font-size: 0.875rem; line-height: 1.7; color: inherit; }
        .rich-editor-body p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; float: left; height: 0; }
        .rich-editor-body h1 { font-size: 1.75rem; font-weight: 700; margin: 1rem 0 0.5rem; }
        .rich-editor-body h2 { font-size: 1.35rem; font-weight: 700; margin: 0.75rem 0 0.4rem; }
        .rich-editor-body p  { margin: 0.4rem 0; }
        .rich-editor-body ul { list-style: disc; padding-inline-start: 1.5rem; margin: 0.4rem 0; }
        .rich-editor-body ol { list-style: decimal; padding-inline-start: 1.5rem; margin: 0.4rem 0; }
        .rich-editor-body a.rich-link { color: #d99401; text-decoration: underline; }
        .rich-editor-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
        .rich-editor-body img { max-width: 100%; border-radius: 10px; margin: 8px 0; }
        .rich-editor-body code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; font-size: 0.8em; }
        .rich-editor-body iframe { width: 100%; aspect-ratio: 16/9; border-radius: 12px; border: 0; margin: 0.75rem 0; }
        .dark .rich-editor-body code { background: #1f2937; }
        .dark .rich-editor-body hr { border-top-color: #374151; }
      `}</style>
      <EditorContent editor={editor}/>
    </div>
  )
}
