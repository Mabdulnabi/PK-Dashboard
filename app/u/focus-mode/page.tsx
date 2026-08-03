'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLang } from '@/lib/lang-context'
import {
  Search, Plus, Trash2, Check, Settings, RotateCcw, Play, Pause,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  ArrowLeft, FileText, BookOpen, X, Calendar, AlarmClock, ChevronDown, ChevronLeft, ChevronRight,
  Highlighter, Palette, Bookmark, FolderPlus, Folder, Edit3, Calculator,
  Users, UserPlus, Share2, Lock, Globe, Mail, GripVertical, RefreshCw,
  Upload, Download, AlertTriangle,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── helpers ──────────────────────────────────────────────────────────────────
// Convert a datetime-local string (local time) to UTC ISO string
function localToUTC(localStr: string): string {
  if (!localStr) return ''
  const d = new Date(localStr)
  return isNaN(d.getTime()) ? '' : d.toISOString()
}
// Convert UTC ISO string to datetime-local input value (local time)
function utcToLocal(utcStr: string): string {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return ''
  // Format: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Search engines ────────────────────────────────────────────────────────────
const ENGINES = [
  { id:'google',     label:'Google',     color:'#4285F4', url:'https://www.google.com/search?q=',
    logo:<svg viewBox="0 0 48 48" className="w-5 h-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> },
  { id:'youtube',    label:'YouTube',    color:'#FF0000', url:'https://www.youtube.com/results?search_query=',
    logo:<svg viewBox="0 0 90 63" className="w-5 h-5"><rect x="0" y="0" width="90" height="63" rx="14" fill="#FF0000"/><polygon points="33,12 33,51 65,31.5" fill="white"/></svg> },
  { id:'chatgpt',    label:'ChatGPT',    color:'#10a37f', url:'https://chatgpt.com/?q=',
    logo:<svg viewBox="0 0 41 41" className="w-5 h-5" fill="none"><path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-7.505-3.337 10.079 10.079 0 0 0-9.61 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.504 3.336 10.079 10.079 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813zM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.496zM6.392 31.006a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744zM4.297 13.62A7.469 7.469 0 0 1 8.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.012L7.044 23.86a7.504 7.504 0 0 1-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 0 1 .114-.012l8.048 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18z" fill="#10a37f"/></svg> },
  { id:'claude',     label:'Claude',     color:'#CC7858', url:'https://claude.ai/new?q=',
    logo:<svg viewBox="0 0 100 100" className="w-5 h-5">{[0,27,55,82,110,138,165,192,220,248,275,302,330].map((a,i)=><rect key={i} x="45.5" y="5" width="9" height="43" rx="4.5" fill="#CC7858" transform={`rotate(${a} 50 50)`}/>)}</svg> },
  { id:'perplexity', label:'Perplexity', color:'#20C8D8', url:'https://www.perplexity.ai/search?q=',
    logo:<img src="https://mluqxggjbumtmyfldaon.supabase.co/storage/v1/object/public/site-assets/perplexity.webp" alt="Perplexity" className="w-5 h-5 object-contain"/> },
]

type BoardMode = 'private' | 'shared'
interface SharedBoard { id:string; name:string; owner_id:string; role:'owner'|'collaborator' }

// ─── Scientific Calculator ─────────────────────────────────────────────────────
function ScientificCalculator({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const [display, setDisplay] = useState('0')
  const [expr, setExpr]       = useState('')
  const [mem, setMem]         = useState(0)
  const [shift, setShift]     = useState(false)

  const safeEval = (e: string) => {
    try {
      const s = e
        .replace(/sin\(/g,'Math.sin(').replace(/cos\(/g,'Math.cos(').replace(/tan\(/g,'Math.tan(')
        .replace(/asin\(/g,'Math.asin(').replace(/acos\(/g,'Math.acos(').replace(/atan\(/g,'Math.atan(')
        .replace(/log\(/g,'Math.log10(').replace(/ln\(/g,'Math.log(').replace(/sqrt\(/g,'Math.sqrt(')
        .replace(/π/g,'Math.PI').replace(/e(?![a-z])/g,'Math.E').replace(/\^/g,'**')
      if (!/^[0-9+\-*/().%Math\s|]+$/.test(s.replace(/Math\.[a-zA-Z]+/g,''))) return 'Error'
      // eslint-disable-next-line no-new-func
      const r = Function('"use strict"; return (' + s + ')')()
      if (!isFinite(r)) return 'Error'
      return String(Number(r.toPrecision(12)))
    } catch { return 'Error' }
  }

  const press = (val: string) => {
    if (val==='C')   { setDisplay('0'); setExpr(''); return }
    if (val==='⌫')   { const e=expr.slice(0,-1); setExpr(e); setDisplay(e||'0'); return }
    if (val==='=')   { const r=safeEval(expr); setDisplay(r); setExpr(r==='Error'?'':r); return }
    if (val==='M+')  { setMem(m=>m+parseFloat(display)); return }
    if (val==='MR')  { const ms=String(mem); setExpr(e=>e+ms); setDisplay(ms); return }
    if (val==='MC')  { setMem(0); return }
    if (val==='SHIFT'){ setShift(s=>!s); return }
    const next = expr==='Error'?val:expr+val
    setExpr(next); setDisplay(next||'0')
  }

  type Btn={label:string;alt?:string;wide?:boolean;color?:string}
  const rows:Btn[][] = [
    [{label:'sin(',alt:'asin('},{label:'cos(',alt:'acos('},{label:'tan(',alt:'atan('},{label:'log(',alt:'ln('},{label:'√(',alt:'x²'}],
    [{label:'π'},{label:'e'},{label:'('},{label:')'},{label:'%'}],
    [{label:'MC'},{label:'MR'},{label:'M+'},{label:'⌫',color:'#ef4444'},{label:'C',color:'#ef4444'}],
    [{label:'7'},{label:'8'},{label:'9'},{label:'÷'}],
    [{label:'4'},{label:'5'},{label:'6'},{label:'×'}],
    [{label:'1'},{label:'2'},{label:'3'},{label:'-'}],
    [{label:'0',wide:true},{label:'.'},{label:'+'}],
    [{label:'SHIFT',wide:true,color:shift?'#8b5cf6':undefined},{label:'=',wide:true,color:'#06b6d4'}],
  ]
  const getLabel=(btn:Btn)=>shift&&btn.alt?btn.alt:btn.label
  const getVal=(btn:Btn)=>{ const l=getLabel(btn); if(l==='÷')return '/'; if(l==='×')return '*'; if(l==='x²')return `Math.pow(${display},2)`; return l }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-72" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2"><Calculator size={15} className="text-gray-500"/><span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t('Scientific Calculator','الآلة الحاسبة العلمية')}</span></div>
          <button onClick={onClose} className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={12}/></button>
        </div>
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
          <div className="text-xs text-gray-400 h-4 font-mono truncate">{expr||' '}</div>
          <div className="text-2xl font-black text-gray-900 dark:text-white font-mono text-right truncate" style={{fontVariantNumeric:'tabular-nums'}}>{display}</div>
          {shift&&<div className="text-[10px] text-violet-500 font-bold">{t('SHIFT ON','SHIFT مفعل')}</div>}
        </div>
        <div className="p-2 space-y-1">
          {rows.map((row,ri)=>(
            <div key={ri} className="flex gap-1">
              {row.map((btn,bi)=>{
                const hasColor = btn.color||(btn.label==='SHIFT'&&shift)
                const bgColor  = btn.color||(btn.label==='SHIFT'&&shift?'#8b5cf6':undefined)
                return (
                  <button key={bi} onClick={()=>press(getVal(btn))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${btn.wide?'flex-[2]':''} ${hasColor?'text-white':'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    style={bgColor?{background:bgColor}:{}}>
                    {getLabel(btn)}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function dotAngle(progress: number, r: number, cx: number, color: string) {
  const angle = progress * Math.PI * 2 - Math.PI / 2
  return <circle cx={cx + r * Math.cos(angle)} cy={cx + r * Math.sin(angle)} r={5} fill={color} style={{filter:`drop-shadow(0 0 8px ${color})`}}/>
}

// ─── Pomodoro ──────────────────────────────────────────────────────────────────
const MODES = {
  work:  { label:'Focus',       color:'#06b6d4', defaultMin:25 },
  short: { label:'Short Break', color:'#10b981', defaultMin:5  },
  long:  { label:'Long Break',  color:'#8b5cf6', defaultMin:15 },
}
type PMode = keyof typeof MODES

function PomodoroStrip() {
  const { t } = useLang()
  const [cfg, setCfg]       = useState({ work:25, short:5, long:15, sessionsBeforeLong:4, autoBreak:true, autoWork:false })
  const [mode, setMode]     = useState<PMode>('work')
  const [secs, setSecs]     = useState(25*60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [showCfg, setShowCfg] = useState(false)
  const [draft, setDraft]   = useState({...cfg})
  const ivRef   = useRef<NodeJS.Timeout|null>(null)
  const actxRef = useRef<AudioContext|null>(null)

  const total    = (mk: PMode) => cfg[mk] * 60
  const progress = (total(mode) - secs) / total(mode)
  const m        = MODES[mode]
  const mm       = String(Math.floor(secs/60)).padStart(2,'0')
  const ss       = String(secs%60).padStart(2,'0')
  const r = 68; const circ = 2 * Math.PI * r

  const beep = useCallback(() => {
    try {
      if (!actxRef.current) actxRef.current = new AudioContext()
      const ctx = actxRef.current; const t = ctx.currentTime
      // Premium 3-note chime: C5 → E5 → G5
      const notes = [523.25, 659.25, 783.99]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.type = 'sine'; osc.frequency.value = freq
        const start = t + i * 0.18
        g.gain.setValueAtTime(0, start)
        g.gain.linearRampToValueAtTime(0.28, start + 0.04)
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.9)
        osc.start(start); osc.stop(start + 0.9)
      })
    } catch {}
  }, [])

  const switchMode = useCallback((mk: PMode) => { setMode(mk); setSecs(cfg[mk]*60); setRunning(false) }, [cfg])

  const onFinish = useCallback(() => {
    beep()
    if (mode==='work') {
      const s=sessions+1; setSessions(s)
      const next:PMode = s%cfg.sessionsBeforeLong===0?'long':'short'
      if (cfg.autoBreak) { setMode(next); setSecs(total(next)); setRunning(true) } else switchMode(next)
    } else {
      if (cfg.autoWork) { setMode('work'); setSecs(total('work')); setRunning(true) } else switchMode('work')
    }
  }, [mode, sessions, cfg, beep, switchMode])

  useEffect(() => {
    if (running) ivRef.current=setInterval(()=>setSecs(s=>{if(s<=1){clearInterval(ivRef.current!);onFinish();return 0}return s-1}),1000)
    else clearInterval(ivRef.current!)
    return ()=>clearInterval(ivRef.current!)
  }, [running, onFinish])

  const reset = () => { setRunning(false); setSecs(cfg[mode]*60) }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900"
      style={{border:`1px solid ${m.color}28`,boxShadow:`0 4px 24px ${m.color}18,0 1px 3px rgba(0,0,0,0.06)`}}>
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{background:`linear-gradient(90deg,transparent,${m.color},transparent)`}}/>
      <div className="relative flex items-start gap-5 px-5 py-5">
        {/* Ring */}
        <div className="relative flex-shrink-0" style={{width:168,height:168}}>
          <div className="absolute rounded-full opacity-15 blur-2xl pointer-events-none" style={{inset:'-8px',background:m.color}}/>
          <svg width={168} height={168} viewBox="0 0 168 168">
            <circle cx={84} cy={84} r={r} fill="none" strokeWidth={8} stroke={`${m.color}18`}/>
            {Array.from({length:60}).map((_,i)=>{
              const angle=(i/60)*Math.PI*2-Math.PI/2; const isMajor=i%5===0
              const inner=r+4; const outer=r+(isMajor?11:7)
              return <line key={i} x1={84+inner*Math.cos(angle)} y1={84+inner*Math.sin(angle)} x2={84+outer*Math.cos(angle)} y2={84+outer*Math.sin(angle)} strokeWidth={isMajor?2:1} strokeLinecap="round" stroke={isMajor?m.color+'99':m.color+'33'}/>
            })}
            <circle cx={84} cy={84} r={r} fill="none" strokeWidth={8} stroke={m.color}
              strokeDasharray={circ} strokeDashoffset={circ*(1-progress)} strokeLinecap="round"
              transform="rotate(-90 84 84)"
              style={{transition:running?'stroke-dashoffset 1s linear':'stroke-dashoffset 0.4s ease',filter:`drop-shadow(0 0 6px ${m.color}88)`}}/>
            {progress>0.01&&dotAngle(progress,r,84,m.color)}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
            <span className="text-[34px] font-black tracking-tight text-gray-900 dark:text-white leading-none" style={{fontVariantNumeric:'tabular-nums'}}>{mm}:{ss}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] px-2.5 py-1 rounded-full" style={{color:m.color,background:`${m.color}18`}}>{m.label==='Focus'?t('Focus','تركيز'):m.label==='Short Break'?t('Short Break','استراحة قصيرة'):t('Long Break','استراحة طويلة')}</span>
          </div>
        </div>
        {/* Right panel */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 pt-1">
          {/* Mode tabs — full width */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full">
            {(Object.keys(MODES) as PMode[]).map(k=>(
              <button key={k} onClick={()=>switchMode(k)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all truncate ${mode===k?'text-white shadow-md':'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                style={mode===k?{background:MODES[k].color,boxShadow:`0 2px 10px ${MODES[k].color}55`}:{}}>
                {k==='work'?t('Focus','تركيز'):k==='short'?t('Short','قصيرة'):t('Long','طويلة')}
              </button>
            ))}
          </div>
          {/* Controls */}
          <div className="flex items-center gap-3">
            <button onClick={reset}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
              <RotateCcw size={15}/>
            </button>
            <button onClick={()=>setRunning(rv=>!rv)}
              className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm transition-all active:scale-95 hover:opacity-90"
              style={{background:`linear-gradient(135deg,${m.color},${m.color}bb)`,boxShadow:`0 6px 20px ${m.color}44`}}>
              {running?<><Pause size={18} fill="white"/> {t('Pause','إيقاف')}</>:<><Play size={18} fill="white"/> {t('Start','ابدأ')}</>}
            </button>
            <button onClick={()=>{setDraft({...cfg});setShowCfg(true)}}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
              <Settings size={15}/>
            </button>
          </div>
          {/* Session dots */}
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5 items-center">
              {Array.from({length:cfg.sessionsBeforeLong}).map((_,i)=>(
                <div key={i} className="w-2.5 h-2.5 rounded-full transition-all duration-500"
                  style={{background:i<sessions%cfg.sessionsBeforeLong?m.color:'rgba(0,0,0,0.1)',
                          boxShadow:i<sessions%cfg.sessionsBeforeLong?`0 0 8px ${m.color}99`:'none',
                          transform:i<sessions%cfg.sessionsBeforeLong?'scale(1.15)':'scale(1)'}}/>
              ))}
            </div>
            <span className="text-xs text-gray-400 font-medium">{t(`${sessions} session${sessions!==1?'s':''} today`,`${sessions} جلسة اليوم`)}</span>
          </div>
        </div>
      </div>
      {showCfg&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowCfg(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">{t('Timer Settings','إعدادات المؤقت')}</span>
              <button onClick={()=>setShowCfg(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {([[t('Work (min)','عمل (دقيقة)'),'work'],[t('Short Break (min)','استراحة قصيرة (دقيقة)'),'short'],[t('Long Break (min)','استراحة طويلة (دقيقة)'),'long'],[t('Sessions → Long','جلسات → استراحة طويلة'),'sessionsBeforeLong']] as [string,keyof typeof draft][]).map(([label,key])=>(
                <div key={key}><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{label}</label>
                  <input type="number" min={1} max={key==='sessionsBeforeLong'?10:120} value={draft[key] as number} onChange={e=>setDraft(d=>({...d,[key]:parseInt(e.target.value)||1}))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors" style={{fontVariantNumeric:'tabular-nums'}}/></div>
              ))}
              <div className="col-span-2 space-y-3">
                {([[t('Auto-start Breaks','بدء الاستراحة تلقائياً'),'autoBreak'],[t('Auto-start Work','بدء العمل تلقائياً'),'autoWork']] as [string,'autoBreak'|'autoWork'][]).map(([label,key])=>(
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                    <div onClick={()=>setDraft(d=>({...d,[key]:!d[key]}))} className={`w-10 h-5 rounded-full transition-colors relative ${draft[key]?'bg-cyan-500':'bg-gray-300 dark:bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${draft[key]?'translate-x-5':'translate-x-0.5'}`}/>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button onClick={()=>{setCfg({...draft});setSecs(draft[mode]*60);setRunning(false);setShowCfg(false)}} className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#06b6d4'}}>{t('Apply','تطبيق')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bookmarks ─────────────────────────────────────────────────────────────────
interface BBookmark { id:string; type:'bookmark'|'folder'; name:string; url:string|null; folder_id:string|null; created_by:string; member_id:string }

function faviconUrl(url:string) { try { return `https://www.google.com/s2/favicons?domain=${new URL(url.startsWith('http')?url:'https://'+url).hostname}&sz=64` } catch { return '' } }
function normalizeUrl(raw:string) { return raw.startsWith('http')?raw:'https://'+raw }
function domainLabel(url:string) { try { return new URL(url).hostname.replace('www.','') } catch { return url } }

function BookmarksPanel({ boardId, memberId }: { boardId:string|null; memberId:string }) {
  const { t } = useLang()
  const [items, setItems]             = useState<BBookmark[]>([])
  const [view, setView]               = useState<'root'|'folder'>('root')
  const [openFolder, setOpenFolder]   = useState<BBookmark|null>(null)
  const [showAddShortcut, setShowAdd] = useState(false)
  const [showAddFolder, setShowAddF]  = useState(false)
  const [ctxMenu, setCtxMenu]         = useState<{x:number;y:number;item:BBookmark}|null>(null)
  const [editItem, setEditItem]       = useState<BBookmark|null>(null)
  const [scForm, setScForm]           = useState({url:'',name:'',folderId:''})
  const [folderName, setFolderName]   = useState('')

  const qs = boardId ? `?board_id=${boardId}` : ''

  useEffect(()=>{ fetch(`/api/member/focus-bookmarks${qs}`).then(r=>r.json()).then(d=>setItems(d.bookmarks||[])) },[boardId])

  const addBookmark = async ()=>{
    const url=normalizeUrl(scForm.url.trim()); if(!url) return
    const res=await fetch('/api/member/focus-bookmarks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'bookmark',name:scForm.name.trim()||domainLabel(url),url,folder_id:scForm.folderId||null,board_id:boardId})})
    const d=await res.json()
    if(d.bookmark){setItems(i=>[...i,d.bookmark]);setScForm({url:'',name:'',folderId:''});setShowAdd(false)}
  }

  const addFolder = async ()=>{
    if(!folderName.trim()) return
    const res=await fetch('/api/member/focus-bookmarks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'folder',name:folderName.trim(),board_id:boardId})})
    const d=await res.json()
    if(d.bookmark){setItems(i=>[...i,d.bookmark]);setFolderName('');setShowAddF(false)}
  }

  const saveEdit = async ()=>{
    if(!editItem) return
    const body:any={id:editItem.id,name:editItem.name}
    if(editItem.type==='bookmark'){body.url=editItem.url;body.folder_id=editItem.folder_id}
    await fetch('/api/member/focus-bookmarks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    setItems(i=>i.map(x=>x.id===editItem.id?editItem:x));setEditItem(null)
  }

  const deleteItem = async (item:BBookmark)=>{
    await fetch(`/api/member/focus-bookmarks?id=${item.id}&type=${item.type}`,{method:'DELETE'})
    setItems(i=>i.filter(x=>x.id!==item.id&&x.folder_id!==item.id))
    if(openFolder?.id===item.id){setView('root');setOpenFolder(null)}
    setCtxMenu(null)
  }

  useEffect(()=>{if(!ctxMenu) return; const h=()=>setCtxMenu(null); document.addEventListener('click',h); return()=>document.removeEventListener('click',h)},[ctxMenu])

  const canEdit=(item:BBookmark)=>item.created_by===memberId
  const folders=items.filter(i=>i.type==='folder')
  const displayed=view==='root'?items.filter(i=>!i.folder_id):items.filter(i=>i.folder_id===openFolder?.id&&i.type==='bookmark')

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          {view==='folder'&&<button onClick={()=>{setView('root');setOpenFolder(null)}} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ArrowLeft size={13}/></button>}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#06b6d410'}}><Bookmark size={14} style={{color:'#06b6d4'}}/></div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {view==='root'?t('Bookmarks','المفضلة'):<><span className="text-gray-400 font-medium">{t('Bookmarks','المفضلة')} /</span> {openFolder?.name}</>}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={()=>setShowAddF(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><FolderPlus size={11}/> {t('Folder','مجلد')}</button>
          <button onClick={()=>{setScForm(f=>({...f,folderId:openFolder?.id||''}));setShowAdd(true)}} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{background:'#06b6d4'}}><Plus size={11}/> {t('Add','إضافة')}</button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-3">
        {displayed.length===0?(
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center"><Bookmark size={18} className="text-gray-300"/><p className="text-xs text-gray-400">{view==='folder'?t('Empty folder','المجلد فارغ'):t('Add bookmarks or folders','أضف مفضلة أو مجلدات')}</p></div>
        ):(
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {displayed.map(item=>(
              <div key={item.id} className="relative group select-none">
                <div
                  onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCtxMenu({x:e.clientX,y:e.clientY,item})}}
                  onClick={()=>{ if(item.type==='folder'){setOpenFolder(item);setView('folder')} else window.open(item.url!,'_blank','noopener') }}
                  className="cursor-pointer rounded-xl p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/70 active:scale-95 transition-all flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 flex items-center justify-center overflow-hidden">
                    {item.type==='folder'?(
                      <div className="w-full h-full grid grid-cols-2 gap-0.5 p-1.5">
                        {items.filter(x=>x.folder_id===item.id).slice(0,4).map((b,i)=>(
                          <img key={i} src={faviconUrl(b.url||'')} alt="" className="w-full h-full object-contain rounded-sm" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                        ))}
                        {items.filter(x=>x.folder_id===item.id).length===0&&<div className="col-span-2 row-span-2 flex items-center justify-center"><Folder size={18} className="text-gray-400"/></div>}
                      </div>
                    ):(
                      <img src={faviconUrl(item.url||'')} alt={item.name} className="w-8 h-8 object-contain" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 text-center truncate w-full leading-tight">{item.name}</span>
                </div>
                {/* Hover action buttons — only for creator */}
                {canEdit(item)&&(
                  <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e=>{e.stopPropagation();setEditItem({...item})}}
                      className="w-5 h-5 rounded-md bg-white dark:bg-gray-700 shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:text-blue-500 transition-colors">
                      <Edit3 size={9}/>
                    </button>
                    <button onClick={e=>{e.stopPropagation();deleteItem(item)}}
                      className="w-5 h-5 rounded-md bg-white dark:bg-gray-700 shadow border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                      <Trash2 size={9}/>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Context menu */}
      {ctxMenu&&(
        <div className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1" style={{top:ctxMenu.y,left:ctxMenu.x,minWidth:130}} onClick={e=>e.stopPropagation()}>
          {canEdit(ctxMenu.item)?<>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 transition-colors" onClick={()=>{setEditItem({...ctxMenu.item});setCtxMenu(null)}}><Edit3 size={12} className="text-gray-400"/> {t('Edit','تعديل')}</button>
            <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2"/>
            <button className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors" onClick={()=>deleteItem(ctxMenu.item)}><Trash2 size={12}/> {t('Delete','حذف')}</button>
          </>:<div className="px-4 py-2 text-xs text-gray-400">{t('Created by another member','أنشأه عضو آخر')}</div>}
        </div>
      )}
      {/* Add Bookmark */}
      {showAddShortcut&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">{t('Add Bookmark','إضافة مفضلة')}</span>
              <button onClick={()=>setShowAdd(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-3">
              {[{label:t('URL','الرابط'),key:'url',ph:'google.com'},{label:t('Name (optional)','الاسم (اختياري)'),key:'name',ph:'Google'}].map(({label,key,ph})=>(
                <div key={key}><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{label}</label>
                  <input value={(scForm as any)[key]} onChange={e=>setScForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/></div>
              ))}
              {folders.length>0&&<div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Folder','المجلد')}</label>
                <select value={scForm.folderId} onChange={e=>setScForm(f=>({...f,folderId:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-cyan-400">
                  <option value="">{t('No folder (root)','بدون مجلد')}</option>
                  {folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                </select></div>}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">{t('Cancel','إلغاء')}</button>
              <button onClick={addBookmark} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#06b6d4'}}>{t('Add','إضافة')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Add Folder */}
      {showAddFolder&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddF(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xs border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">{t('Add Folder','إضافة مجلد')}</span>
              <button onClick={()=>setShowAddF(false)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5"><input value={folderName} onChange={e=>setFolderName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addFolder()} placeholder="Research" autoFocus className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/></div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setShowAddF(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">{t('Cancel','إلغاء')}</button>
              <button onClick={addFolder} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#06b6d4'}}>{t('Create','إنشاء')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit */}
      {editItem&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setEditItem(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">{t(`Edit ${editItem.type==='folder'?'Folder':'Bookmark'}`,editItem.type==='folder'?'تعديل المجلد':'تعديل المفضلة')}</span>
              <button onClick={()=>setEditItem(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Name','الاسم')}</label>
                <input value={editItem.name} onChange={e=>setEditItem(x=>x?{...x,name:e.target.value}:x)} autoFocus className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/></div>
              {editItem.type==='bookmark'&&<div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('URL','الرابط')}</label>
                <input value={editItem.url||''} onChange={e=>setEditItem(x=>x?{...x,url:e.target.value}:x)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/></div>}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setEditItem(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">{t('Cancel','إلغاء')}</button>
              <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#06b6d4'}}>{t('Save','حفظ')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Notes ─────────────────────────────────────────────────────────────────────
interface Note { id:string; title:string; content:string; updated_at:string; created_by:string; member_id:string }
const FONT_SIZES = ['12px','14px','16px','18px','20px','24px','28px','32px']

function NotesPanel({ boardId, memberId }: { boardId:string|null; memberId:string }) {
  const { t } = useLang()
  const [notes, setNotes]       = useState<Note[]>([])
  const [view, setView]         = useState<'list'|'edit'>('list')
  const [activeId, setActiveId] = useState<string|null>(null)
  const [title, setTitle]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [fontSize, setFontSize] = useState('16px')
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<NodeJS.Timeout|null>(null)

  const qs = boardId ? `?board_id=${boardId}` : ''

  useEffect(()=>{
    fetch(`/api/member/focus-notes${qs}`).then(r=>r.json()).then(d=>setNotes(d.notes||[]))
    setView('list'); setActiveId(null)
  },[boardId])

  const newNote = async ()=>{
    const res=await fetch('/api/member/focus-notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Untitled Note',content:'',board_id:boardId})})
    const d=await res.json()
    if(d.note){setNotes(n=>[d.note,...n]);openNote(d.note)}
  }

  const openNote=(note:Note)=>{ setActiveId(note.id);setTitle(note.title);setView('edit');setTimeout(()=>{if(editorRef.current)editorRef.current.innerHTML=note.content},50) }

  const triggerSave=()=>{
    if(!activeId) return
    clearTimeout(saveTimer.current!)
    saveTimer.current=setTimeout(async()=>{
      setSaving(true)
      const content=editorRef.current?.innerHTML||''
      await fetch('/api/member/focus-notes',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:activeId,title,content})})
      setNotes(ns=>ns.map(n=>n.id===activeId?{...n,title,content,updated_at:new Date().toISOString()}:n))
      setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2000)
    },700)
  }

  const deleteNote=async(id:string,e:React.MouseEvent)=>{
    e.stopPropagation()
    await fetch(`/api/member/focus-notes?id=${id}`,{method:'DELETE'})
    setNotes(n=>n.filter(x=>x.id!==id))
    if(activeId===id){setView('list');setActiveId(null)}
  }

  const cmd=(command:string,val?:string)=>{editorRef.current?.focus();document.execCommand(command,false,val);triggerSave()}

  const applyFontSize=(size:string)=>{
    setFontSize(size);editorRef.current?.focus()
    document.execCommand('fontSize',false,'7')
    editorRef.current?.querySelectorAll('font[size="7"]').forEach(el=>{
      const span=document.createElement('span');span.style.fontSize=size
      while(el.firstChild) span.appendChild(el.firstChild);el.parentNode?.replaceChild(span,el)
    })
    triggerSave()
  }

  const stripHtml=(html:string)=>{const d=document.createElement('div');d.innerHTML=html;return d.textContent||''}
  const canDelete=(note:Note)=>note.created_by===memberId||note.member_id===memberId

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden h-full" style={{minHeight:480}}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          {view==='edit'&&<button onClick={()=>setView('list')} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-1"><ArrowLeft size={13}/></button>}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#d9940110'}}><BookOpen size={14} style={{color:'#d99401'}}/></div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t('Notes','الملاحظات')}</span>
          {view==='list'&&<span className="text-xs text-gray-400">{notes.length}</span>}
          {view==='edit'&&saving&&<span className="text-[10px] text-gray-400 animate-pulse">{t('Saving…','يحفظ…')}</span>}
          {view==='edit'&&saved&&<span className="text-[10px] text-emerald-500">{t('Saved ✓','تم الحفظ ✓')}</span>}
        </div>
        <button onClick={newNote} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{background:'#d99401'}}><Plus size={11}/> {t('New','جديدة')}</button>
      </div>
      {view==='list'&&(
        <div className="flex-1 overflow-y-auto">
          {notes.length===0?(
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><FileText size={20} className="text-gray-300"/></div>
              <p className="text-sm text-gray-400">{t('No notes yet.','لا توجد ملاحظات.')}</p>
            </div>
          ):notes.map(note=>(
            <button key={note.id} onClick={()=>openNote(note)} className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition-colors group relative">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{note.title||t('Untitled','بدون عنوان')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{stripHtml(note.content).slice(0,60)||t('No content','لا محتوى')}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{new Date(note.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}</p>
                </div>
                {canDelete(note)&&<button onClick={e=>deleteNote(note.id,e)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0 mt-0.5"><Trash2 size={11}/></button>}
              </div>
            </button>
          ))}
        </div>
      )}
      {view==='edit'&&(
        <>
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 flex-wrap flex-shrink-0 bg-gray-50 dark:bg-gray-800/40">
            {[{icon:Bold,c:'bold'},{icon:Italic,c:'italic'},{icon:Underline,c:'underline'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><Icon size={12}/></button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            {[{icon:AlignLeft,c:'justifyLeft'},{icon:AlignCenter,c:'justifyCenter'},{icon:AlignRight,c:'justifyRight'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><Icon size={12}/></button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            {[{icon:List,c:'insertUnorderedList'},{icon:ListOrdered,c:'insertOrderedList'}].map(({icon:Icon,c})=>(
              <button key={c} onMouseDown={e=>{e.preventDefault();cmd(c)}} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><Icon size={12}/></button>
            ))}
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            <div className="relative">
              <select value={fontSize} onChange={e=>applyFontSize(e.target.value)} className="h-7 px-1 pr-5 rounded-md text-xs bg-transparent border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 outline-none focus:border-amber-400 appearance-none cursor-pointer">
                {FONT_SIZES.map(s=><option key={s} value={s}>{parseInt(s)}</option>)}
              </select>
              <ChevronDown size={9} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5"/>
            <label className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer relative" title="Text color">
              <Palette size={12}/>
              <input type="color" defaultValue="#000000" onChange={e=>cmd('foreColor',e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
            </label>
            <label className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer relative" title="Highlight">
              <Highlighter size={12}/>
              <input type="color" defaultValue="#fef08a" onChange={e=>cmd('backColor',e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
            </label>
          </div>
          <input value={title} onChange={e=>{setTitle(e.target.value);triggerSave()}} placeholder={t('Note title…','عنوان الملاحظة…')} className="px-4 pt-3 pb-1 text-base font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 flex-shrink-0"/>
          <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={triggerSave} className="flex-1 px-4 py-2 outline-none text-sm text-gray-700 dark:text-gray-300 overflow-y-auto leading-relaxed"/>
        </>
      )}
    </div>
  )
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────
interface Task { id:string; title:string; deadline:string|null; priority:'low'|'medium'|'high'; done:boolean; created_at:string; remind_at:string|null; created_by:string; description?:string|null }
const PC = { low:'#10b981', medium:'#f59e0b', high:'#ef4444' }
const PL = { low:'Low', medium:'Med', high:'High' }

function TasksPanel({ boardId, memberId }: { boardId:string|null; memberId:string }) {
  const { t } = useLang()
  const [tasks, setTasks]     = useState<Task[]>([])
  const [filter, setFilter]   = useState<'all'|'active'|'completed'>('all')
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding]   = useState(false)
  const [form, setForm]       = useState({title:'',deadline:'',priority:'medium' as 'low'|'medium'|'high',remind_at:'',description:''})
  const [editTask, setEditTask] = useState<Task|null>(null)
  const [editForm, setEditForm] = useState({title:'',deadline:'',priority:'medium' as 'low'|'medium'|'high',remind_at:'',description:''})

  const qs = boardId ? `?board_id=${boardId}` : ''

  useEffect(()=>{ fetch(`/api/member/focus-tasks${qs}`).then(r=>r.json()).then(d=>setTasks(d.tasks||[])) },[boardId])

  const addTask=async()=>{
    if(!form.title.trim()) return; setAdding(true)
    const res=await fetch('/api/member/focus-tasks',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        title:form.title,
        deadline:form.deadline||null,
        priority:form.priority,
        remind_at:form.remind_at?localToUTC(form.remind_at):null,
        description:form.description||null,
        board_id:boardId
      })})
    const d=await res.json()
    if(d.task){setTasks(t=>[d.task,...t]);setForm({title:'',deadline:'',priority:'medium',remind_at:'',description:''});setShowForm(false)}
    setAdding(false)
  }

  const toggleDone=async(task:Task)=>{
    setTasks(ts=>ts.map(t=>t.id===task.id?{...t,done:!t.done}:t))
    await fetch('/api/member/focus-tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:task.id,done:!task.done})})
  }

  const deleteTask=async(id:string)=>{
    setTasks(ts=>ts.filter(t=>t.id!==id))
    await fetch(`/api/member/focus-tasks?id=${id}`,{method:'DELETE'})
  }

  const openEditTask=(task:Task)=>{
    setEditForm({
      title:task.title,
      deadline:task.deadline?task.deadline.slice(0,10):'',
      priority:task.priority as 'low'|'medium'|'high',
      remind_at:task.remind_at?utcToLocal(task.remind_at):'',
      description:task.description||'',
    })
    setEditTask(task)
  }

  const saveTaskEdit=async()=>{
    if(!editTask||!editForm.title.trim()) return
    const updates={
      id:editTask.id,
      title:editForm.title,
      deadline:editForm.deadline||null,
      priority:editForm.priority,
      remind_at:editForm.remind_at?localToUTC(editForm.remind_at):null,
      description:editForm.description||null,
    }
    setTasks(ts=>ts.map(t=>t.id===editTask.id?{...t,...updates,remind_at:updates.remind_at??null,deadline:updates.deadline??null}:t))
    await fetch('/api/member/focus-tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)})
    setEditTask(null)
  }

  const visible   = tasks.filter(t=>filter==='all'?true:filter==='active'?!t.done:t.done)
  const isOverdue = (t:Task)=>!t.done&&t.deadline&&new Date(t.deadline)<new Date()
  const canDelete = (t:Task)=>t.created_by===memberId

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden h-full" style={{minHeight:480}}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#8b5cf610'}}><Check size={14} style={{color:'#8b5cf6'}}/></div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t('Tasks','المهام')}</span>
          <span className="text-xs text-gray-400">{tasks.filter(t=>!t.done).length} {t('active','نشطة')}</span>
        </div>
        <button onClick={()=>setShowForm(f=>!f)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{background:'#8b5cf6'}}><Plus size={11}/> {t('Add','إضافة')}</button>
      </div>
      {showForm&&(
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-2 flex-shrink-0">
          <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addTask()} placeholder={t('Task title…','عنوان المهمة…')} autoFocus
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors placeholder-gray-400"/>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">{t('Deadline','الموعد النهائي')}</label>
              <input type="date" value={form.deadline} onChange={e=>setForm(f=>({...f,deadline:e.target.value}))} className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400"/></div>
            <div><label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">{t('Priority','الأولوية')}</label>
              <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value as any}))} className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 font-semibold">
                <option value="low">{t('Low','منخفضة')}</option><option value="medium">{t('Medium','متوسطة')}</option><option value="high">{t('High','عالية')}</option>
              </select></div>
          </div>
          <div><label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1 flex items-center gap-1"><AlarmClock size={9}/> {t('Reminder (your local time)','تذكير (توقيتك المحلي)')}</label>
            <input type="datetime-local" value={form.remind_at} onChange={e=>setForm(f=>({...f,remind_at:e.target.value}))}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 transition-colors"/></div>
          <div><label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">{t('Details','التفاصيل')}</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder={t('Optional notes…','ملاحظات اختيارية…')}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-violet-400 transition-colors resize-none"/></div>
          <div className="flex gap-2 pt-0.5">
            <button onClick={addTask} disabled={adding||!form.title.trim()} className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50" style={{background:'#8b5cf6'}}>{adding?t('Adding…','يضاف…'):t('Add Task','إضافة مهمة')}</button>
            <button onClick={()=>setShowForm(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">{t('Cancel','إلغاء')}</button>
          </div>
        </div>
      )}
      <div className="flex gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        {(['all','active','completed'] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filter===f?'text-white':'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`} style={filter===f?{background:'#8b5cf6'}:{}}>
            {f==='all'?t('All','الكل'):f==='active'?t('Active','نشطة'):t('Completed','مكتملة')}<span className="ml-1 opacity-60 text-[10px]">{f==='all'?tasks.length:f==='active'?tasks.filter(t=>!t.done).length:tasks.filter(t=>t.done).length}</span>
          </button>
        ))}
      </div>
      {/* Edit task modal */}
      {editTask&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setEditTask(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">{t('Edit Task','تعديل المهمة')}</span>
              <button onClick={()=>setEditTask(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Title','العنوان')}</label>
                <input value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors"/></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Deadline','الموعد النهائي')}</label>
                  <input type="date" value={editForm.deadline} onChange={e=>setEditForm(f=>({...f,deadline:e.target.value}))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400"/></div>
                <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Priority','الأولوية')}</label>
                  <select value={editForm.priority} onChange={e=>setEditForm(f=>({...f,priority:e.target.value as any}))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 font-semibold">
                    <option value="low">{t('Low','منخفضة')}</option><option value="medium">{t('Medium','متوسطة')}</option><option value="high">{t('High','عالية')}</option>
                  </select></div>
              </div>
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5 flex items-center gap-1"><AlarmClock size={9}/> {t('Reminder (your local time)','تذكير (توقيتك المحلي)')}</label>
                <input type="datetime-local" value={editForm.remind_at} onChange={e=>setEditForm(f=>({...f,remind_at:e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors"/></div>
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Details','التفاصيل')}</label>
                <textarea value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} rows={3} placeholder={t('Optional notes…','ملاحظات اختيارية…')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-violet-400 transition-colors resize-none"/></div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>setEditTask(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">{t('Cancel','إلغاء')}</button>
              <button onClick={saveTaskEdit} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'#8b5cf6'}}>{t('Save','حفظ')}</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {visible.length===0?(
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4"><Check size={18} className="text-gray-300"/><p className="text-sm text-gray-400">{filter==='completed'?t('No completed tasks yet','لا مهام مكتملة بعد'):t('All clear!','كل شيء واضح!')}</p></div>
        ):visible.map(task=>(
          <div key={task.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${task.done?'opacity-55':''}`}>
            <button onClick={()=>toggleDone(task)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${task.done?'border-transparent':'border-gray-300 dark:border-gray-600 hover:border-violet-400'}`} style={task.done?{background:'#8b5cf6',border:'2px solid #8b5cf6'}:{}}>
              {task.done&&<Check size={9} className="text-white" strokeWidth={3}/>}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm text-gray-800 dark:text-gray-200 leading-snug ${task.done?'line-through text-gray-400 dark:text-gray-500':''}`}>{task.title}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:PC[task.priority]+'20',color:PC[task.priority]}}>{task.priority==='low'?t('Low','منخفضة'):task.priority==='medium'?t('Med','متوسطة'):t('High','عالية')}</span>
                {task.deadline&&<span className={`flex items-center gap-0.5 text-[10px] font-medium ${isOverdue(task)?'text-red-500':'text-gray-400'}`}><Calendar size={9}/>{new Date(task.deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}{isOverdue(task)&&` · ${t('Overdue','متأخرة')}`}</span>}
                {task.remind_at&&<span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-500"><AlarmClock size={9}/>{new Date(task.remind_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}</span>}
              </div>
              {task.description&&<p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-snug line-clamp-2">{task.description}</p>}
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0 mt-0.5">
              {canDelete(task)&&<button onClick={()=>openEditTask(task)} className="w-6 h-6 rounded-md flex items-center justify-center text-blue-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"><Edit3 size={11}/></button>}
              {canDelete(task)&&<button onClick={()=>deleteTask(task.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={11}/></button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Calendar ──────────────────────────────────────────────────────────────────
interface CalEvent { id:string; title:string; start_at:string; end_at:string|null; all_day:boolean; color:string; description:string|null; remind_at:string|null; created_by:string; recurrence?:string }
const EVENT_COLORS=['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1','#d99401']

function CalendarPanel({ boardId, memberId }: { boardId:string|null; memberId:string }) {
  const { t, lang } = useLang()
  const today=new Date()
  const [cur, setCur]           = useState(new Date(today.getFullYear(),today.getMonth(),1))
  const [events, setEvents]     = useState<CalEvent[]>([])
  const [selDay, setSelDay]     = useState<Date|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editEvt, setEditEvt]   = useState<CalEvent|null>(null)
  const [form, setForm]         = useState({title:'',description:'',date:today.toISOString().slice(0,10),startTime:'09:00',endTime:'10:00',allDay:false,color:'#06b6d4',remind_at:'',recurrence:'none'})

  const year=cur.getFullYear(); const month=cur.getMonth()
  const daysInMonth=new Date(year,month+1,0).getDate()
  const firstDow=new Date(year,month,1).getDay()

  const fetchEvents=useCallback(()=>{
    // Fetch 1 year back so recurring events whose base date is in a prior month are included
    const from=new Date(year-1,month,1).toISOString()
    const to=new Date(year,month+1,0,23,59).toISOString()
    const qs=boardId?`&board_id=${boardId}`:''
    fetch(`/api/member/focus-calendar?from=${from}&to=${to}${qs}`).then(r=>r.json()).then(d=>setEvents(d.events||[]))
  },[year,month,boardId])

  useEffect(()=>{ fetchEvents() },[fetchEvents])

  const eventsForDay=(d:Date)=>events.filter(e=>{
    const ed=new Date(e.start_at)
    // Direct match
    if(ed.getDate()===d.getDate()&&ed.getMonth()===d.getMonth()&&ed.getFullYear()===d.getFullYear()) return true
    // Recurring: only show on dates after (or equal to) the base event date
    if(!e.recurrence||e.recurrence==='none') return false
    if(d<ed) return false
    if(e.recurrence==='weekly')  return ed.getDay()===d.getDay()
    if(e.recurrence==='monthly') return ed.getDate()===d.getDate()
    if(e.recurrence==='yearly')  return ed.getDate()===d.getDate()&&ed.getMonth()===d.getMonth()
    return false
  })

  const openAdd=(day:Date)=>{ setSelDay(day);setForm(f=>({...f,date:day.toISOString().slice(0,10)}));setEditEvt(null);setShowForm(true) }

  const submitEvent=async()=>{
    if(!form.title.trim()) return
    // Build start_at in local time then convert to UTC
    const startLocal=form.allDay?`${form.date}T00:00`:`${form.date}T${form.startTime}`
    const endLocal  =form.allDay?null:`${form.date}T${form.endTime}`
    const start_at=localToUTC(startLocal)
    const end_at  =endLocal?localToUTC(endLocal):null
    const body={title:form.title,description:form.description||null,start_at,end_at,all_day:form.allDay,color:form.color,
                remind_at:form.remind_at?localToUTC(form.remind_at):null,board_id:boardId,recurrence:form.recurrence||'none'}
    if(editEvt) await fetch('/api/member/focus-calendar',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editEvt.id,...body})})
    else        await fetch('/api/member/focus-calendar',{method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    fetchEvents();setShowForm(false);setEditEvt(null)
    setForm({title:'',description:'',date:today.toISOString().slice(0,10),startTime:'09:00',endTime:'10:00',allDay:false,color:'#06b6d4',remind_at:'',recurrence:'none'})
  }

  const deleteEvent=async(id:string)=>{
    await fetch(`/api/member/focus-calendar?id=${id}`,{method:'DELETE'})
    setEvents(e=>e.filter(x=>x.id!==id))
  }

  const startEdit=(evt:CalEvent)=>{
    const d=new Date(evt.start_at)
    setForm({
      title:evt.title,description:evt.description||'',
      date:d.toLocaleDateString('en-CA'),        // YYYY-MM-DD in local time
      startTime:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
      endTime:evt.end_at?(()=>{const ed=new Date(evt.end_at!);return `${String(ed.getHours()).padStart(2,'0')}:${String(ed.getMinutes()).padStart(2,'0')}`})():'10:00',
      allDay:evt.all_day,color:evt.color,
      remind_at:evt.remind_at?utcToLocal(evt.remind_at):'',
      recurrence:evt.recurrence||'none'
    })
    setEditEvt(evt);setShowForm(true)
  }

  const DAYS=lang==='ar'?['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const selDayEvents=selDay?eventsForDay(selDay):[]

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#06b6d410'}}><Calendar size={14} style={{color:'#06b6d4'}}/></div>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{t('Calendar','التقويم')}</span>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{cur.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={()=>setShowForm(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white mr-2" style={{background:'#06b6d4'}}><Plus size={11}/> {t('Event','حدث')}</button>
          <button onClick={()=>setCur(new Date(year,month-1,1))} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><ChevronLeft size={14}/></button>
          <button onClick={()=>setCur(new Date(today.getFullYear(),today.getMonth(),1))} className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('Today','اليوم')}</button>
          <button onClick={()=>setCur(new Date(year,month+1,1))} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><ChevronRight size={14}/></button>
        </div>
      </div>
      <div className="flex">
        <div className="flex-1 p-4">
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d=><div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
            {Array.from({length:firstDow}).map((_,i)=><div key={`e${i}`} className="bg-white dark:bg-gray-900 h-20"/>)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day=new Date(year,month,i+1)
              const isToday=day.toDateString()===today.toDateString()
              const isSel=selDay?.toDateString()===day.toDateString()
              const dayEvts=eventsForDay(day)
              return (
                <div key={i} onClick={()=>setSelDay(isSel?null:day)} className={`bg-white dark:bg-gray-900 h-20 p-1 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 overflow-hidden ${isSel?'ring-2 ring-inset ring-cyan-400':''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-0.5 transition-colors ${isToday?'text-white':'text-gray-700 dark:text-gray-300'}`} style={isToday?{background:'#06b6d4'}:{}}>{i+1}</div>
                  <div className="flex flex-col gap-0.5">
                    {dayEvts.slice(0,2).map(e=>(
                      <button key={e.id} onClick={ev=>{ev.stopPropagation();startEdit(e)}}
                        className="w-full text-left rounded px-1 leading-tight truncate hover:brightness-95 transition-all"
                        style={{background:e.color+'22',borderLeft:`2px solid ${e.color}`}}>
                        <span className="text-[9px] font-semibold" style={{color:e.color}}>{e.title}</span>
                        {!e.all_day&&<span className="text-[8px] text-gray-400 ml-0.5">{new Date(e.start_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}</span>}
                      </button>
                    ))}
                    {dayEvts.length>2&&<div className="text-[8px] text-gray-400 font-bold px-1">+{dayEvts.length-2} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {selDay&&(
          <div className="w-56 border-l border-gray-100 dark:border-gray-800 flex flex-col flex-shrink-0">
            <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{selDay.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
              <button onClick={()=>openAdd(selDay)} className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{background:'#06b6d4'}}><Plus size={11}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {selDayEvents.length===0?(
                <p className="text-xs text-gray-400 text-center py-4">{t('No events','لا أحداث')}</p>
              ):selDayEvents.map(evt=>(
                <div key={evt.id} className="rounded-lg p-2 group relative overflow-hidden" style={{background:evt.color+'18'}}>
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg" style={{background:evt.color}}/>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{evt.title}</p>
                  {!evt.all_day&&<p className="text-[10px] text-gray-400 mt-0.5">{new Date(evt.start_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})}</p>}
                  {evt.description&&<p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{evt.description}</p>}
                  {evt.created_by===memberId&&(
                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>startEdit(evt)} className="text-[10px] text-gray-400 hover:text-blue-500 transition-colors"><Edit3 size={9}/></button>
                      <button onClick={()=>deleteEvent(evt.id)} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={9}/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Add/Edit Event modal */}
      {showForm&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>{setShowForm(false);setEditEvt(null)}}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-gray-100">{editEvt?t('Edit Event','تعديل الحدث'):t('Add Event','إضافة حدث')}</span>
              <button onClick={()=>{setShowForm(false);setEditEvt(null)}} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Title','العنوان')}</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} autoFocus placeholder={t('Event title','عنوان الحدث')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/></div>
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Date','التاريخ')}</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={()=>setForm(f=>({...f,allDay:!f.allDay}))} className={`w-9 h-5 rounded-full transition-colors relative ${form.allDay?'bg-cyan-500':'bg-gray-300 dark:bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.allDay?'translate-x-4':'translate-x-0.5'}`}/>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('All day','طوال اليوم')}</span>
              </label>
              {!form.allDay&&(
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Start (local time)','البداية (توقيتك)')}</label>
                    <input type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400"/></div>
                  <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('End (local time)','النهاية (توقيتك)')}</label>
                    <input type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400"/></div>
                </div>
              )}
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Color','اللون')}</label>
                <div className="flex gap-1.5 flex-wrap">
                  {EVENT_COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} className="w-6 h-6 rounded-full transition-all" style={{background:c,outline:form.color===c?`3px solid ${c}`:'3px solid transparent',outlineOffset:'2px'}}/>)}
                </div></div>
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5 flex items-center gap-1"><AlarmClock size={9}/> {t('Reminder (your local time)','تذكير (توقيتك المحلي)')}</label>
                <input type="datetime-local" value={form.remind_at} onChange={e=>setForm(f=>({...f,remind_at:e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors"/></div>
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5 flex items-center gap-1"><RefreshCw size={9}/> {t('Recurrence','التكرار')}</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(['none','weekly','monthly','yearly'] as const).map(r=>(
                    <button key={r} type="button" onClick={()=>setForm(f=>({...f,recurrence:r}))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all capitalize ${form.recurrence===r?'text-white border-transparent':'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-cyan-400'}`}
                      style={form.recurrence===r?{background:'#06b6d4'}:{}}>
                      {r==='none'?t('No repeat','بدون تكرار'):r==='weekly'?t('weekly','أسبوعياً'):r==='monthly'?t('monthly','شهرياً'):t('yearly','سنوياً')}
                    </button>
                  ))}
                </div></div>
              <div><label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">{t('Description','الوصف')}</label>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder={t('Optional notes…','ملاحظات اختيارية…')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-cyan-400 transition-colors resize-none"/></div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={()=>{setShowForm(false);setEditEvt(null)}} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">{t('Cancel','إلغاء')}</button>
              <button onClick={submitEvent} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:form.color}}>{editEvt?t('Save','حفظ'):t('Add Event','إضافة حدث')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Board toggle ──────────────────────────────────────────────────────────────
function BoardToggle({ mode, setMode, myBoard, invitedBoards, selectedBoardId, setSelectedBoardId, onInvite }:
  { mode:BoardMode; setMode:(m:BoardMode)=>void; myBoard:SharedBoard|null; invitedBoards:SharedBoard[]; selectedBoardId:string|null; setSelectedBoardId:(id:string|null)=>void; onInvite:()=>void }) {
  const { t } = useLang()
  const allShared=[...(myBoard?[myBoard]:[]),...invitedBoards]
  const [showPicker, setShowPicker]=useState(false)
  const selBoard=allShared.find(b=>b.id===selectedBoardId)

  const switchToShared=()=>{
    if(allShared.length===0){onInvite();return}
    setMode('shared')
    if(!selectedBoardId&&allShared.length>0) setSelectedBoardId(allShared[0].id)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button onClick={()=>setMode('private')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode==='private'?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500 dark:text-gray-400'}`}>
          <Lock size={11}/> {t('Private','خاص')}
        </button>
        <button onClick={switchToShared} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode==='shared'?'text-white shadow-sm':'text-gray-500 dark:text-gray-400'}`}
          style={mode==='shared'?{background:'#06b6d4'}:{}}>
          <Globe size={11}/> {t('Shared','مشترك')}
        </button>
      </div>
      {mode==='shared'&&allShared.length>1&&(
        <div className="relative">
          <button onClick={()=>setShowPicker(p=>!p)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Users size={11}/><span className="max-w-24 truncate">{selBoard?.name||t('Select board','اختر لوحة')}</span><ChevronDown size={10}/>
          </button>
          {showPicker&&(
            <div className="absolute top-full mt-1 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50 min-w-48">
              {allShared.map(b=>(
                <button key={b.id} onClick={()=>{setSelectedBoardId(b.id);setShowPicker(false)}} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between gap-2 transition-colors">
                  <span className="truncate">{b.name}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{b.role==='owner'?t('Mine','لوحتي'):t('Invited','مدعو')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button onClick={onInvite} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <UserPlus size={11}/> {t('Invite','دعوة')}
      </button>
    </div>
  )
}

// ─── Invite modal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose }: { onClose:()=>void }) {
  const { t } = useLang()
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')
  const [msg, setMsg]       = useState('')

  const send=async()=>{
    if(!email.trim()) return
    setStatus('sending')
    const res=await fetch('/api/member/board-invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({invitee_email:email.trim()})})
    const d=await res.json()
    if(d.error){setStatus('error');setMsg(d.error)} else {setStatus('sent');setMsg(t('Invitation sent successfully!','تم إرسال الدعوة بنجاح!'))}
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2"><Share2 size={15} className="text-cyan-500"/><span className="font-bold text-gray-900 dark:text-gray-100">{t('Invite to Shared Board','دعوة إلى اللوحة المشتركة')}</span></div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t("Enter the email of another member on this platform. They'll receive a notification to accept.",'أدخل البريد الإلكتروني لعضو آخر في المنصة. سيتلقى إشعاراً للقبول.')}</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <Mail size={13} className="text-gray-400 flex-shrink-0"/>
              <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="colleague@email.com" autoFocus
                className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none min-w-0"/>
            </div>
            <button onClick={send} disabled={status==='sending'||status==='sent'} className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60 transition-all" style={{background:'#06b6d4'}}>
              {status==='sending'?'…':status==='sent'?t('Sent ✓','تم ✓'):t('Send','إرسال')}
            </button>
          </div>
          {msg&&<p className={`text-xs mt-2 ${status==='sent'?'text-emerald-500':'text-red-500'}`}>{msg}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Search bar ────────────────────────────────────────────────────────────────
function SearchBar() {
  const [engine, setEngine]=useState(ENGINES[0])
  const [query, setQuery]  =useState('')
  const inputRef=useRef<HTMLInputElement>(null)

  const go=(e?:React.FormEvent)=>{
    e?.preventDefault()
    if(!query.trim()) return
    window.open(engine.url+encodeURIComponent(query.trim()),'_blank','noopener')
    setQuery(''); inputRef.current?.focus()
  }

  return (
    <form onSubmit={go} className="flex items-center gap-1.5 rounded-2xl shadow-sm px-2 py-1.5 transition-all duration-300"
      style={{background:engine.color+'12',border:`1.5px solid ${engine.color}55`,boxShadow:`0 2px 12px ${engine.color}18`}}>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {ENGINES.map(e=>(
          <button key={e.id} type="button" title={e.label} onClick={()=>{setEngine(e);inputRef.current?.focus()}}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${engine.id===e.id?'shadow-sm':'opacity-35 hover:opacity-70'}`}
            style={engine.id===e.id?{background:e.color+'22',outline:`2px solid ${e.color}55`}:{}}>{e.logo}</button>
        ))}
      </div>
      <div className="w-px h-5 flex-shrink-0 mx-1" style={{background:engine.color+'44'}}/>
      <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search on ${engine.label}…`} className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none min-w-0"/>
      <button type="submit" className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all active:scale-95" style={{background:engine.color,boxShadow:`0 2px 8px ${engine.color}55`}}><Search size={13}/></button>
    </form>
  )
}

// ─── Sortable panel wrapper ────────────────────────────────────────────────────
function SortablePanel({ id, children, spanFull }: { id:string; children:React.ReactNode; spanFull?:boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef}
      style={{transform:CSS.Transform.toString(transform),transition,opacity:isDragging?0.45:1}}
      className={`flex flex-col${spanFull?' md:col-span-2':''}`}>
      <div className="flex items-center gap-1 mb-1 pl-1">
        <button {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors p-0.5 rounded" title="Drag to reorder">
          <GripVertical size={13}/>
        </button>
      </div>
      <div className="flex-1 h-full">{children}</div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
type PanelId = 'pomodoro'|'bookmarks'|'notes'|'tasks'|'calendar'

export default function FocusModePage() {
  const { t, lang, dir } = useLang()
  const [showCalc, setShowCalc]           = useState(false)
  const [showInvite, setShowInvite]       = useState(false)
  const [importModal, setImportModal]     = useState<{file:File;payload:any}|null>(null)
  const [importMode, setImportMode]       = useState<'merge'|'replace'>('merge')
  const [importStatus, setImportStatus]   = useState<'idle'|'loading'|'done'|'error'>('idle')
  const [importStats, setImportStats]     = useState<{bookmarks:number;notes:number;tasks:number;events:number}|null>(null)
  const importInputRef                    = useRef<HTMLInputElement>(null)
  const [boardMode, setBoardMode]         = useState<BoardMode>('private')
  const [myBoard, setMyBoard]             = useState<SharedBoard|null>(null)
  const [invitedBoards, setInvitedBoards] = useState<SharedBoard[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string|null>(null)
  const [memberId, setMemberId]           = useState<string>('')
  const [reminderToast, setReminderToast] = useState<{title:string;type:string}|null>(null)
  const reminderCtxRef = useRef<AudioContext|null>(null)
  const [panelOrder, setPanelOrder]       = useState<PanelId[]>(()=>{
    try {
      const saved=localStorage.getItem('focus_panel_order')
      if(saved) return JSON.parse(saved) as PanelId[]
    } catch {}
    return ['pomodoro','bookmarks','notes','tasks','calendar']
  })

  const sensors=useSensors(
    useSensor(PointerSensor,{activationConstraint:{distance:5}}),
    useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates})
  )

  const handleDragEnd=(event:DragEndEvent)=>{
    const {active,over}=event
    if(over&&active.id!==over.id){
      setPanelOrder(order=>{
        const oldIdx=order.indexOf(active.id as PanelId)
        const newIdx=order.indexOf(over.id as PanelId)
        const next=arrayMove(order,oldIdx,newIdx)
        try { localStorage.setItem('focus_panel_order',JSON.stringify(next)) } catch {}
        return next
      })
    }
  }

  const playReminderChime = useCallback(()=>{
    try {
      if(!reminderCtxRef.current) reminderCtxRef.current=new AudioContext()
      const ctx=reminderCtxRef.current; const t=ctx.currentTime
      const notes=[523.25,659.25,783.99]
      notes.forEach((freq,i)=>{
        const osc=ctx.createOscillator(); const g=ctx.createGain()
        osc.connect(g); g.connect(ctx.destination)
        osc.type='sine'; osc.frequency.value=freq
        const start=t+i*0.18
        g.gain.setValueAtTime(0,start)
        g.gain.linearRampToValueAtTime(0.28,start+0.04)
        g.gain.exponentialRampToValueAtTime(0.001,start+0.9)
        osc.start(start); osc.stop(start+0.9)
      })
    } catch {}
  },[])

  const handleExport = async () => {
    const res = await fetch('/api/member/focus-export')
    if (!res.ok) return
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `focus-mode-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const payload = JSON.parse(ev.target?.result as string)
        setImportModal({ file, payload })
        setImportMode('merge')
        setImportStatus('idle')
        setImportStats(null)
      } catch {
        alert('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const confirmImport = async () => {
    if (!importModal) return
    setImportStatus('loading')
    const res  = await fetch('/api/member/focus-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: importModal.payload, mode: importMode }),
    })
    const d = await res.json()
    if (d.success) {
      setImportStatus('done')
      setImportStats(d.stats)
    } else {
      setImportStatus('error')
    }
  }

  const seenReminders = useRef<Set<string>>(new Set())

  useEffect(()=>{
    const poll=()=>{
      fetch('/api/member/focus-reminders').then(r=>r.json()).then(d=>{
        const fresh=(d.reminders||[]).filter((r:any)=>!seenReminders.current.has(r.id))
        if(fresh.length>0){
          fresh.forEach((r:any)=>seenReminders.current.add(r.id))
          playReminderChime()
          setReminderToast({title:fresh[0].title,type:fresh[0].type})
          setTimeout(()=>setReminderToast(null),6000)
        }
      }).catch(()=>{})
    }
    poll()
    const iv=setInterval(poll,60_000)
    return ()=>clearInterval(iv)
  },[playReminderChime])

  useEffect(()=>{
    fetch('/api/member/shared-boards').then(r=>r.json()).then(d=>{
      if(d.myBoard)       setMyBoard(d.myBoard)
      if(d.invitedBoards) setInvitedBoards(d.invitedBoards)
      if(d.memberId)      setMemberId(d.memberId)
    })
  },[])

  const activeBoardId = boardMode==='shared' ? selectedBoardId : null

  const PANEL_MAP: Record<PanelId, React.ReactNode> = {
    pomodoro:  <PomodoroStrip/>,
    bookmarks: <BookmarksPanel boardId={activeBoardId} memberId={memberId}/>,
    notes:     <NotesPanel boardId={activeBoardId} memberId={memberId}/>,
    tasks:     <TasksPanel boardId={activeBoardId} memberId={memberId}/>,
    calendar:  <CalendarPanel boardId={activeBoardId} memberId={memberId}/>,
  }

  return (
    <div className="min-h-full p-4 md:p-5 flex flex-col gap-4" dir={dir} style={lang==='ar'?{fontFamily:'Cairo, sans-serif'}:{}}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('Focus Mode','وضع التركيز')}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{t('Focus. Write. Track. Repeat.','ركز. اكتب. تتبع. كرر.')}</p>
        </div>
        <button onClick={()=>setShowCalc(true)}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
          style={{background:'#06b6d410'}} title="Scientific Calculator">
          <Calculator size={16} style={{color:'#06b6d4'}}/>
        </button>
        {/* Export / Import */}
        <button onClick={handleExport} title="Export all data"
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
          style={{background:'#10b98110'}}>
          <Download size={15} style={{color:'#10b981'}}/>
        </button>
        <button onClick={()=>importInputRef.current?.click()} title="Import data from JSON"
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
          style={{background:'#f59e0b10'}}>
          <Upload size={15} style={{color:'#f59e0b'}}/>
        </button>
        <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileSelect}/>
        <div className="w-full sm:flex-1"><SearchBar/></div>
      </div>

      {/* Board toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BoardToggle mode={boardMode} setMode={setBoardMode} myBoard={myBoard} invitedBoards={invitedBoards} selectedBoardId={selectedBoardId} setSelectedBoardId={setSelectedBoardId} onInvite={()=>setShowInvite(true)}/>
        {boardMode==='shared'&&selectedBoardId&&(
          <p className="text-xs text-gray-400 flex items-center gap-1"><Users size={11}/> {t('Collaborative — visible to all members','تعاوني - مرئي لجميع الأعضاء')}</p>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={panelOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {panelOrder.map((id,idx)=>{
              const isLastOdd=panelOrder.length%2===1&&idx===panelOrder.length-1
              return <SortablePanel key={id} id={id} spanFull={isLastOdd}>{PANEL_MAP[id]}</SortablePanel>
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Reminder toast */}
      {reminderToast&&(
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl px-4 py-3 max-w-xs animate-in slide-in-from-bottom-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:'#06b6d410'}}>
            <AlarmClock size={15} style={{color:'#06b6d4'}}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('Reminder','تذكير')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{reminderToast.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{reminderToast.type}</p>
          </div>
          <button onClick={()=>setReminderToast(null)} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"><X size={13}/></button>
        </div>
      )}

      {showCalc   && <ScientificCalculator onClose={()=>setShowCalc(false)}/>}
      {showInvite && <InviteModal onClose={()=>setShowInvite(false)}/>}

      {/* ── Import modal ───────────────────────────────────────────────────── */}
      {importModal&&(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={()=>{ if(importStatus!=='loading') setImportModal(null) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Upload size={15} style={{color:'#f59e0b'}}/>
                <span className="font-bold text-gray-900 dark:text-gray-100">{t('Import Focus Mode Data','استيراد بيانات وضع التركيز')}</span>
              </div>
              {importStatus!=='loading'&&<button onClick={()=>setImportModal(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"><X size={14}/></button>}
            </div>

            <div className="p-5 space-y-4">
              {importStatus==='done'?(
                /* Success */
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{background:'#10b98120'}}>
                    <Check size={22} style={{color:'#10b981'}}/>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{t('Import Complete!','اكتمل الاستيراد!')}</p>
                  {importStats&&(
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[[t('Bookmarks','المفضلة'),importStats.bookmarks,'#06b6d4'],[t('Notes','الملاحظات'),importStats.notes,'#8b5cf6'],[t('Tasks','المهام'),importStats.tasks,'#10b981'],[t('Events','الأحداث'),importStats.events,'#f59e0b']].map(([label,count,color])=>(
                        <div key={label as string} className="rounded-xl p-2" style={{background:`${color}12`}}>
                          <p className="text-lg font-black" style={{color:color as string}}>{count as number}</p>
                          <p className="text-[10px] text-gray-500">{label as string}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={()=>{ setImportModal(null); window.location.reload() }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white mt-2" style={{background:'#10b981'}}>
                    {t('Done — Reload Page','تم — إعادة تحميل الصفحة')}
                  </button>
                </div>
              ):importStatus==='error'?(
                /* Error */
                <div className="text-center py-4 space-y-3">
                  <AlertTriangle size={28} className="mx-auto text-red-400"/>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('Something went wrong. Please try again.','حدث خطأ. يرجى المحاولة مرة أخرى.')}</p>
                  <button onClick={()=>setImportStatus('idle')} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{t('Try Again','حاول مرة أخرى')}</button>
                </div>
              ):(
                <>
                  {/* File summary */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('File','الملف')}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{importModal.file.name}</p>
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {[
                        [t('Bookmarks','المفضلة'),(importModal.payload.bookmarks||[]).length,'#06b6d4'],
                        [t('Notes','الملاحظات'),(importModal.payload.notes||[]).length,'#8b5cf6'],
                        [t('Tasks','المهام'),(importModal.payload.tasks||[]).length,'#10b981'],
                        [t('Events','الأحداث'),(importModal.payload.calendar_events||[]).length,'#f59e0b'],
                      ].map(([label,count,color])=>(
                        <span key={label as string} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:`${color}18`,color:color as string}}>
                          {count as number} {label as string}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mode */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('Import mode','وضع الاستيراد')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={()=>setImportMode('merge')}
                        className={`rounded-xl p-3 text-left border-2 transition-all ${importMode==='merge'?'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20':'border-gray-200 dark:border-gray-700'}`}>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Merge','دمج')}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{t('Add to existing data without deleting anything','إضافة إلى البيانات الموجودة دون حذف')}</p>
                      </button>
                      <button onClick={()=>setImportMode('replace')}
                        className={`rounded-xl p-3 text-left border-2 transition-all ${importMode==='replace'?'border-red-400 bg-red-50 dark:bg-red-900/20':'border-gray-200 dark:border-gray-700'}`}>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Replace all','استبدال الكل')}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{t('Delete current data, then import','حذف البيانات الحالية ثم الاستيراد')}</p>
                      </button>
                    </div>
                    {importMode==='replace'&&(
                      <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5"/>
                        <p className="text-[11px] text-red-600 dark:text-red-400">{t('All your current private bookmarks, notes, tasks and calendar events will be permanently deleted.','ستُحذف جميع المفضلة والملاحظات والمهام والأحداث الخاصة بك نهائياً.')}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={()=>setImportModal(null)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
                      {t('Cancel','إلغاء')}
                    </button>
                    <button onClick={confirmImport} disabled={importStatus==='loading'}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
                      style={{background:importMode==='replace'?'#ef4444':'#06b6d4'}}>
                      {importStatus==='loading'?t('Importing…','يستورد…'):importMode==='replace'?t('Replace & Import','استبدال واستيراد'):t('Import','استيراد')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
