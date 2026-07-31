'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { Check, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function PaymentsPage() {
  const { t, lang, formatPrice, dir } = useLang()
  const [payments, setPayments] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [perPage,  setPerPage]  = useState(10)

  useEffect(()=>{
    fetch('/api/member/payment').then(r=>r.json()).then(d=>{ setPayments(d.payments||[]); setLoading(false) })
  },[])

  const statusIcon = (s:string) =>
    s==='completed'?<Check size={13} className="text-emerald-500"/>:
    s==='pending'  ?<Clock size={13} className="text-amber-500"/>:
                    <X size={13} className="text-red-500"/>

  const statusStyle = (s:string) =>
    s==='completed'?{bg:'#DCFCE7',color:'#166534'}:
    s==='pending'  ?{bg:'#FEF3C7',color:'#92400E'}:
                    {bg:'#FEE2E2',color:'#991B1B'}

  const statusLabel = (s:string) =>
    s==='completed'?t('Completed','مكتمل'):
    s==='pending'  ?t('Pending','معلق'):
                    t('Failed','فشل')

  const gatewayLabel: Record<string,string> = {
    instapay:'InstaPay', vodafone:'Vodafone Cash',
    binance:'Binance Pay', bybit:'Bybit Pay',
    bep20:'USDT BEP20', easykash:'EasyKash',
  }

  const totalPages = Math.ceil(payments.length/perPage)
  const paginated  = payments.slice((page-1)*perPage, page*perPage)

  const cols = [
    t('Subscription','الاشتراك'),
    t('Amount','المبلغ'),
    t('Method','وسيلة الدفع'),
    t('Status','الحالة'),
    t('Date','التاريخ'),
  ]

  return (
    <div dir={dir} className="p-3 md:p-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('Payment History','سجل المدفوعات')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{payments.length} {t('transactions','عملية')}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{t('Show','عرض')}</span>
            <select value={perPage} onChange={e=>{ setPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-300 outline-none">
              {[5,10,20,50].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
            <span>{t('rows','صف')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-[540px]">
          <colgroup>
            <col className="w-[30%]"/><col className="w-[15%]"/>
            <col className="w-[20%]"/><col className="w-[15%]"/><col className="w-[20%]"/>
          </colgroup>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {cols.map(h=>(
                <th key={h} className="text-start text-xs font-semibold uppercase tracking-wide text-gray-400 px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading&&<tr><td colSpan={5} className="text-center py-12 text-sm text-gray-400">{t('Loading...','جاري التحميل...')}</td></tr>}
            {!loading&&payments.length===0&&<tr><td colSpan={5} className="text-center py-12 text-sm text-gray-400">{t('No payments yet','لا توجد مدفوعات بعد')}</td></tr>}
            {paginated.map(p=>{
              const st=statusStyle(p.status)
              return (
                <tr key={p.id} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{p.tool_name||'—'}</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900 dark:text-gray-100">{formatPrice(Number(p.amount))}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{gatewayLabel[p.gateway]||p.gateway||'—'}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit" style={{background:st.bg,color:st.color}}>
                      {statusIcon(p.status)}{statusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {new Date(p.created_at).toLocaleString(lang==='ar'?'ar-EG':'en-US', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: 'numeric', minute: '2-digit', hour12: true
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        {totalPages>1&&(
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400">
              {(page-1)*perPage+1}–{Math.min(page*perPage,payments.length)} {t('of','من')} {payments.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                {lang==='ar'?<ChevronRight size={14}/>:<ChevronLeft size={14}/>}
              </button>
              {Array.from({length:totalPages},(_,i)=>i+1)
                .filter(n=>n===1||n===totalPages||Math.abs(n-page)<=1)
                .reduce((acc:(number|string)[],n,i,arr)=>{
                  if(i>0&&(n as number)-(arr[i-1] as number)>1) acc.push('...')
                  acc.push(n); return acc
                },[])
                .map((n,i)=>n==='...'
                  ?<span key={`d${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                  :<button key={n} onClick={()=>setPage(n as number)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${page===n?'bg-red-500 text-white':'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                      {n}
                    </button>
                )}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                {lang==='ar'?<ChevronLeft size={14}/>:<ChevronRight size={14}/>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
