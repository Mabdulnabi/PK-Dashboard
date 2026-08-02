'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Search, Plus, Trash2, Check, Settings, RotateCcw, Play, Pause,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ArrowLeft, FileText, BookOpen, X, Calendar, AlarmClock, ChevronDown,
  ALargeSmall, Highlighter, Palette, Bookmark, FolderPlus, Folder, Edit3,
} from 'lucide-react'

// ─── Search engines ────────────────────────────────────────────────────────────
const ENGINES = [
  { id:'google',     label:'Google',     color:'#4285F4',
    url:'https://www.google.com/search?q=',
    logo: (
      <svg viewBox="0 0 48 48" className="w-5 h-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    ) },
  { id:'youtube',    label:'YouTube',    color:'#FF0000',
    url:'https://www.youtube.com/results?search_query=',
    logo: (
      <svg viewBox="0 0 90 63" className="w-5 h-5">
        <rect x="0" y="0" width="90" height="63" rx="14" fill="#FF0000"/>
        <polygon points="33,12 33,51 65,31.5" fill="white"/>
      </svg>
    ) },
  { id:'chatgpt',    label:'ChatGPT',    color:'#10a37f',
    url:'https://chatgpt.com/?q=',
    logo: (
      <svg viewBox="0 0 41 41" className="w-5 h-5" fill="none">
        <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-7.505-3.337 10.079 10.079 0 0 0-9.61 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.504 3.336 10.079 10.079 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813zM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496zM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744zM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.012L7.044 23.86a7.504 7.504 0 0 1-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 0 1 .114-.012l8.048 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18z" fill="#10a37f"/>
      </svg>
    ) },
  { id:'claude',     label:'Claude',     color:'#CC7858',
    url:'https://claude.ai/new?q=',
    logo: (
      <svg viewBox="0 0 100 100" className="w-5 h-5">
        {[0,27,55,82,110,138,165,192,220,248,275,302,330].map((a,i) => (
          <rect key={i} x="45.5" y="5" width="9" height="43" rx="4.5"
            fill="#CC7858" transform={`rotate(${a} 50 50)`}/>
        ))}
      </svg>
    ) },
  { id:'perplexity', label:'Perplexity', color:'#20C8D8',
    url:'https://www.perplexity.ai/search?q=',
    logo: (
      <img src="https://mluqxggjbumtmyfldaon.supabase.co/storage/v1/object/public/site-assets/perplexity.webp"
        alt="Perplexity" className="w-5 h-5 object-contain"/>
    ) },
]

// ─── Pomodoro ──────────────────────────────────────────────────────────────────
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

  const r = 72; const circ = 2 * Math.PI * r

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-md"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.97) 100%)',
        border: `1px solid ${m.color}28`,
        boxShadow: `0 4px 24px ${m.color}18, 0 1px 3px rgba(0,0,0,0.06)`,
      }}>
      {/* Accent top stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl transition-all duration-700" style={{background: `linear-gradient(90deg, transparent, ${m.color}, transparent)`}}/>

      {/* Dark mode override */}
      <div className="dark:hidden"/>
      <style>{`
        @media (prefers-color-scheme: dark) { .pomo-card { background: linear-gradient(135deg, rgb(17 24 39 / 0.97) 0%, rgb(15 23 42 / 0.97) 100%) !important; } }
        :root[data-theme="dark"] .pomo-card { background: linear-gradient(135deg, rgb(17 24 39 / 0.97) 0%, rgb(15 23 42 / 0.97) 100%) !important; }
      `}</style>

      <div className="flex items-center gap-5 px-5 py-5">
        {/* ── Circular ring ── */}
        <div className="relative flex-shrink-0" style={{width:172, height:172}}>
          {/* Ambient glow */}
          <div className="absolute rounded-full opacity-15 blur-2xl transition-all duration-700 pointer-events-none"
            style={{inset:'-10px', background: m.color}}/>
          <svg width={172} height={172} viewBox="0 0 172 172">
            {/* Track */}
            <circle cx={86} cy={86} r={r} fill="none" strokeWidth={8} stroke="rgba(0,0,0,0.06)"/>
            {/* Dark track */}
            <circle cx={86} cy={86} r={r} fill="none" strokeWidth={8} stroke={`${m.color}18`}/>
            {/* Tick marks */}
            {Array.from({length:60}).map((_,i)=>{
              const angle = (i/60)*Math.PI*2 - Math.PI/2
              const isMajor = i%5===0
              const inner = r + 5; const outer = r + (isMajor?12:8)
              return (
                <line key={i}
                  x1={86+inner*Math.cos(angle)} y1={86+inner*Math.sin(angle)}
                  x2={86+outer*Math.cos(angle)} y2={86+outer*Math.sin(angle)}
                  strokeWidth={isMajor?2:1} strokeLinecap="round"
                  stroke={isMajor ? m.color+'99' : m.color+'33'}/>
              )
            })}
            {/* Progress arc */}
            <circle cx={86} cy={86} r={r} fill="none" strokeWidth={8}
              stroke={m.color}
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              strokeLinecap="round"
              transform="rotate(-90 86 86)"
              style={{transition: running ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease',
                      filter:`drop-shadow(0 0 6px ${m.color}88)`}}/>
            {/* Tip dot */}
            {(progress > 0.01) && (() => {
              const angle = progress * Math.PI * 2 - Math.PI / 2
              return (
                <circle
                  cx={86 + r * Math.cos(angle)}
                  cy={86 + r * Math.sin(angle)}
                  r={6} fill={m.color}
                  style={{filter:`drop-shadow(0 0 8px ${m.color})`}}/>
              )
            })()}
          </svg>
          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
            <span className="text-4xl font-black tabular-nums tracking-tighter text-gray-900 dark:text-white leading-none"
              style={{fontVariantNumeric:'tabular-nums', letterSpacing:'-0.04em'}}>{mm}:{ss}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
              style={{color: m.color, background: `${m.color}16`}}>{m.label}</span>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl self-start backdrop-blur-sm">
            {(Object.keys(MODES) as PMode[]).map(k => (
              <button key={k} onClick={() => switchMode(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${mode===k?'text-white shadow-md':'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                style={mode===k?{background:MODES[k].color, boxShadow:`0 2px 10px ${MODES[k].color}55`}:{}}>
                {MODES[k].label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2.5">
            <button onClick={reset}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-all">
              <RotateCcw size={14}/>
            </button>
            <button onClick={() => setRunning(r=>!r)}
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 hover:scale-105"
              style={{background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)`, boxShadow:`0 8px 24px ${m.color}55`}}>
              {running ? <Pause size={24} fill="white"/> : <Play size={24} fill="white"/>}
            </button>
            <button onClick={() => { setDraft({...cfg}); setShowCfg(true) }}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-all">
              <Settings size={14}/>
            </button>
          </div>

          {/* Session dots */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {Array.from({length: cfg.sessionsBeforeLong}).map((_,i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    background: i < sessions % cfg.sessionsBeforeLong ? m.color : 'rgba(0,0,0,0.1)',
                    boxShadow: i < sessions % cfg.sessionsBeforeLong ? `0 0 8px ${m.color}99` : 'none',
                    transform: i < sessions % cfg.sessionsBeforeLong ? 'scale(1.15)' : 'scale(1)',
                  }}/>
              ))}
            </div>
            <span className="text-[11px] text-gray-400 font-medium">{sessions} session{sessions!==1?'s':''} today</span>
          </div>
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
              {([['Work (min)','work'],['Short Break (min)','short'],['Long Break (min)','long'],['Sessions → Long','sessionsBeforeLong']] as [string, keyof typeof draft][]).map(([label,key])=>(
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

// ─── Bookmarks ─────────────────────────────────────────────────────────────────
interface BFolder   { id: string; name: string }
interface BBookmark { id: string; url: string; name: string; folderId: string | null }
interface BState    { folders: BFolder[]; bookmarks: BBookmark[] }

const BK_KEY = 'pk_bookmarks_v1'

function faviconUrl(url: string) {
  try {
    const domain = new URL(url.startsWith('http') ? url : 'https://' + url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch { return '' }
}
function normalizeUrl(raw: string) {
  if (!raw) return ''
  return raw.startsWith('http') ? raw : 'https://' + raw
}
function domainLabel(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function BookmarksPanel() {
  const [data, setData]               = useState<BState>({ folders: [], bookmarks: [] })
  const [view, setView]               = useState<'root'|'folder'>('root')
  const [openFolder, setOpenFolder]   = useState<BFolder|null>(null)
  const [showAddShortcut, setShowAddShortcut] = useState(false)
  const [showAddFolder, setShowAddFolder]     = useState(false)
  const [ctxMenu, setCtxMenu]         = useState<{x:number;y:number;type:'bookmark'|'folder';id:string}|null>(null)
  const [editMode, setEditMode]       = useState<{type:'bookmark'|'folder';id:string}|null>(null)
  const [scForm, setScForm]           = useState({ url:'', name:'', folderId:'' })
  const [folderName, setFolderName]   = useState('')
  const [editForm, setEditForm]       = useState({ url:'', name:'', folderId:'' })
  const [editFolderName, setEditFolderName] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BK_KEY)
      if (raw) setData(JSON.parse(raw))
    } catch {}
  }, [])

  const persist = (next: BState) => {
    setData(next)
    localStorage.setItem(BK_KEY, JSON.stringify(next))
  }

  const addBookmark = () => {
    const url = normalizeUrl(scForm.url.trim())
    if (!url) return
    const name = scForm.name.trim() || domainLabel(url)
    persist({ ...data, bookmarks: [...data.bookmarks, { id: crypto.randomUUID(), url, name, folderId: scForm.folderId || null }] })
    setScForm({ url:'', name:'', folderId:'' }); setShowAddShortcut(false)
  }

  const addFolder = () => {
    if (!folderName.trim()) return
    persist({ ...data, folders: [...data.folders, { id: crypto.randomUUID(), name: folderName.trim() }] })
    setFolderName(''); setShowAddFolder(false)
  }

  const saveEdit = () => {
    if (!editMode) return
    if (editMode.type === 'folder') {
      persist({ ...data, folders: data.folders.map(f => f.id === editMode.id ? { ...f, name: editFolderName.trim() || f.name } : f) })
    } else {
      const url = normalizeUrl(editForm.url.trim())
      persist({ ...data, bookmarks: data.bookmarks.map(b => b.id === editMode.id ? { ...b, url, name: editForm.name.trim() || b.name, folderId: editForm.folderId || null } : b) })
    }
    setEditMode(null)
  }

  const deleteItem = (type: 'bookmark'|'folder', id: string) => {
    if (type === 'bookmark') {
      persist({ ...data, bookmarks: data.bookmarks.filter(b => b.id !== id) })
    } else {
      persist({ folders: data.folders.filter(f => f.id !== id), bookmarks: data.bookmarks.filter(b => b.folderId !== id) })
      if (openFolder?.id === id) { setView('root'); setOpenFolder(null) }
    }
    setCtxMenu(null)
  }

  const openCtx = (e: React.MouseEvent, type: 'bookmark'|'folder', id: string) => {
    e.preventDefault(); e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, type, id })
  }

  useEffect(() => {
    if (!ctxMenu) return
    const hide = () => setCtxMenu(null)
    document.addEventListener('click', hide)
    return () => document.removeEventListener('click', hide)
  }, [ctxMenu])

  const startEdit = (type: 'bookmark'|'folder', id: string) => {
    setCtxMenu(null)
    if (type === 'folder') {
      const f = data.folders.find(x => x.id === id)!
      setEditFolderName(f.name)
    } else {
      const b = data.bookmarks.find(x => x.id === id)!
      setEditForm({ url: b.url, name: b.name, folderId: b.folderId || '' })
    }
    setEditMode({ type, id })
  }

  const displayed = view === 'root'
    ? [...data.folders.map(f => ({ kind: 'folder' as const, item: f })), ...data.bookmarks.filter(b => !b.folderId).map(b => ({ kind: 'bookmark' as const, item: b }))]
    : data.bookmarks.filter(b => b.folderId === openFolder?.id).map(b => ({ kind: 'bookmark' as const, item: b }))

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden" style={{minHeight:282}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          {view === 'folder' && (
            <button onClick={() => { setView('root'); setOpenFolder(null) }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ArrowLeft size={13}/>
            </button>
          )}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#06b6d410'}}>
            <Bookmark size={14} style={{color:'#06b6d4'}}/>
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {view === 'root' ? 'Shortcuts' : <><span className="text-gray-400 font-medium">Shortcuts /</span> {openFolder?.name}</>}
          </span>
          {view === 'root' && (
            <span className="text-xs text-gray-400">{data.folders.length + data.bookmarks.filter(b=>!b.folderId).length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowAddFolder(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <FolderPlus size={11}/> Folder
          </button>
          <button onClick={() => setShowAddShortcut(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-colors"
            style={{background:'#06b6d4'}}>
            <Plus size={11}/> Shortcut
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Bookmark size={18} className="text-gray-300"/>
            </div>
            <p className="text-xs text-gray-400">
              {view === 'folder' ? 'No shortcuts in this folder yet.' : 'Add shortcuts or folders to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-1.5" style={{gridTemplateColumns:'repeat(auto-fill,minmax(72px,1fr))'}}>
            {displayed.map(({ kind, item }) => {
              if (kind === 'folder') {
                const folder = item as BFolder
                const fBms = data.bookmarks.filter(b => b.folderId === folder.id)
                return (
                  <div key={folder.id}
                    onContextMenu={e => openCtx(e, 'folder', folder.id)}
                    onClick={() => { setOpenFolder(folder); setView('folder') }}
                    className="cursor-pointer rounded-xl p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/70 active:scale-95 transition-all flex flex-col items-center gap-1 select-none">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 grid grid-cols-2 gap-0.5 p-1.5 overflow-hidden">
                      {fBms.length === 0 ? (
                        <div className="col-span-2 row-span-2 flex items-center justify-center">
                          <Folder size={20} className="text-gray-400"/>
                        </div>
                      ) : fBms.slice(0,4).map((b, i) => (
                        <img key={i} src={faviconUrl(b.url)} alt="" className="w-full h-full object-contain rounded-sm"
                          onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full leading-tight">{folder.name}</span>
                    {fBms.length > 0 && (
                      <span className="text-[9px] text-gray-400 -mt-0.5">{fBms.length}</span>
                    )}
                  </div>
                )
              } else {
                const bm = item as BBookmark
                return (
                  <div key={bm.id}
                    onContextMenu={e => openCtx(e, 'bookmark', bm.id)}
                    onClick={() => window.open(bm.url, '_blank', 'noopener')}
                    className="cursor-pointer rounded-xl p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/70 active:scale-95 transition-all flex flex-col items-center gap-1 select-none">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 flex items-center justify-center overflow-hidden">
                      <img src={faviconUrl(bm.url)} alt={bm.name} className="w-8 h-8 object-contain"
                        onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22></svg>' }}/>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full leading-tight">{bm.name}</span>
                  </div>
                )
              }
            })}
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1"
          style={{top: ctxMenu.y, left: ctxMenu.x, minWidth:130}}
          onClick={e => e.stopPropagation()}>
          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors"
            onClick={() => startEdit(ctxMenu.type, ctxMenu.id)}>
            <Edit3 size={12} className="text-gray-400"/> Edit
          </button>
          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2"/>
          <button className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors"
            onClick={() => deleteItem(ctxMenu.type, ctxMenu.id)}>
            <Trash2 size={12}/> Delete
          </button>
        </div>
      )}

      {/* Add Shortcut modal */}
      {showAddShortcut && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddShortcut(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">Add Shortcut</span>
              <button onClick={() => setShowAddShortcut(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-3">
              {[{label:'URL',key:'url',ph:'google.com'},{label:'Name',key:'name',ph:'Google'}].map(({label,key,ph})=>(
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{label}</label>
                  <input value={(scForm as any)[key]} onChange={e => setScForm(f => ({...f,[key]:e.target.value}))}
                    placeholder={ph}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/>
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Folder</label>
                <select value={scForm.folderId} onChange={e => setScForm(f => ({...f,folderId:e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-cyan-400 transition-colors">
                  <option value="">No folder (root)</option>
                  {data.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setShowAddShortcut(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={addBookmark}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#06b6d4'}}>
                Add Shortcut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Folder modal */}
      {showAddFolder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddFolder(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xs border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">Add Folder</span>
              <button onClick={() => setShowAddFolder(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Folder Name</label>
              <input value={folderName} onChange={e => setFolderName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addFolder()}
                placeholder="Research" autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setShowAddFolder(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={addFolder}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#06b6d4'}}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditMode(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">Edit {editMode.type === 'folder' ? 'Folder' : 'Shortcut'}</span>
              <button onClick={() => setEditMode(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-3">
              {editMode.type === 'folder' ? (
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Folder Name</label>
                  <input value={editFolderName} onChange={e => setEditFolderName(e.target.value)} autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/>
                </div>
              ) : (
                <>
                  {[{label:'URL',key:'url'},{label:'Name',key:'name'}].map(({label,key})=>(
                    <div key={key}>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{label}</label>
                      <input value={(editForm as any)[key]} onChange={e => setEditForm(f => ({...f,[key]:e.target.value}))} autoFocus={key==='url'}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/>
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">Folder</label>
                    <select value={editForm.folderId} onChange={e => setEditForm(f => ({...f,folderId:e.target.value}))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-cyan-400">
                      <option value="">No folder (root)</option>
                      {data.folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setEditMode(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#06b6d4'}}>
                Save
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

  const stripHtml = (html: string) => {
    const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden h-full" style={{minHeight:480}}>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{stripHtml(note.content).slice(0,60)||'No content'}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{new Date(note.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}</p>
                  </div>
                  <button onClick={e=>deleteNote(note.id,e)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0 mt-0.5">
                    <Trash2 size={11}/>
                  </button>
                </div>
              </button>
            ))
          }
        </div>
      )}

      {view==='edit' && (
        <>
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 flex-wrap flex-shrink-0 bg-gray-50 dark:bg-gray-800/40">
            {[{icon:Bold,c:'bold'},{icon:Italic,c:'italic'},{icon:Underline,c:'underline'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}}
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                <Icon size={12}/>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            {[{icon:AlignLeft,c:'justifyLeft'},{icon:AlignCenter,c:'justifyCenter'},{icon:AlignRight,c:'justifyRight'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}}
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Icon size={12}/>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            {[{icon:List,c:'insertUnorderedList'},{icon:ListOrdered,c:'insertOrderedList'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}}
                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Icon size={12}/>
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            <div className="relative">
              <select value={fontSize} onChange={e=>applyFontSize(e.target.value)}
                className="h-7 px-1 pr-5 rounded-md text-xs bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 outline-none focus:border-amber-400 appearance-none cursor-pointer">
                {FONT_SIZES.map(s=><option key={s} value={s}>{parseInt(s)}</option>)}
              </select>
              <ChevronDown size={9} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            <label className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer relative" title="Text color">
              <Palette size={12}/>
              <input ref={textColor} type="color" defaultValue="#000000"
                onChange={e=>cmd('foreColor',e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
            </label>
            <label className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer relative" title="Highlight">
              <Highlighter size={12}/>
              <input ref={hlColor} type="color" defaultValue="#fef08a"
                onChange={e=>cmd('backColor',e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
            </label>
          </div>
          <input value={title} onChange={e=>{setTitle(e.target.value);triggerSave()}}
            placeholder="Note title…"
            className="px-4 pt-3 pb-1 text-base font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 flex-shrink-0"/>
          <div ref={editorRef} contentEditable suppressContentEditableWarning
            onInput={triggerSave}
            className="flex-1 px-4 py-2 outline-none text-sm text-gray-700 dark:text-gray-300 overflow-y-auto leading-relaxed"
            data-placeholder="Start writing…"/>
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

  const fmtRemind = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden h-full" style={{minHeight:480}}>
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
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0 mt-0.5">
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
  const [engine, setEngine] = useState(ENGINES[0])
  const [query, setQuery]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const go = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return
    window.open(engine.url + encodeURIComponent(query.trim()), '_blank', 'noopener')
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={go}
      className="flex items-center gap-1.5 rounded-2xl shadow-sm px-2 py-1.5 transition-all duration-300"
      style={{
        background: engine.color + '12',
        border: `1.5px solid ${engine.color}55`,
        boxShadow: `0 2px 12px ${engine.color}18`,
      }}>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {ENGINES.map(e => (
          <button key={e.id} type="button" title={e.label}
            onClick={()=>{ setEngine(e); inputRef.current?.focus() }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${engine.id===e.id?'shadow-sm':'opacity-35 hover:opacity-70'}`}
            style={engine.id===e.id?{background:e.color+'22', outline:`2px solid ${e.color}55`}:{}}>
            {e.logo}
          </button>
        ))}
      </div>
      <div className="w-px h-5 flex-shrink-0 mx-1" style={{background: engine.color+'44'}}/>
      <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
        placeholder={`Search on ${engine.label}…`}
        className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none min-w-0"/>
      <button type="submit"
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all active:scale-95"
        style={{background: engine.color, boxShadow: `0 2px 8px ${engine.color}55`}}>
        <Search size={13}/>
      </button>
    </form>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AcademicWorkspacePage() {
  return (
    <div className="min-h-full p-4 md:p-5 flex flex-col gap-4">
      {/* Header + Search */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight whitespace-nowrap">Focus Mode</h1>
          <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">Focus. Write. Track. Repeat.</p>
        </div>
        <div className="flex-1">
          <SearchBar/>
        </div>
      </div>

      {/* Pomodoro (half) + Bookmarks (half) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PomodoroStrip/>
        <BookmarksPanel/>
      </div>

      {/* Notes + Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <NotesPanel/>
        <TasksPanel/>
      </div>
    </div>
  )
}
