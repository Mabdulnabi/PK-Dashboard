'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

import {
  Upload, FileSpreadsheet, Check, AlertCircle, X,
  ChevronRight, ChevronDown, Eye, EyeOff, Loader2,
  RefreshCw, Download, Info
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────
interface ParsedRow {
  customer_name:  string
  phone?:         string
  email?:         string
  product_name:   string
  period?:        string
  start_date?:    string
  end_date?:      string
  amount_egp?:    number
  payment_method?: string
  account_email?: string
  notes?:         string
  status:         'ready' | 'error' | 'imported'
  error?:         string
}

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done'

const PERIODS   = ['1 Month','3 Months','6 Months','1 Year']
const PAYMENTS  = ['InstaPay','Vodafone Cash','Binance Pay','Bybit','BEP20','PayPal','Cash','Other']

// Our fields and what Excel columns might be called
const FIELD_HINTS: Record<string, string[]> = {
  customer_name:  ['customer','name','customer name','عميل','اسم','الاسم'],
  phone:          ['phone','mobile','tel','تليفون','موبايل','رقم'],
  email:          ['email','mail','بريد','ايميل'],
  product_name:   ['product','tool','service','منتج','ادات','خدمة'],
  period:         ['period','duration','subscription','فترة','مدة'],
  start_date:     ['start','start date','join','joining','من','بداية'],
  end_date:       ['end','end date','expiry','expire','لحاية','نهاية'],
  amount_egp:     ['amount','price','egp','cost','مبلغ','سعر'],
  payment_method: ['payment','method','pay','دفع','طريقة دفع'],
  account_email:  ['account','google account','account email','حساب'],
  notes:          ['notes','note','remarks','ملاحظات','ملاحظة'],
}

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())
  Object.entries(FIELD_HINTS).forEach(([field, hints]) => {
    const idx = lowerHeaders.findIndex(h => hints.some(hint => h.includes(hint)))
    if (idx >= 0) map[field] = headers[idx]
  })
  return map
}

