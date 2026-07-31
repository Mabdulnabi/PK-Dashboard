'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import {
  Users, Globe, Zap, MessageSquare, TrendingUp, Clock,
  AlertTriangle, ArrowUpRight, CheckCircle2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts'
import { format, subMonths } from 'date-fns'

interface KPIs {
  active_members: number; expiring_7d: number; pending_members: number
  revenue_this_month: number; active_sessions: number; open_tickets: number
}

const CARD_BORDER = '1px solid #1a2233'
const CARD_BG     = '#111827'

function StatCard({ label, value, icon: Icon, accent, sub, href }: {
  label: string; value: any; icon: any; accent: string; sub?: string; href?: string
}) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden" style={{ background: CARD_BG, border: CARD_BORDER }}>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${accent}, transparent 70%)` }}/>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '18' }}>
          <Icon size={15} style={{ color: accent }} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-100 leading-none tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-gray-600">{sub}</div>}
      {href && (
        <a href={href} className="absolute bottom-4 right-4 text-gray-700 hover:text-gray-400 transition-colors">
          <ArrowUpRight size={14} />
        </a>
      )}
    </div>
  )
}

const chartTooltipStyle = {
  background: '#0D1117', border: '1px solid #1a2233',
  borderRadius: 10, fontSize: 11, color: '#e5e7eb',
}

export default function DashboardPage() {
  const [kpis,    setKpis]    = useState<KPIs | null>(null)
  const [revData, setRev]     = useState<any[]>([])
  const [memData, setMem]     = useState<any[]>([])
  const [expiring,setExp]     = useState<any[]>([])
  const [recent,  setRecent]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const [kRes, payRes, mRes, expRes, recRes] = await Promise.all([
        supabase.from('groupbuy_kpis').select('*').single(),
        supabase.from('member_payments').select('amount_egp,created_at').eq('status', 'confirmed'),
        supabase.from('members').select('created_at'),
        supabase.from('members_full').select('full_name,email,plan_slug,expires_at')
          .eq('computed_status', 'expiring').order('expires_at').limit(5),
        supabase.from('members_full').select('full_name,email,plan_slug,joined_at,computed_status')
          .order('joined_at', { ascending: false }).limit(6),
      ])
      if (kRes.data)   setKpis(kRes.data)
      if (expRes.data) setExp(expRes.data)
      if (recRes.data) setRecent(recRes.data)

      const months = Array.from({ length: 6 }, (_, i) => ({
        month:   format(subMonths(now, 5 - i), 'MMM'),
        key:     format(subMonths(now, 5 - i), 'yyyy-MM'),
        revenue: 0, members: 0,
      }))
      payRes.data?.forEach((p: any) => {
        const m = months.find(x => x.key === p.created_at.slice(0, 7))
        if (m) m.revenue += Number(p.amount_egp)
      })
      mRes.data?.forEach((m: any) => {
        const mm = months.find(x => x.key === m.created_at.slice(0, 7))
        if (mm) mm.members++
      })
      setRev(months); setMem(months)
      setLoading(false)
    }
    load()
  }, [])

  const planColor: Record<string, string> = { basic: '#3B82F6', vip: '#F59E0B', private: '#8B5CF6' }
  const statusColor: Record<string, string> = { active: '#22C55E', expiring: '#F59E0B', expired: '#EF4444', pending: '#3B82F6' }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <>
      <Topbar title="Dashboard" subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />

      <main className="flex-1 overflow-auto p-6 flex flex-col gap-5">

          {/* KPI row 1 */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Active Members"    value={kpis?.active_members ?? 0}  icon={Users}         accent="#22C55E" sub="group buy subscribers" href="/members" />
            <StatCard label="Revenue / Month"   value={`${(kpis?.revenue_this_month ?? 0).toLocaleString()} EGP`} icon={TrendingUp} accent="#EF4444" sub="confirmed payments" href="/analytics" />
            <StatCard label="Expiring in 7d"   value={kpis?.expiring_7d ?? 0}     icon={Clock}         accent="#F59E0B" sub="need renewal" href="/members" />
            <StatCard label="Active Sessions"  value={kpis?.active_sessions ?? 0} icon={Globe}         accent="#3B82F6" sub="live connections" href="/groupbuy" />
          </div>

          {/* KPI row 2 */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Pending Members"  value={kpis?.pending_members ?? 0} icon={AlertTriangle} accent="#F59E0B" sub="awaiting activation" href="/members" />
            <StatCard label="Open Tickets"     value={kpis?.open_tickets ?? 0}    icon={MessageSquare} accent="#8B5CF6" sub="support requests" href="/support" />
            <StatCard label="OneClick Today"   value="—"                          icon={Zap}           accent="#06B6D4" sub="auto-login tokens" href="/oneclick" />
            <StatCard label="System Status"    value="Online"                     icon={CheckCircle2}  accent="#22C55E" sub="all systems go" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-gray-200">Revenue — last 6 months</h2>
                <a href="/analytics" className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1">
                  Full report <ArrowUpRight size={11} />
                </a>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={revData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: '#1a2233' }} formatter={(v: any) => [`${Number(v).toLocaleString()} EGP`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-5" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-bold text-gray-200">Member Growth — last 6 months</h2>
                <a href="/members" className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1">
                  All members <ArrowUpRight size={11} />
                </a>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={memData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2233" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="members" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-2 gap-4">

            {/* Expiring soon */}
            <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: CARD_BORDER }}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-amber-500" />
                  <h2 className="text-sm font-bold text-gray-200">Expiring Soon</h2>
                </div>
                <a href="/members" className="text-[11px] text-gray-600 hover:text-gray-400 flex items-center gap-1">
                  View all <ArrowUpRight size={11} />
                </a>
              </div>
              {expiring.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-600" />
                  <p className="text-xs text-gray-600">No expirations this week</p>
                </div>
              ) : expiring.map((m, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: i < expiring.length - 1 ? CARD_BORDER : 'none' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-[11px] font-bold text-amber-400 flex-shrink-0">
                      {m.full_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-gray-300">{m.full_name}</div>
                      <div className="text-[10px] text-gray-600">{m.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold" style={{ color: planColor[m.plan_slug] || '#9CA3AF' }}>
                      {m.plan_slug}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-0.5">
                      {m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-GB') : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent members */}
            <div className="rounded-xl overflow-hidden" style={{ background: CARD_BG, border: CARD_BORDER }}>
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: CARD_BORDER }}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-blue-500" />
                  <h2 className="text-sm font-bold text-gray-200">Recent Members</h2>
                </div>
                <a href="/members" className="text-[11px] text-gray-600 hover:text-gray-400 flex items-center gap-1">
                  View all <ArrowUpRight size={11} />
                </a>
              </div>
              {recent.map((m, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: i < recent.length - 1 ? CARD_BORDER : 'none' }}>
                  <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-[11px] font-bold text-red-400 flex-shrink-0">
                    {m.full_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-gray-300 truncate">{m.full_name}</div>
                    <div className="text-[10px] text-gray-600">
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString('en-GB') : '—'}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{ color: statusColor[m.computed_status] || '#9CA3AF', background: (statusColor[m.computed_status] || '#9CA3AF') + '18' }}
                  >
                    {m.computed_status || 'active'}
                  </span>
                </div>
              ))}
            </div>

          </div>
      </main>
    </>
  )
}
