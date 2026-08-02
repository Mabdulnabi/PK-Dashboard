'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Search, Plus, Trash2, Check, Settings, RotateCcw, Play, Pause,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ArrowLeft, FileText, BookOpen, X, Calendar, AlarmClock, ChevronDown,
  ALargeSmall, Highlighter, Palette,
} from 'lucide-react'

// ─── Search engines ────────────────────────────────────────────────────────────
const ENGINES = [
  { id:'google',     label:'Google',     color:'#4285F4', bg:'#4285F415',
    url:'https://www.google.com/search?q=',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> },
  { id:'youtube',    label:'YouTube',    color:'#FF0000', bg:'#FF000015',
    url:'https://www.youtube.com/results?search_query=',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><path fill="#FF0000" d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.56 3.5 12 3.5 12 3.5s-7.56 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14C4.44 20.5 12 20.5 12 20.5s7.56 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81z"/><path fill="#fff" d="M9.75 15.02V8.98L15.5 12z"/></svg> },
  { id:'chatgpt',    label:'ChatGPT',    color:'#10a37f', bg:'#10a37f15',
    url:'https://chatgpt.com/?q=',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#10a37f"><path d="M22.28 9.22a5.86 5.86 0 0 0-.5-4.8 6 6 0 0 0-6.44-2.87 5.86 5.86 0 0 0-4.41-2A5.98 5.98 0 0 0 5.2 3.38a5.87 5.87 0 0 0-3.93 2.84 5.99 5.99 0 0 0 .74 7.03 5.86 5.86 0 0 0 .5 4.8 6 6 0 0 0 6.44 2.87 5.87 5.87 0 0 0 4.41 1.99 5.98 5.98 0 0 0 5.73-4.14 5.87 5.87 0 0 0 3.93-2.84 5.99 5.99 0 0 0-.74-7.71zm-8.9 12.48a4.44 4.44 0 0 1-2.85-1.02l.14-.08 4.73-2.73a.78.78 0 0 0 .4-.68v-6.67l2 1.16a.07.07 0 0 1 .04.05v5.52a4.47 4.47 0 0 1-4.46 4.45zM3.42 17.7a4.45 4.45 0 0 1-.53-2.99l.14.08 4.73 2.73a.78.78 0 0 0 .78 0l5.78-3.34v2.31a.08.08 0 0 1-.03.06l-4.79 2.76a4.47 4.47 0 0 1-6.08-1.61zm-1.17-10.3a4.44 4.44 0 0 1 2.33-1.96v5.62a.78.78 0 0 0 .39.67l5.76 3.33-2 1.15a.08.08 0 0 1-.07 0L3.86 13.5a4.47 4.47 0 0 1-1.61-6.1zm16.44 3.83-5.78-3.34 2-1.15a.08.08 0 0 1 .07 0l4.8 2.77a4.47 4.47 0 0 1-.69 8.06v-5.62a.78.78 0 0 0-.4-.72zm1.99-3.01-.14-.08-4.73-2.73a.78.78 0 0 0-.78 0L9.25 8.74V6.43a.08.08 0 0 1 .03-.06l4.79-2.76a4.47 4.47 0 0 1 6.61 4.62zm-12.54 4.13-2-1.15a.07.07 0 0 1-.04-.05V5.63a4.47 4.47 0 0 1 7.33-3.43l-.14.08-4.73 2.73a.78.78 0 0 0-.4.68l-.02 6.66zm1.09-2.34 2.57-1.48 2.57 1.48v2.96l-2.57 1.48-2.57-1.48V9.99z"/></svg> },
  { id:'claude',     label:'Claude',     color:'#cc785c', bg:'#cc785c15',
    url:'https://claude.ai/new?q=',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#cc785c"><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.222-4.72-2.647v-1.087l6.025 3.38v1.155L4.709 17.04v-1.085zm5.73 2.617L8.434 19.8l-5.024-8.69 1.005-.58 6.024 8.042zm3.573-10.272L12.003 7l-5.024 8.69 1.005.58 6.028-8.97zM14.29 8.045l4.72 2.647.08.222-.08.23-4.72 2.647v1.087l6.025-3.38v-1.155L14.29 6.96v1.085zm-5.73-2.617L10.566 4.2l5.024 8.69-1.005.58-6.025-8.042zm3.573 10.272L14.007 17l5.024-8.69-1.005-.58-6.028 8.97z"/></svg> },
  { id:'perplexity', label:'Perplexity', color:'#20b2aa', bg:'#20b2aa15',
    url:'https://www.perplexity.ai/search?q=',
    icon: <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#20b2aa"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
]

// ─── Pomodoro (horizontal) ─────────────────────────────────────────────────────
const MODES = {
  work:  { label:'Focus',       color:'#06b6d4', defaultMin:25 },
  short: { label:'Short Break', color:'#10b981', defaultMin:5  },
  long:  { label:'Long Break',  color:'#8b5cf6', defaultMin:15 },
}
type PMode = keyof typeof MODES

function PomodoroStrip() {
  const [cfg, setCfg]         = useState({ work:25, short:5, long:15, sessionsBeforeLong:4, autoBreak:true, autoWork:false })
  const [mode, setMode]       = useState<PMode>('work')
  const [secs, setSecs]       = useState(25*60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [showCfg, setShowCfg] = useState(false)
  const [draft, setDraft]     = useState({...cfg})
  const ivRef  = useRef<NodeJS.Timeout|null>(null)
  const actxRef = useRef<AudioContext|null>(null)

  const total = (m: PMode) => cfg[m] * 60

  const beep = useCallback(() => {
    try {
      if (!actxRef.current) actxRef.current = new AudioContext()
      const ctx = actxRef.current
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.frequency.value = 880
      g.gain.setValueAtTime(0.3, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start(); osc.stop(ctx.currentTime + 0.8)
    } catch {}
  }, [])

  const switchMode = useCallback((m: PMode) => { setMode(m); setSecs(cfg[m]*60); setRunning(false) }, [cfg])

  const onFinish = useCallback(() => {
    beep()
    if (mode === 'work') {
      const s = sessions + 1; setSessions(s)
      const next: PMode = s % cfg.sessionsBeforeLong === 0 ? 'long' : 'short'
      if (cfg.autoBreak) { setMode(next); setSecs(total(next)); setRunning(true) } else switchMode(next)
    } else {
      if (cfg.autoWork) { setMode('work'); setSecs(total('work')); setRunning(true) } else switchMode('work')
    }
  }, [mode, sessions, cfg, beep, switchMode])

  useEffect(() => {
    if (running) ivRef.current = setInterval(() => setSecs(s => { if (s<=1){ clearInterval(ivRef.current!); onFinish(); return 0 } return s-1 }), 1000)
    else clearInterval(ivRef.current!)
    return () => clearInterval(ivRef.current!)
  }, [running, onFinish])

  const reset = () => { setRunning(false); setSecs(cfg[mode]*60) }
  const mm = String(Math.floor(secs/60)).padStart(2,'0')
  const ss = String(secs%60).padStart(2,'0')
  const progress = (total(mode) - secs) / total(mode)
  const m = MODES[mode]

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full transition-all duration-1000" style={{width:`${progress*100}%`, background: m.color}}/>
      </div>
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl flex-shrink-0">
          {(Object.keys(MODES) as PMode[]).map(k => (
            <button key={k} onClick={() => switchMode(k)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${mode===k?'text-white shadow-sm':'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              style={mode===k?{background:MODES[k].color}:{}}>
              {MODES[k].label}
            </button>
          ))}
        </div>

        {/* Timer */}
        <div className="text-3xl font-black tabular-nums tracking-tight flex-shrink-0" style={{color: m.color}}>{mm}:{ss}</div>

        <div className="flex-1 hidden sm:block"/>

        {/* Session dots */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {Array.from({length: cfg.sessionsBeforeLong}).map((_,i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all"
              style={{background: i < sessions % cfg.sessionsBeforeLong ? m.color : '#e5e7eb'}}/>
          ))}
          <span className="text-xs text-gray-400 ml-1">{sessions}s</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={reset} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <RotateCcw size={13}/>
          </button>
          <button onClick={() => setRunning(r=>!r)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all active:scale-95"
            style={{background: m.color, boxShadow:`0 4px 16px ${m.color}44`}}>
            {running ? <Pause size={16} fill="white"/> : <Play size={16} fill="white"/>}
          </button>
          <button onClick={() => { setDraft({...cfg}); setShowCfg(true) }}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Settings size={13}/>
          </button>
        </div>
      </div>

      {/* Settings modal */}
      {showCfg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowCfg(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">Timer Settings</span>
              <button onClick={()=>setShowCfg(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {([['Work Duration (minutes)','work'],['Break Duration (minutes)','short'],['Long Break Duration (minutes)','long'],['Sessions Before Long Break','sessionsBeforeLong']] as [string, keyof typeof draft][]).map(([label,key])=>(
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{label}</label>
                  <input type="number" min={1} max={key==='sessionsBeforeLong'?10:120}
                    value={draft[key] as number}
                    onChange={e=>setDraft(d=>({...d,[key]:parseInt(e.target.value)||1}))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors tabular-nums"/>
                </div>
              ))}
              <div className="col-span-2 space-y-3">
                {([['Auto-start Breaks','autoBreak'],['Auto-start Work Sessions','autoWork']] as [string,'autoBreak'|'autoWork'][]).map(([label,key])=>(
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    <div onClick={()=>setDraft(d=>({...d,[key]:!d[key]}))}
                      className={`w-10 h-5 rounded-full transition-colors relative ${draft[key]?'bg-cyan-500':'bg-gray-300 dark:bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${draft[key]?'translate-x-5':'translate-x-0.5'}`}/>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button onClick={()=>{ setCfg({...draft}); setSecs(draft[mode]*60); setRunning(false); setShowCfg(false) }}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#06b6d4'}}>
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Notes ─────────────────────────────────────────────────────────────────────
interface Note { id:string; title:string; content:string; updated_at:string }

const FONT_SIZES = ['12px','14px','16px','18px','20px','24px','28px','32px']

function NotesPanel() {
  const [notes, setNotes]     = useState<Note[]>([])
  const [view, setView]       = useState<'list'|'edit'>('list')
  const [activeId, setActiveId] = useState<string|null>(null)
  const [title, setTitle]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [fontSize, setFontSize] = useState('16px')
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<NodeJS.Timeout|null>(null)

  useEffect(() => {
    fetch('/api/member/focus-notes').then(r=>r.json()).then(d=>setNotes(d.notes||[]))
  }, [])

  const newNote = async () => {
    const res = await fetch('/api/member/focus-notes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:'Untitled Note',content:''}) })
    const d = await res.json()
    if (d.note) { setNotes(n=>[d.note,...n]); openNote(d.note) }
  }

  const openNote = (note: Note) => {
    setActiveId(note.id); setTitle(note.title); setView('edit')
    setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = note.content }, 50)
  }

  const triggerSave = () => {
    if (!activeId) return
    clearTimeout(saveTimer.current!)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const content = editorRef.current?.innerHTML || ''
      await fetch('/api/member/focus-notes', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:activeId, title, content }) })
      setNotes(ns=>ns.map(n=>n.id===activeId?{...n,title,content,updated_at:new Date().toISOString()}:n))
      setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2000)
    }, 700)
  }

  const deleteNote = async (id:string, e:React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/member/focus-notes?id=${id}`, { method:'DELETE' })
    setNotes(n=>n.filter(x=>x.id!==id))
    if (activeId===id) { setView('list'); setActiveId(null) }
  }

  const cmd = (command: string, val?: string) => {
    editorRef.current?.focus(); document.execCommand(command, false, val); triggerSave()
  }

  const applyFontSize = (size: string) => {
    setFontSize(size)
    editorRef.current?.focus()
    document.execCommand('fontSize', false, '7')
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el => {
      const span = document.createElement('span')
      span.style.fontSize = size
      while (el.firstChild) span.appendChild(el.firstChild)
      el.parentNode?.replaceChild(span, el)
    })
    triggerSave()
  }

  const textColor  = useRef<HTMLInputElement>(null)
  const hlColor    = useRef<HTMLInputElement>(null)

  const activeNote = notes.find(n=>n.id===activeId)

  const stripHtml = (html: string) => {
    const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden h-full" style={{minHeight:480}}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          {view==='edit' && (
            <button onClick={()=>setView('list')} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1">
              <ArrowLeft size={13}/>
            </button>
          )}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#d9940110'}}>
            <BookOpen size={14} style={{color:'#d99401'}}/>
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Notes</span>
          {view==='list' && <span className="text-xs text-gray-400">{notes.length}</span>}
          {view==='edit' && saving && <span className="text-[10px] text-gray-400 animate-pulse">Saving…</span>}
          {view==='edit' && saved  && <span className="text-[10px] text-emerald-500">Saved ✓</span>}
        </div>
        <button onClick={newNote}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-colors"
          style={{background:'#d99401'}}>
          <Plus size={11}/> New
        </button>
      </div>

      {/* List view */}
      {view==='list' && (
        <div className="flex-1 overflow-y-auto">
          {notes.length===0
            ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FileText size={20} className="text-gray-300"/>
                </div>
                <p className="text-sm text-gray-400">No notes yet. Click + New to start.</p>
              </div>
            )
            : notes.map(note => (
              <button key={note.id} onClick={()=>openNote(note)}
                className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors group relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{note.title||'Untitled'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{stripHtml(note.content).slice(0,60)||'No content'}</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">{new Date(note.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}</p>
                  </div>
                  <button onClick={e=>deleteNote(note.id,e)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0 mt-0.5">
                    <Trash2 size={11}/>
                  </button>
                </div>
              </button>
            ))
          }
        </div>
      )}

      {/* Edit view */}
      {view==='edit' && (
        <>
          {/* Rich toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 flex-wrap flex-shrink-0 bg-gray-50 dark:bg-gray-800/40">
            {/* Style */}
            {[{icon:Bold,c:'bold'},{icon:Italic,c:'italic'},{icon:Underline,c:'underline'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}}
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                <Icon size={12}/>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            {/* Alignment */}
            {[{icon:AlignLeft,c:'justifyLeft'},{icon:AlignCenter,c:'justifyCenter'},{icon:AlignRight,c:'justifyRight'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}}
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Icon size={12}/>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            {/* Lists */}
            {[{icon:List,c:'insertUnorderedList'},{icon:ListOrdered,c:'insertOrderedList'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}}
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Icon size={12}/>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            {/* Font size */}
            <div className="relative">
              <select value={fontSize} onChange={e=>applyFontSize(e.target.value)}
                className="h-7 px-1 pr-5 rounded-md text-xs bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 outline-none focus:border-amber-400 appearance-none cursor-pointer">
                {FONT_SIZES.map(s=><option key={s} value={s}>{parseInt(s)}</option>)}
              </select>
              <ChevronDown size={9} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            {/* Text color */}
            <label className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer relative" title="Text color">
              <Palette size={12}/>
              <input ref={textColor} type="color" defaultValue="#000000"
                onChange={e=>cmd('foreColor',e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
            </label>
            {/* Highlight */}
            <label className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer relative" title="Highlight">
              <Highlighter size={12}/>
              <input ref={hlColor} type="color" defaultValue="#fef08a"
                onChange={e=>cmd('backColor',e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
            </label>
          </div>

          {/* Title */}
          <input value={title} onChange={e=>{setTitle(e.target.value);triggerSave()}}
            placeholder="Note title…"
            className="px-4 pt-3 pb-1 text-base font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 flex-shrink-0"/>

          {/* Content */}
          <div ref={editorRef} contentEditable suppressContentEditableWarning
            onInput={triggerSave}
            className="flex-1 px-4 py-2 outline-none text-sm text-gray-700 dark:text-gray-300 overflow-y-auto leading-relaxed"
            data-placeholder="Start writing…"
          />
        </>
      )}
    </div>
  )
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────
interface Task { id:string; title:string; deadline:string|null; priority:'low'|'medium'|'high'; done:boolean; created_at:string; remind_at:string|null }
const PC = { low:'#10b981', medium:'#f59e0b', high:'#ef4444' }
const PL = { low:'Low', medium:'Med', high:'High' }

function TasksPanel() {
  const [tasks, setTasks]     = useState<Task[]>([])
  const [filter, setFilter]   = useState<'all'|'active'|'completed'>('all')
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({ title:'', deadline:'', priority:'medium' as 'low'|'medium'|'high', remind_at:'' })

  useEffect(() => {
    fetch('/api/member/focus-tasks').then(r=>r.json()).then(d=>setTasks(d.tasks||[]))
  }, [])

  const addTask = async () => {
    if (!form.title.trim()) return
    setAdding(true)
    const res = await fetch('/api/member/focus-tasks', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:form.title, deadline:form.deadline||null, priority:form.priority, remind_at:form.remind_at||null }) })
    const d = await res.json()
    if (d.task) { setTasks(t=>[d.task,...t]); setForm({title:'',deadline:'',priority:'medium',remind_at:''}); setShowForm(false) }
    setAdding(false)
  }

  const toggleDone = async (task: Task) => {
    setTasks(ts=>ts.map(t=>t.id===task.id?{...t,done:!t.done}:t))
    await fetch('/api/member/focus-tasks', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:task.id,done:!task.done}) })
  }

  const deleteTask = async (id:string) => {
    setTasks(ts=>ts.filter(t=>t.id!==id))
    await fetch(`/api/member/focus-tasks?id=${id}`, { method:'DELETE' })
  }

  const visible = tasks.filter(t => filter==='all'?true:filter==='active'?!t.done:t.done)
  const isOverdue = (t:Task) => !t.done && t.deadline && new Date(t.deadline) < new Date()
  const hasReminder = (t:Task) => !!t.remind_at

  const fmtRemind = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden h-full" style={{minHeight:480}}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#8b5cf610'}}>
            <Check size={14} style={{color:'#8b5cf6'}}/>
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Tasks</span>
          <span className="text-xs text-gray-400">{tasks.filter(t=>!t.done).length} active</span>
        </div>
        <button onClick={()=>setShowForm(f=>!f)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
          style={{background:'#8b5cf6'}}>
          <Plus size={11}/> Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-2 flex-shrink-0">
          <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
            onKeyDown={e=>e.key==='Enter'&&addTask()}
            placeholder="Task title…" autoFocus
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors placeholder-gray-400"/>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400"/>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Priority</label>
              <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value as any}))}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 font-semibold">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          {/* Reminder */}
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1 flex items-center gap-1">
              <AlarmClock size={9}/> Alarm / Reminder
            </label>
            <input type="datetime-local" value={form.remind_at} onChange={e=>setForm(f=>({...f,remind_at:e.target.value}))}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 transition-colors"/>
            <p className="text-[10px] text-gray-400 mt-1">Will notify you anywhere on the site at this time</p>
          </div>
          <div className="flex gap-2 pt-0.5">
            <button onClick={addTask} disabled={adding||!form.title.trim()}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{background:'#8b5cf6'}}>
              {adding?'Adding…':'Add Task'}
            </button>
            <button onClick={()=>setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        {(['all','active','completed'] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${filter===f?'text-white':'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            style={filter===f?{background:'#8b5cf6'}:{}}>
            {f}
            <span className="ml-1 opacity-60 text-[10px]">
              {f==='all'?tasks.length:f==='active'?tasks.filter(t=>!t.done).length:tasks.filter(t=>t.done).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {visible.length===0
          ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Check size={18} className="text-gray-300"/>
              </div>
              <p className="text-sm text-gray-400">{filter==='completed'?'No completed tasks yet':'All clear!'}</p>
            </div>
          )
          : visible.map(task => (
            <div key={task.id}
              className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${task.done?'opacity-55':''}`}>
              <button onClick={()=>toggleDone(task)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${task.done?'border-transparent':'border-gray-300 dark:border-gray-600 hover:border-violet-400'}`}
                style={task.done?{background:'#8b5cf6',border:'2px solid #8b5cf6'}:{}}>
                {task.done&&<Check size={9} className="text-white" strokeWidth={3}/>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-gray-800 dark:text-gray-200 leading-snug ${task.done?'line-through text-gray-400 dark:text-gray-500':''}`}>{task.title}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{background:PC[task.priority]+'20',color:PC[task.priority]}}>
                    {PL[task.priority]}
                  </span>
                  {task.deadline && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${isOverdue(task)?'text-red-500':'text-gray-400'}`}>
                      <Calendar size={9}/>{new Date(task.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                      {isOverdue(task)&&' · Overdue'}
                    </span>
                  )}
                  {task.remind_at && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-500">
                      <AlarmClock size={9}/>{fmtRemind(task.remind_at)}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={()=>deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0 mt-0.5">
                <Trash2 size={11}/>
              </button>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── Search bar ────────────────────────────────────────────────────────────────
function SearchBar() {
  const [engine, setEngine]   = useState(ENGINES[0])
  const [query, setQuery]     = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const go = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return
    window.open(engine.url + encodeURIComponent(query.trim()), '_blank', 'noopener')
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Engine pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {ENGINES.map(e => (
          <button key={e.id} onClick={()=>{ setEngine(e); inputRef.current?.focus() }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${engine.id===e.id?'border-transparent text-white':'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'}`}
            style={engine.id===e.id?{background:e.color,boxShadow:`0 2px 8px ${e.color}33`}:{}}>
            {e.icon}
            {e.label}
          </button>
        ))}
      </div>
      {/* Input */}
      <form onSubmit={go} className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0">{engine.icon}</div>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder={`Search on ${engine.label}…`}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none transition-colors shadow-sm"
            style={{borderColor: query ? engine.color+'88' : undefined}}
            onFocus={e=>e.target.style.borderColor=engine.color+'88'}
            onBlur={e=>e.target.style.borderColor=''}
          />
        </div>
        <button type="submit"
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all active:scale-95"
          style={{background:engine.color, boxShadow:`0 2px 10px ${engine.color}44`}}>
          Search
        </button>
      </form>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AcademicWorkspacePage() {
  return (
    <div className="min-h-full p-4 md:p-5 flex flex-col gap-4">
      {/* Header + Search */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Academic Workspace</h1>
          <p className="text-sm text-gray-400 mt-0.5">Focus. Write. Track. Repeat.</p>
        </div>
        <div className="flex-1 lg:max-w-2xl">
          <SearchBar/>
        </div>
      </div>

      {/* Pomodoro strip */}
      <PomodoroStrip/>

      {/* Notes + Tasks 50/50 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <NotesPanel/>
        <TasksPanel/>
      </div>
    </div>
  )
}
