'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react'

interface Tx {
  id: string; type: string; amount: number; currency: string
  balance_before: number; balance_after: number
  description?: string; tx_code?: string; admin_name?: string
  created_at: string; gateway_name?: string; status?: string
  members?: { full_name: string; email: string } | null
}

const TYPE_COLORS: Record<string, string> = {
  charge:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  topup:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  deduct:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  deduction: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  spend:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  refund:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const TYPE_SIGN: Record<string, string> = {
  charge: '+', topup: '+', refund: '+',
  deduct: '−', deduction: '−', spend: '−',
}

export default function TransactionsPage() {
  const [txs,       setTxs]       = useState<Tx[]>([])
  const [loading,   setLoading]   = useState(true)
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [pages,     setPages]     = useState(1)
  const [search,    setSearch]    = useState('')
  const [typeFilter,setTypeFilter]= useState('')
  const [curFilter, setCurFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (typeFilter) params.set('type', typeFilter)
    if (curFilter)  params.set('currency', curFilter)
    if (search)     params.set('search', search)
    const res = await fetch(`/api/admin/transactions?${params}`)
    const d   = await res.json()
    setTxs(d.transactions || [])
    setTotal(d.total || 0)
    setPages(d.pages || 1)
    setLoading(false)
  }, [page, typeFilter, curFilter, search])

  useEffect(() => { load() }, [load])

  const amtColor = (type: string) => ['charge','topup','refund'].includes(type) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Transactions" subtitle={`${total.toLocaleString()} wallet transaction${total !== 1 ? 's' : ''}`}/>

        <div className="flex-1 overflow-auto p-6">

          {/* Filters */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search member or tx code…"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-400"/>
            </div>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400">
              <option value="">All types</option>
              <option value="charge">Charge / Top-up</option>
              <option value="deduct">Deduct / Spend</option>
              <option value="refund">Refund</option>
            </select>
            <select value={curFilter} onChange={e => { setCurFilter(e.target.value); setPage(1) }}
              className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 outline-none focus:border-indigo-400">
              <option value="">All currencies</option>
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
            </select>
            <button onClick={load} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1">
              <RefreshCw size={12}/>Refresh
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['العضو','النوع','المبلغ','العملة','الرصيد بعد','الوصف','الكود','التاريخ'].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="py-20 text-center">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"/>
                    </td></tr>
                  ) : txs.length === 0 ? (
                    <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">No transactions found</td></tr>
                  ) : txs.map(tx => {
                    const sign = TYPE_SIGN[tx.type] || ''
                    const cls  = TYPE_COLORS[tx.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    return (
                      <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{tx.members?.full_name || '—'}</div>
                          <div className="text-gray-400 text-[10px]">{tx.members?.email || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>{tx.type}</span>
                        </td>
                        <td className={`px-4 py-3 font-bold tabular-nums ${amtColor(tx.type)}`}>
                          {sign}{Number(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{tx.currency}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 tabular-nums">
                          {Number(tx.balance_after).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{tx.description || tx.gateway_name || '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-400">{tx.tx_code || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString('en-GB', { day:'numeric', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400">{total.toLocaleString()} total</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
                    <ChevronRight size={14}/>
                  </button>
                  <span className="text-xs text-gray-500 px-2">{page} / {pages}</span>
                  <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors">
                    <ChevronLeft size={14}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
