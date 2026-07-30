'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { Users, Globe, Zap, MessageSquare, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts'
import { format, subMonths } from 'date-fns'

interface KPIs { active_members:number; expiring_7d:number; pending_members:number; revenue_this_month:number; active_sessions:number; open_tickets:number }

function KpiCard({label,value,icon:Icon,color,bg,sub}:{label:string;value:any;icon:any;color:string;bg:string;sub?:string}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{background:color}}/>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:bg}}>
          <Icon size={14} style={{color}}/>
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-1.5">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [kpis,     setKpis]    = useState<KPIs|null>(null)
  const [revData,  setRev]     = useState<any[]>([])
  const [memData,  setMemData] = useState<any[]>([])
  const [expiring, setExp]     = useState<any[]>([])
  const [recent,   setRecent]  = useState<any[]>([])
  const [loading,  setLoading] = useState(true)

  useEffect(()=>{
    async function load() {
      const now = new Date()
      const [kRes,payRes,mRes,expRes,recRes] = await Promise.all([
        supabase.from('groupbuy_kpis').select('*').single(),
        supabase.from('member_payments').select('amount_egp,created_at').eq('status','confirmed'),
        supabase.from('members').select('created_at'),
        supabase.from('members_full').select('full_name,email,plan_slug,expires_at')
          .eq('computed_status','expiring').order('expires_at').limit(5),
        supabase.from('members_full').select('full_name,email,plan_slug,joined_at,computed_status')
          .order('joined_at',{ascending:false}).limit(6),
      ])
      if(kRes.data)  setKpis(kRes.data)
      if(expRes.data) setExp(expRes.data)
      if(recRes.data) setRecent(recRes.data)

      const months = Array.from({length:6},(_,i)=>({ month:format(subMonths(now,5-i),'MMM'), key:format(subMonths(now,5-i),'yyyy-MM'), revenue:0, members:0 }))
      payRes.data?.forEach((p:any)=>{ const m=months.find(x=>x.key===p.created_at.slice(0,7)); if(m) m.revenue+=Number(p.amount_egp) })
      mRes.data?.forEach((m:any)=>{ const mm=months.find(x=>x.key===m.created_at.slice(0,7)); if(mm) mm.members++ })
      setRev(months); setMemData(months)
      setLoading(false)
    }
    load()
  },[])

  const pc:any = {basic:'#3B82F6',vip:'#F59E0B',private:'#8B5CF6'}
  const sc:any = {active:'#166534',expiring:'#92400E',expired:'#991B1B',pending:'#1E40AF'}
  const sb:any = {active:'#DCFCE7',expiring:'#FEF3C7',expired:'#FEE2E2',pending:'#DBEAFE'}
  const today  = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})

  if(loading) return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>

  return (
    <>
      <Topbar title="Pro Keys — Admin" subtitle={today}/>
      <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">

        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Active Members"     value={kpis?.active_members??0}   icon={Users}         color="#22C55E" bg="#DCFCE7" sub="group buy subscribers"/>
          <KpiCard label="Revenue This Month" value={`${(kpis?.revenue_this_month??0).toLocaleString()} EGP`} icon={TrendingUp} color="#EF4444" bg="#FEE2E2" sub="confirmed payments"/>
          <KpiCard label="Expiring in 7d"    value={kpis?.expiring_7d??0}      icon={Clock}         color="#F59E0B" bg="#FEF3C7" sub="needs renewal"/>
          <KpiCard label="Active Sessions"   value={kpis?.active_sessions??0}  icon={Globe}         color="#3B82F6" bg="#DBEAFE" sub="live group buy"/>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <KpiCard label="Pending Members"   value={kpis?.pending_members??0}  icon={AlertTriangle}  color="#F59E0B" bg="#FEF3C7" sub="awaiting activation"/>
          <KpiCard label="Open Tickets"      value={kpis?.open_tickets??0}     icon={MessageSquare}  color="#8B5CF6" bg="#F3E8FF" sub="support requests"/>
          <KpiCard label="OneClick Tokens"   value="—"                         icon={Zap}            color="#06B6D4" bg="#CFFAFE" sub="today's logins"/>
          <KpiCard label="System"            value="Online ✓"                  icon={CheckCircle}    color="#22C55E" bg="#DCFCE7" sub="all systems go"/>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Revenue — last 6 months</h2>
              <a href="/analytics" className="text-xs text-red-500 hover:underline">Full →</a>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={revData} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} width={40}/>
                <Tooltip contentStyle={{borderRadius:8,border:'1px solid #F1F5F9',fontSize:12}} formatter={(v:any)=>[`${Number(v).toLocaleString()} EGP`,'Revenue']}/>
                <Bar dataKey="revenue" fill="#EF4444" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Member Growth — last 6 months</h2>
              <a href="/members" className="text-xs text-red-500 hover:underline">All →</a>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={memData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false} width={30}/>
                <Tooltip contentStyle={{borderRadius:8,border:'1px solid #F1F5F9',fontSize:12}}/>
                <Line type="monotone" dataKey="members" stroke="#3B82F6" strokeWidth={2} dot={{fill:'#3B82F6',r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">⚠️ Expiring Soon</h2>
              <a href="/members" className="text-xs text-red-500 hover:underline">All →</a>
            </div>
            {expiring.length===0
              ? <p className="text-center py-8 text-xs text-gray-400">No expirations this week 🎉</p>
              : expiring.map((m,i)=>(
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{m.full_name}</div>
                    <div className="text-[10px] text-gray-400">{m.email}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{background:pc[m.plan_slug]+'20',color:pc[m.plan_slug]}}>{m.plan_slug}</span>
                    <div className="text-[10px] text-gray-400 mt-0.5">{m.expires_at?new Date(m.expires_at).toLocaleDateString('en-GB'):'—'}</div>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">🆕 Recent Members</h2>
              <a href="/members" className="text-xs text-red-500 hover:underline">All →</a>
            </div>
            {recent.map((m,i)=>(
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-[10px] font-bold text-red-500 flex-shrink-0">
                  {m.full_name.slice(0,1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{m.full_name}</div>
                  <div className="text-[10px] text-gray-400">{m.joined_at?new Date(m.joined_at).toLocaleDateString('en-GB'):'—'}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{background:sb[m.computed_status]||'#F3F4F6',color:sc[m.computed_status]||'#374151'}}>
                  {m.computed_status||'active'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
