'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { TrendingUp, Users, DollarSign, Clock, RefreshCw, BarChart3 } from 'lucide-react'

interface Analytics {
  totalEgp: number
  totalPayments: number
  totalMembers: number
  activeMembers: number
  pendingCharges: number
  totalChargesEgp: number
  monthly: { month: string; revenue: number }[]
  memberMonthly: { month: string; count: number }[]
  byGateway: { gateway: string; revenue: number }[]
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 flex-1">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
    </div>
  )
}

function BarChart({ data, valueKey, labelKey, color }: { data: any[]; valueKey: string; labelKey: string; color: string }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d, i) => {
        const h = Math.max(4, Math.round((d[valueKey] / max) * 100))
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-gray-900 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10">
              {d[valueKey].toLocaleString()}
            </div>
            <div className="w-full rounded-t-sm transition-all" style={{ height: `${h}%`, background: color + (d[valueKey] > 0 ? 'ee' : '30') }}/>
            <span className="text-[8px] text-gray-400 rotate-45 origin-left whitespace-nowrap hidden sm:block">{d[labelKey].slice(5)}</span>
          </div>
        )
      })}
    </div>
  )
}

const STAT_CARDS = (a: Analytics) => [
  {
    label: 'إجمالي الإيرادات',
    value: `${fmt(a.totalEgp)} EGP`,
    sub: `${a.totalPayments} معاملة مؤكدة`,
    icon: DollarSign,
    color: '#22c55e',
    bg: '#22c55e18',
  },
  {
    label: 'إجمالي الأعضاء',
    value: fmt(a.totalMembers),
    sub: `${a.activeMembers} نشط`,
    icon: Users,
    color: '#6366f1',
    bg: '#6366f118',
  },
  {
    label: 'شحن المحفظة',
    value: `${fmt(a.totalChargesEgp)} EGP`,
    sub: `${a.pendingCharges} في الانتظار`,
    icon: TrendingUp,
    color: '#f59e0b',
    bg: '#f59e0b18',
  },
  {
    label: 'متوسط الإيراد / عضو',
    value: `${fmt(a.totalMembers ? Math.round(a.totalEgp / a.totalMembers) : 0)} EGP`,
    sub: 'إجمالي الإيرادات ÷ الأعضاء',
    icon: BarChart3,
    color: '#ec4899',
    bg: '#ec489918',
  },
]

export default function AnalyticsPage() {
  const [data,    setData]    = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    const res = await fetch('/api/admin/analytics')
    const d   = await res.json()
    if (!res.ok) { setError(d.error || 'Error'); setLoading(false); return }
    setData(d); setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar/>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar title="Analytics" subtitle="Revenue, members & gateway breakdown"/>

        <div className="flex-1 overflow-auto p-6">
          <div className="flex justify-end mb-5">
            <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium px-2 py-1">
              <RefreshCw size={12}/>Refresh
            </button>
          </div>

          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          )}

          {error && <div className="text-sm text-red-500 py-10 text-center">{error}</div>}

          {data && !loading && (
            <div className="space-y-6 max-w-6xl">

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STAT_CARDS(data).map(c => {
                  const Icon = c.icon
                  return (
                    <div key={c.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
                          <Icon size={16} style={{ color: c.color }}/>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{c.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{c.value}</div>
                      <div className="text-xs text-gray-400">{c.sub}</div>
                    </div>
                  )
                })}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Monthly revenue */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={14} className="text-emerald-400"/>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">الإيرادات الشهرية (EGP)</span>
                  </div>
                  <BarChart data={data.monthly} valueKey="revenue" labelKey="month" color="#22c55e"/>
                </div>

                {/* Monthly members */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={14} className="text-indigo-400"/>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">أعضاء جدد شهرياً</span>
                  </div>
                  <BarChart data={data.memberMonthly} valueKey="count" labelKey="month" color="#6366f1"/>
                </div>
              </div>

              {/* Gateway breakdown */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={14} className="text-amber-400"/>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">الإيرادات حسب طريقة الدفع</span>
                </div>
                {data.byGateway.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">لا توجد بيانات بعد</p>
                ) : (
                  <div className="space-y-3">
                    {data.byGateway.map((g, i) => {
                      const maxRev = data.byGateway[0]?.revenue || 1
                      const colors = ['#22c55e','#6366f1','#f59e0b','#ec4899','#0ea5e9','#14b8a6']
                      const color = colors[i % colors.length]
                      const pct = Math.round((g.revenue / data.totalEgp) * 100)
                      return (
                        <div key={g.gateway} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-28 truncate capitalize">{g.gateway}</span>
                          <MiniBar value={g.revenue} max={maxRev} color={color}/>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 w-24 text-right">{g.revenue.toLocaleString()} EGP</span>
                          <span className="text-[10px] text-gray-400 w-8">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  )
}