function parseDate(val: any): string | undefined {
  if (!val) return undefined
  if (typeof val === 'number') {
    // Excel serial date (days since 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1)
    const d = new Date(excelEpoch.getTime() + (val - 2) * 86400000)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
    // Try DD/MM/YYYY
    const parts = val.split(/[\/\-\.]/)
    if (parts.length === 3) {
      const d2 = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`)
      if (!isNaN(d2.getTime())) return d2.toISOString().slice(0,10)
    }
  }
  return undefined
}

function normalizePeriod(val: string): string {
  const v = val.toLowerCase()
  if (v.includes('year') || v.includes('سنة') || v.includes('12')) return '1 Year'
  if (v.includes('6') || v.includes('ست')) return '6 Months'
  if (v.includes('3') || v.includes('ثلاث')) return '3 Months'
  if (v.includes('month') || v.includes('شهر') || v.includes('1')) return '1 Month'
  return '1 Month'
}

function normalizePayment(val: string): string {
  const v = val.toLowerCase()
  if (v.includes('insta') || v.includes('انستا')) return 'InstaPay'
  if (v.includes('vodafone') || v.includes('فودافون')) return 'Vodafone Cash'
  if (v.includes('binance')) return 'Binance Pay'
  if (v.includes('bybit')) return 'Bybit'
  if (v.includes('bep') || v.includes('usdt')) return 'BEP20'
  if (v.includes('paypal')) return 'PayPal'
  if (v.includes('cash') || v.includes('كاش') || v.includes('نقد')) return 'Cash'
  return 'Other'
}

function calcEnd(start: string, period: string): string {
  const d = new Date(start)
  if (period === '1 Month')  d.setDate(d.getDate() + 30)
  if (period === '3 Months') d.setDate(d.getDate() + 91)
  if (period === '6 Months') d.setDate(d.getDate() + 182)
  if (period === '1 Year')   d.setDate(d.getDate() + 365)
  return d.toISOString().slice(0,10)
}

// ── Main component ─────────────────────────────────────────────
export default function ImportPage() {
  const [step, setStep]           = useState<Step>('upload')
  const [fileName, setFileName]   = useState('')
  const [sheets, setSheets]       = useState<string[]>([])
  const [activeSheet, setSheet]   = useState('')
  const [rawHeaders, setHeaders]  = useState<string[]>([])
  const [rawRows, setRawRows]     = useState<any[][]>([])
  const [mapping, setMapping]     = useState<Record<string,string>>({})
  const [parsed, setParsed]       = useState<ParsedRow[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState({ done:0, total:0, errors:0 })
  const [importLog, setLog]       = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // ── File upload ────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setFileName(file.name)
    const waitForXLSX = (): Promise<any> => new Promise((resolve, reject) => {
      if ((window as any).XLSX) { resolve((window as any).XLSX); return }
      let attempts = 0
      const check = setInterval(() => {
        attempts++
        if ((window as any).XLSX) { clearInterval(check); resolve((window as any).XLSX) }
        if (attempts > 50) { clearInterval(check); reject(new Error('xlsx not loaded')) }
      }, 100)
    })
    const XLSX = await waitForXLSX().catch(() => null)
    if (!XLSX) { alert('Excel library failed to load. Check your internet connection.'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const wb   = XLSX.read(data, { type:'array', cellDates:false })
      setSheets(wb.SheetNames)
      selectSheet(wb, wb.SheetNames[0])
    }
    reader.readAsArrayBuffer(file)
  }

  const selectSheet = (wb: any, sheetName: string) => {
    setSheet(sheetName)
    const ws   = wb.Sheets[sheetName]
    const json = (window as any).XLSX.utils.sheet_to_json(ws, { header:1, raw:true }) as any[][]
    if (json.length < 2) return
    const headers = json[0].map((h:any) => String(h||'').trim()).filter(Boolean)
    const rows    = json.slice(1).filter(r => r.some(c => c !== null && c !== undefined && c !== ''))
    setHeaders(headers)
    setRawRows(rows)
    const autoMapped = autoMap(headers)
    setMapping(autoMapped)
    setStep('map')
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── Build preview rows ─────────────────────────────────────
  const buildPreview = useCallback(() => {
    const rows: ParsedRow[] = rawRows.map(row => {
      const get = (field: string) => {
        const col = mapping[field]
        if (!col) return undefined
        const idx = rawHeaders.indexOf(col)
        return idx >= 0 ? row[idx] : undefined
      }

      const customerName = String(get('customer_name') || '').trim()
      const productName  = String(get('product_name')  || '').trim()
      const errors: string[] = []
      if (!customerName) errors.push('Missing customer name')
      if (!productName)  errors.push('Missing product name')

      const rawStart = get('start_date')
      const rawEnd   = get('end_date')
      const period   = get('period') ? normalizePeriod(String(get('period'))) : '1 Month'
      const startDate = parseDate(rawStart)
      let   endDate   = parseDate(rawEnd)
      if (startDate && !endDate) endDate = calcEnd(startDate, period)
      if (!startDate) errors.push('Missing or invalid start date')

      const rawAmount = get('amount_egp')
      const amount = rawAmount ? parseFloat(String(rawAmount)) : undefined
      const payment = get('payment_method')
        ? normalizePayment(String(get('payment_method')))
        : 'Other'

      return {
        customer_name:  customerName,
        phone:          String(get('phone') || '').trim() || undefined,
        email:          String(get('email') || '').trim() || undefined,
        product_name:   productName,
        period,
        start_date:     startDate,
        end_date:       endDate,
        amount_egp:     isNaN(amount!) ? undefined : amount,
        payment_method: payment,
        account_email:  String(get('account_email') || '').trim() || undefined,
        notes:          String(get('notes') || '').trim() || undefined,
        status: errors.length > 0 ? 'error' : 'ready',
        error: errors.join(', '),
      } as ParsedRow
    })
    setParsed(rows)
    setStep('preview')
  },[rawRows, rawHeaders, mapping])

  // ── Import to Supabase ─────────────────────────────────────
  const runImport = async () => {
    const readyRows = parsed.filter(r => r.status === 'ready')
    setImporting(true)
    setProgress({ done:0, total:readyRows.length, errors:0 })
    setLog([])
    setStep('importing')

    // Cache products map
    const { data: products } = await supabase.from('products').select('id,name')
    const productMap: Record<string,string> = {}
    products?.forEach((p:any) => { productMap[p.name.toLowerCase()] = p.id })

    let done = 0, errors = 0
    const logs: string[] = []

    for (const row of readyRows) {
      try {
        // 1. Find or create product
        let productId = productMap[row.product_name.toLowerCase()]
        if (!productId) {
          const { data: newP } = await supabase
            .from('products')
            .insert({ name:row.product_name, color:'#6B7280', icon:'package' })
            .select('id').single()
          if (newP) {
            productId = newP.id
            productMap[row.product_name.toLowerCase()] = newP.id
            logs.push(`✅ Created product: ${row.product_name}`)
          }
        }

        // 2. Create customer
        const { data: cust } = await supabase
          .from('customers')
          .insert({
            full_name: row.customer_name,
            phone:     row.phone || null,
            email:     row.email || null,
          })
          .select('id').single()

        if (!cust) throw new Error('Failed to create customer')

        // 3. Find account if email provided
        let accountId: string | null = null
        if (row.account_email) {
          const { data: acc } = await supabase
            .from('my_accounts')
            .select('id')
            .eq('email', row.account_email)
            .single()
          accountId = acc?.id || null
        }

        // 4. Create subscription
        const end = row.end_date || (row.start_date ? calcEnd(row.start_date, row.period||'1 Month') : new Date().toISOString().slice(0,10))
        await supabase.from('subscriptions').insert({
          customer_id:    cust.id,
          product_id:     productId,
          account_id:     accountId,
          period:         row.period || '1 Month',
          amount_egp:     row.amount_egp || 0,
          payment_method: row.payment_method || 'Other',
          start_date:     row.start_date || new Date().toISOString().slice(0,10),
          end_date:       end,
          notes:          row.notes || null,
          status:         'active',
        })

        // 5. Log transaction if amount > 0
        if (row.amount_egp && row.amount_egp > 0) {
          await supabase.from('transactions').insert({
            type:            'income',
            amount_egp:      row.amount_egp,
            description:     `${row.customer_name} - ${row.product_name}`,
            product_id:      productId,
            payment_method:  row.payment_method,
            transaction_date: row.start_date,
          })
        }

        done++
        logs.push(`✅ ${row.customer_name} → ${row.product_name}`)
      } catch (err: any) {
        errors++
        logs.push(`❌ ${row.customer_name}: ${err.message}`)
      }

      setProgress({ done: done+errors, total:readyRows.length, errors })
      setLog([...logs])
      await new Promise(r => setTimeout(r, 80)) // small delay for UI
    }

    setImporting(false)
    setStep('done')
  }

  const reset = () => {
    setStep('upload'); setFileName(''); setSheets([]); setSheet('')
    setHeaders([]); setRawRows([]); setMapping({}); setParsed([])
    setLog([]); setProgress({ done:0, total:0, errors:0 })
  }

  // ── UI helpers ─────────────────────────────────────────────
  const readyCount  = parsed.filter(r=>r.status==='ready').length
  const errorCount  = parsed.filter(r=>r.status==='error').length
  const allFields   = Object.keys(FIELD_HINTS)
  const required    = ['customer_name','product_name']

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Import from Excel" subtitle="Import subscriptions & customers from .xlsx or .xls files" />

        <div className="flex-1 overflow-auto p-5">
          <div className="max-w-3xl mx-auto flex flex-col gap-5">

            {/* ── Step indicator ── */}
            <div className="flex items-center gap-2">
              {(['upload','map','preview','done'] as const).map((s, i) => {
                const labels = ['Upload','Map Columns','Preview','Done']
                const isActive  = step === s || (step==='importing' && s==='preview')
                const isPast    = ['upload','map','preview','done'].indexOf(step) > i
                return (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                      ${isPast||step==='done' ? 'bg-emerald-500 text-white' :
                        isActive ? 'bg-red-500 text-white' :
                        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                      {isPast || step==='done'
                        ? <Check size={12}/>
                        : <span className="w-4 text-center">{i+1}</span>}
                      {labels[i]}
                    </div>
                    {i < 3 && <ChevronRight size={14} className="text-gray-300 flex-shrink-0"/>}
                  </div>
                )
              })}
            </div>

            {/* ══ STEP 1: Upload ══ */}
            {step==='upload' && (
              <div
                className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-red-400 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all"
                onDrop={onDrop}
                onDragOver={e=>e.preventDefault()}
                onClick={()=>fileRef.current?.click()}>
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <FileSpreadsheet size={28} className="text-red-500"/>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Drop your Excel file here</div>
                  <div className="text-xs text-gray-400">or click to browse — supports .xlsx, .xls</div>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e=>{ if(e.target.files?.[0]) handleFile(e.target.files[0]) }}/>
                <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                  <Info size={12} className="text-red-400 flex-shrink-0"/>
                  <span className="text-[10px] text-red-500">Required columns: Customer Name, Product Name</span>
                </div>
              </div>
            )}

            {/* ══ STEP 2: Map columns ══ */}
            {step==='map' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{fileName}</div>
                    <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"><X size={12}/>Change file</button>
                  </div>
                  <div className="text-[10px] text-gray-400">{rawRows.length} rows · {rawHeaders.length} columns</div>
                  {sheets.length > 1 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {sheets.map(s => (
                        <button key={s} onClick={()=>{
                          // re-read file for sheet switch — store wb ref
                        }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${activeSheet===s?'bg-red-500 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">Map Columns</div>
                    <div className="text-[10px] text-gray-400">Match your Excel columns to the dashboard fields. Auto-detected where possible.</div>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {allFields.map(field => {
                      const isReq = required.includes(field)
                      const label = field.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
                      return (
                        <div key={field} className="flex items-center gap-4 px-5 py-3">
                          <div className="w-36 flex-shrink-0">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</div>
                            {isReq && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Required</span>}
                          </div>
                          <select
                            value={mapping[field]||''}
                            onChange={e=>setMapping({...mapping,[field]:e.target.value||''})}
                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-red-400 transition-all">
                            <option value="">— skip this field —</option>
                            {rawHeaders.map(h=><option key={h} value={h}>{h}</option>)}
                          </select>
                          {mapping[field]
                            ? <Check size={14} className="text-emerald-500 flex-shrink-0"/>
                            : <div className="w-3.5 h-3.5 flex-shrink-0"/>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={reset} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Back
                  </button>
                  <button
                    onClick={buildPreview}
                    disabled={!mapping.customer_name || !mapping.product_name}
                    className="flex-[3] py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    Preview Data <ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 3: Preview ══ */}
            {step==='preview' && (
              <div className="flex flex-col gap-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label:'Ready to import', val:readyCount, color:'#22C55E', bg:'#DCFCE7' },
                    { label:'Has errors',       val:errorCount, color:'#EF4444', bg:'#FEE2E2' },
                    { label:'Total rows',       val:parsed.length, color:'#3B82F6', bg:'#DBEAFE' },
                  ].map(s=>(
                    <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                      <div className="text-2xl font-bold mb-1" style={{color:s.color}}>{s.val}</div>
                      <div className="text-[11px] text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Filter errors toggle */}
                {errorCount > 0 && (
                  <button onClick={()=>setShowErrors(!showErrors)}
                    className="flex items-center gap-2 text-xs font-semibold text-red-500 hover:text-red-600">
                    {showErrors?<EyeOff size={13}/>:<Eye size={13}/>}
                    {showErrors?'Show all rows':'Show only error rows'}
                  </button>
                )}

                {/* Preview table */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0">
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          {['Status','Customer','Product','Period','Start','End','Amount','Payment'].map(h=>(
                            <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-3 py-2.5 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsed
                          .filter(r => !showErrors || r.status==='error')
                          .map((r,i) => (
                          <tr key={i} className={`border-t border-gray-50 dark:border-gray-800 ${r.status==='error'?'bg-red-50/50 dark:bg-red-900/10':''}`}>
                            <td className="px-3 py-2">
                              {r.status==='error'
                                ? <span title={r.error} className="flex items-center gap-1 text-red-500 font-semibold cursor-help"><AlertCircle size={11}/>Error</span>
                                : <span className="flex items-center gap-1 text-emerald-500 font-semibold"><Check size={11}/>Ready</span>}
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{r.customer_name||'—'}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.product_name||'—'}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.period||'—'}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.start_date||'—'}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.end_date||'—'}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.amount_egp?`${r.amount_egp} EGP`:'—'}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.payment_method||'—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {errorCount > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3 flex items-start gap-2">
                    <Info size={13} className="text-red-400 flex-shrink-0 mt-0.5"/>
                    <div className="text-[11px] text-red-600 dark:text-red-400">
                      <span className="font-bold">{errorCount} rows have errors</span> and will be skipped. Fix your Excel file and re-import, or proceed to import only the {readyCount} valid rows.
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={()=>setStep('map')} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Back
                  </button>
                  <button onClick={runImport} disabled={readyCount===0}
                    className="flex-[3] py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    Import {readyCount} Rows <ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP: Importing ══ */}
            {step==='importing' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <Loader2 size={20} className="text-red-500 animate-spin flex-shrink-0"/>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Importing...</div>
                    <div className="text-[10px] text-gray-400">{progress.done} of {progress.total} rows</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-300"
                    style={{ width:`${progress.total ? (progress.done/progress.total*100) : 0}%` }}/>
                </div>
                {/* Live log */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[10px] space-y-0.5">
                  {importLog.map((l,i)=>(
                    <div key={i} className={l.startsWith('✅')?'text-emerald-600 dark:text-emerald-400':'text-red-500'}>{l}</div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ STEP: Done ══ */}
            {step==='done' && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Check size={28} className="text-emerald-500"/>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Import Complete!</div>
                  <div className="text-sm text-gray-500">
                    <span className="text-emerald-500 font-bold">{progress.done - progress.errors}</span> imported successfully
                    {progress.errors > 0 && <span> · <span className="text-red-500 font-bold">{progress.errors}</span> failed</span>}
                  </div>
                </div>
                {/* Final log */}
                <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-[10px] space-y-0.5 text-left">
                  {importLog.map((l,i)=>(
                    <div key={i} className={l.startsWith('✅')?'text-emerald-600 dark:text-emerald-400':'text-red-500'}>{l}</div>
                  ))}
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={reset}
                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2">
                    <RefreshCw size={13}/>Import Another File
                  </button>
                  <a href="/customers"
                    className="flex-[2] py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-2">
                    View Customers <ChevronRight size={14}/>
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
