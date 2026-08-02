'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Search, Plus, Trash2, Check, ChevronDown, Settings, RotateCcw,
  Play, Pause, Bold, Italic, Underline, List, ListOrdered, FileText,
  BookOpen, X, Flag, Calendar, Clock, AlarmClock
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Note { id: string; title: string; content: string; updated_at: string }
interface Task { id: string; title: string; deadline: string | null; priority: 'low' | 'medium' | 'high'; done: boolean; created_at: string }

// ─── Pomodoro ─────────────────────────────────────────────────────────────────
function PomodoroPanel() {
  const MODES = {
    work:       { label: 'Focus',       labelAr: 'تركيز',      color: '#06b6d4', defaultMin: 25 },
    short:      { label: 'Short Break', labelAr: 'استراحة',    color: '#10b981', defaultMin: 5  },
    long:       { label: 'Long Break',  labelAr: 'استراحة طويلة', color: '#8b5cf6', defaultMin: 15 },
  }

  const [settings, setSettings] = useState({ work: 25, short: 5, long: 15, sessionsBeforeLong: 4, autoBreak: true, autoWork: false })
  const [mode, setMode] = useState<'work'|'short'|'long'>('work')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [draft, setDraft] = useState({ ...settings })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const totalSeconds = (m: typeof mode) =>
    m === 'work' ? settings.work * 60 : m === 'short' ? settings.short * 60 : settings.long * 60

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start(); osc.stop(ctx.currentTime + 0.8)
    } catch {}
  }, [])

  const switchMode = useCallback((next: 'work'|'short'|'long') => {
    setMode(next); setSeconds(totalSeconds(next)); setRunning(false)
  }, [settings])

  const handleFinish = useCallback(() => {
    playBeep()
    if (mode === 'work') {
      const newSessions = sessions + 1
      setSessions(newSessions)
      const nextMode = newSessions % settings.sessionsBeforeLong === 0 ? 'long' : 'short'
      if (settings.autoBreak) { setMode(nextMode); setSeconds(totalSeconds(nextMode)); setRunning(true) }
      else switchMode(nextMode)
    } else {
      if (settings.autoWork) { setMode('work'); setSeconds(totalSeconds('work')); setRunning(true) }
      else switchMode('work')
    }
  }, [mode, sessions, settings, playBeep, switchMode])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { clearInterval(intervalRef.current!); handleFinish(); return 0 }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current!)
    }
    return () => clearInterval(intervalRef.current!)
  }, [running, handleFinish])

  const reset = () => { setRunning(false); setSeconds(totalSeconds(mode)) }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const total = totalSeconds(mode)
  const progress = (total - seconds) / total
  const r = 80; const circ = 2 * Math.PI * r
  const modeData = MODES[mode]

  const applySettings = () => {
    setSettings({ ...draft })
    setSeconds(draft[mode] * 60)
    setRunning(false)
    setShowSettings(false)
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col gap-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#06b6d410'}}>
            <AlarmClock size={14} style={{color:'#06b6d4'}}/>
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Pomodoro Timer</span>
        </div>
        <button onClick={() => { setDraft({...settings}); setShowSettings(true) }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Settings size={14}/>
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {(Object.keys(MODES) as Array<keyof typeof MODES>).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode===m ? 'text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            style={mode===m ? {background: MODES[m].color} : {}}>
            {MODES[m].label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative" style={{width:196, height:196}}>
          <svg width={196} height={196} viewBox="0 0 196 196">
            <circle cx={98} cy={98} r={r} fill="none" stroke="currentColor" strokeWidth={10}
              className="text-gray-100 dark:text-gray-800"/>
            <circle cx={98} cy={98} r={r} fill="none" strokeWidth={10}
              stroke={modeData.color}
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 98 98)"
              style={{transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease'}}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black tracking-tight text-gray-900 dark:text-white tabular-nums">{mm}:{ss}</span>
            <span className="text-xs font-semibold mt-1" style={{color: modeData.color}}>{modeData.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={reset}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <RotateCcw size={15}/>
          </button>
          <button onClick={() => setRunning(r => !r)}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all active:scale-95"
            style={{background: `linear-gradient(135deg, ${modeData.color}, ${modeData.color}bb)`, boxShadow:`0 8px 24px ${modeData.color}44`}}>
            {running ? <Pause size={24} fill="white"/> : <Play size={24} fill="white"/>}
          </button>
          <div className="w-10 h-10 flex flex-col items-center justify-center gap-0.5">
            {Array.from({length: Math.min(settings.sessionsBeforeLong, 8)}).map((_,i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                style={{background: i < (sessions % settings.sessionsBeforeLong || (sessions>0 && sessions%settings.sessionsBeforeLong===0 ? settings.sessionsBeforeLong : 0)) ? modeData.color : '#e5e7eb'}}/>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400">{sessions} session{sessions!==1?'s':''} completed today</p>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">Timer Settings</span>
              <button onClick={() => setShowSettings(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={14}/>
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {([
                ['Work Duration (minutes)', 'work'],
                ['Break Duration (minutes)', 'short'],
                ['Long Break Duration (minutes)', 'long'],
                ['Sessions Before Long Break', 'sessionsBeforeLong'],
              ] as [string, keyof typeof draft][]).map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{label}</label>
                  <input type="number" min={1} max={key==='sessionsBeforeLong'?10:120}
                    value={draft[key]}
                    onChange={e => setDraft(d => ({...d, [key]: parseInt(e.target.value)||1}))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors tabular-nums"/>
                </div>
              ))}
              <div className="col-span-2 flex flex-col gap-3 pt-1">
                {([['Auto-start Breaks', 'autoBreak'], ['Auto-start Work Sessions', 'autoWork']] as [string, 'autoBreak'|'autoWork'][]).map(([label, key]) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    <div onClick={() => setDraft(d => ({...d, [key]: !d[key]}))}
                      className={`w-10 h-5 rounded-full transition-colors relative ${draft[key] ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${draft[key] ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button onClick={applySettings}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                style={{background:'#06b6d4'}}>
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Notes ────────────────────────────────────────────────────────────────────
function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/member/focus-notes').then(r => r.json()).then(d => {
      setNotes(d.notes || [])
    })
  }, [])

  const newNote = async () => {
    const res = await fetch('/api/member/focus-notes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title: 'Untitled Note', content: '' }) })
    const d = await res.json()
    if (d.note) {
      setNotes(n => [d.note, ...n])
      openNote(d.note)
    }
  }

  const openNote = (note: Note) => {
    setActiveId(note.id); setTitle(note.title)
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = note.content
    }, 50)
  }

  const triggerSave = () => {
    if (!activeId) return
    clearTimeout(saveTimer.current!)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const content = editorRef.current?.innerHTML || ''
      await fetch('/api/member/focus-notes', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: activeId, title, content }) })
      setNotes(ns => ns.map(n => n.id === activeId ? { ...n, title, content, updated_at: new Date().toISOString() } : n))
      setSaving(false); setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 800)
  }

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/member/focus-notes?id=${id}`, { method: 'DELETE' })
    setNotes(n => n.filter(x => x.id !== id))
    if (activeId === id) { setActiveId(null); setTitle(''); if (editorRef.current) editorRef.current.innerHTML = '' }
  }

  const execCmd = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    triggerSave()
  }

  const active = notes.find(n => n.id === activeId)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col shadow-sm overflow-hidden" style={{minHeight: 520}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#d9940110'}}>
            <BookOpen size={14} style={{color:'#d99401'}}/>
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Notes</span>
          <span className="text-xs text-gray-400">{notes.length} note{notes.length!==1?'s':''}</span>
        </div>
        <button onClick={newNote}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-colors"
          style={{background:'#d99401'}}>
          <Plus size={12}/> New
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Note list sidebar */}
        <div className="w-44 flex-shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto">
          {notes.length === 0
            ? <p className="text-xs text-gray-400 text-center mt-8 px-3">No notes yet.<br/>Click + New to start.</p>
            : notes.map(n => (
              <button key={n.id} onClick={() => openNote(n)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group relative ${activeId===n.id ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                <p className={`text-xs font-semibold truncate ${activeId===n.id ? '' : 'text-gray-700 dark:text-gray-300'}`}
                  style={activeId===n.id ? {color:'#d99401'} : {}}>{n.title || 'Untitled'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(n.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
                <button onClick={e => deleteNote(n.id, e)}
                  className="absolute right-1.5 top-2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
                  <Trash2 size={10}/>
                </button>
              </button>
            ))
          }
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeId
            ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FileText size={20} className="text-gray-400"/>
                </div>
                <p className="text-sm text-gray-400">Select a note or create a new one</p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex-wrap">
                  {[
                    { icon: Bold,         cmd: 'bold',               title: 'Bold' },
                    { icon: Italic,       cmd: 'italic',             title: 'Italic' },
                    { icon: Underline,    cmd: 'underline',          title: 'Underline' },
                    { icon: List,         cmd: 'insertUnorderedList', title: 'Bullet List' },
                    { icon: ListOrdered,  cmd: 'insertOrderedList',  title: 'Numbered List' },
                  ].map(({ icon: Icon, cmd, title }) => (
                    <button key={cmd} title={title} onMouseDown={e => { e.preventDefault(); execCmd(cmd) }}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                      <Icon size={13}/>
                    </button>
                  ))}
                  <div className="flex-1"/>
                  {saving && <span className="text-[10px] text-gray-400 animate-pulse">Saving…</span>}
                  {saved  && <span className="text-[10px] text-emerald-500">Saved ✓</span>}
                </div>

                {/* Title */}
                <input value={title} onChange={e => { setTitle(e.target.value); triggerSave() }}
                  placeholder="Note title…"
                  className="px-4 pt-3 pb-1 text-base font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700"/>

                {/* Content */}
                <div ref={editorRef} contentEditable suppressContentEditableWarning
                  onInput={triggerSave}
                  className="flex-1 px-4 py-2 outline-none text-sm text-gray-700 dark:text-gray-300 overflow-y-auto leading-relaxed"
                  style={{minHeight: 200}}
                  data-placeholder="Start writing…"
                />
              </>
            )
          }
        </div>
      </div>
    </div>
  )
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
const PRIORITY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' }
const PRIORITY_LABELS = { low: 'Low', medium: 'Med', high: 'High' }

function TasksPanel() {
  const [tasks, setTasks]   = useState<Task[]>([])
  const [filter, setFilter] = useState<'all'|'active'|'completed'>('all')
  const [newTitle, setNewTitle]       = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newPriority, setNewPriority] = useState<'low'|'medium'|'high'>('medium')
  const [adding, setAdding]   = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch('/api/member/focus-tasks').then(r => r.json()).then(d => setTasks(d.tasks || []))
  }, [])

  const addTask = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await fetch('/api/member/focus-tasks', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title: newTitle, deadline: newDeadline || null, priority: newPriority }) })
    const d = await res.json()
    if (d.task) { setTasks(t => [d.task, ...t]); setNewTitle(''); setNewDeadline(''); setNewPriority('medium'); setShowForm(false) }
    setAdding(false)
  }

  const toggleDone = async (task: Task) => {
    const updated = { ...task, done: !task.done }
    setTasks(ts => ts.map(t => t.id === task.id ? updated : t))
    await fetch('/api/member/focus-tasks', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: task.id, done: !task.done }) })
  }

  const deleteTask = async (id: string) => {
    setTasks(ts => ts.filter(t => t.id !== id))
    await fetch(`/api/member/focus-tasks?id=${id}`, { method: 'DELETE' })
  }

  const visible = tasks.filter(t =>
    filter === 'all' ? true : filter === 'active' ? !t.done : t.done
  )

  const isOverdue = (t: Task) => !t.done && t.deadline && new Date(t.deadline) < new Date()

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col shadow-sm overflow-hidden" style={{minHeight: 520}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#8b5cf610'}}>
            <Check size={14} style={{color:'#8b5cf6'}}/>
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Tasks</span>
          <span className="text-xs text-gray-400">{tasks.filter(t=>!t.done).length} active</span>
        </div>
        <button onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-colors"
          style={{background:'#8b5cf6'}}>
          <Plus size={12}/> Add
        </button>
      </div>

      {/* Add task form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-2">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Task title…"
            autoFocus
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors placeholder-gray-400"/>
          <div className="flex gap-2">
            <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 transition-colors"/>
            <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)}
              className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 transition-colors font-semibold">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={addTask} disabled={adding || !newTitle.trim()}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-colors"
              style={{background:'#8b5cf6'}}>
              {adding ? 'Adding…' : 'Add Task'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
        {(['all','active','completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${filter===f ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            style={filter===f ? {background:'#8b5cf6'} : {}}>
            {f}
            <span className="ml-1.5 opacity-60">
              {f==='all' ? tasks.length : f==='active' ? tasks.filter(t=>!t.done).length : tasks.filter(t=>t.done).length}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0
          ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Check size={18} className="text-gray-300"/>
              </div>
              <p className="text-sm text-gray-400">{filter === 'completed' ? 'No completed tasks yet' : 'All clear! Add a task above.'}</p>
            </div>
          )
          : visible.map(task => (
            <div key={task.id}
              className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${task.done ? 'opacity-60' : ''}`}>
              <button onClick={() => toggleDone(task)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${task.done ? 'border-transparent' : 'border-gray-300 dark:border-gray-600 hover:border-violet-400'}`}
                style={task.done ? {background:'#8b5cf6', border:'2px solid #8b5cf6'} : {}}>
                {task.done && <Check size={10} className="text-white" strokeWidth={3}/>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-gray-800 dark:text-gray-200 leading-snug ${task.done ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{task.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{background: PRIORITY_COLORS[task.priority] + '20', color: PRIORITY_COLORS[task.priority]}}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                  {task.deadline && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${isOverdue(task) ? 'text-red-500' : 'text-gray-400'}`}>
                      <Calendar size={9}/>{new Date(task.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                      {isOverdue(task) && ' • Overdue'}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)}
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AcademicWorkspacePage() {
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener')
    setQuery('')
  }

  return (
    <div className="min-h-full p-4 md:p-6 space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Academic Workspace</h1>
          <p className="text-sm text-gray-400 mt-0.5">Focus. Write. Track. Repeat.</p>
        </div>
        {/* Google search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-shrink-0 sm:w-80">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search Google…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-cyan-400 dark:focus:border-cyan-500 transition-colors shadow-sm"/>
          </div>
          <button type="submit"
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex-shrink-0"
            style={{background:'linear-gradient(135deg,#06b6d4,#0891b2)'}}>
            Search
          </button>
        </form>
      </div>

      {/* 3-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Pomodoro */}
        <div>
          <PomodoroPanel/>
        </div>

        {/* Notes */}
        <div className="lg:col-span-1">
          <NotesPanel/>
        </div>

        {/* Tasks */}
        <div>
          <TasksPanel/>
        </div>
      </div>
    </div>
  )
}
