import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET() {
  const [
    { data: payments },
    { data: members },
    { data: charges },
  ] = await Promise.all([
    service.from('payments').select('amount,currency,gateway,status,created_at').order('created_at', { ascending: true }),
    service.from('members').select('id,created_at,status,plan_slug'),
    service.from('wallet_charges').select('amount,currency,status,created_at,member_id,gateway_name').order('created_at', { ascending: false }).limit(200),
  ])

  const confirmed = (payments || []).filter(p => ['confirmed','completed'].includes(p.status))

  // total revenue in EGP equivalent
  const totalEgp = confirmed.reduce((s, p) => {
    const a = Number(p.amount) || 0
    return s + (p.currency === 'USD' ? a * 50 : a)
  }, 0)

  // revenue by month (last 12 months)
  const now = new Date()
  const monthlyMap: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthlyMap[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = 0
  }
  confirmed.forEach(p => {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (key in monthlyMap) {
      const a = Number(p.amount) || 0
      monthlyMap[key] += p.currency === 'USD' ? a * 50 : a
    }
  })
  const monthly = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }))

  // revenue by gateway
  const gatewayMap: Record<string, number> = {}
  confirmed.forEach(p => {
    const g = p.gateway || 'unknown'
    const a = Number(p.amount) || 0
    gatewayMap[g] = (gatewayMap[g] || 0) + (p.currency === 'USD' ? a * 50 : a)
  })
  const byGateway = Object.entries(gatewayMap)
    .map(([gateway, revenue]) => ({ gateway, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)

  // members stats
  const totalMembers = (members || []).length
  const activeMembers = (members || []).filter(m => m.status === 'active').length

  // new members by month
  const memberMonthlyMap: Record<string, number> = {}
  Object.keys(monthlyMap).forEach(k => { memberMonthlyMap[k] = 0 })
  ;(members || []).forEach(m => {
    if (!m.created_at) return
    const d = new Date(m.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (key in memberMonthlyMap) memberMonthlyMap[key]++
  })
  const memberMonthly = Object.entries(memberMonthlyMap).map(([month, count]) => ({ month, count }))

  // pending charges
  const pendingCharges = (charges || []).filter(c => c.status === 'pending').length
  const totalChargesEgp = (charges || [])
    .filter(c => c.status === 'confirmed')
    .reduce((s, c) => s + (Number(c.amount) || 0), 0)

  return NextResponse.json({
    totalEgp: Math.round(totalEgp),
    totalPayments: confirmed.length,
    totalMembers,
    activeMembers,
    pendingCharges,
    totalChargesEgp: Math.round(totalChargesEgp),
    monthly,
    memberMonthly,
    byGateway,
  })
}
