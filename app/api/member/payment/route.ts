// app/api/member/payment/route.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pk_member_token')?.value
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: session } = await service.rpc('verify_member_session', { p_token: token })
    if (!session?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const [{ data, error }, { data: walletTxs }] = await Promise.all([
      service
        .from('payments')
        .select('id, amount, currency, gateway, status, transaction_id, pack_id, bundle_id, payment_code, verified_at, created_at')
        .eq('user_id', session.member_id)
        .order('created_at', { ascending: false }),
      service
        .from('wallet_transactions')
        .select('id, type, amount, currency, created_at, description, tx_code, gateway_name, status, admin_id')
        .eq('member_id', session.member_id)
        .order('created_at', { ascending: false }),
    ])

    if (error) throw error

    // Get tool names for pack_ids
    const packIds = Array.from(new Set((data || []).filter(p => p.pack_id).map(p => p.pack_id)))
    let toolNames: Record<string, string> = {}
    if (packIds.length > 0) {
      const { data: tools } = await service
        .from('shop_tools')
        .select('id, name')
        .in('id', packIds)
      toolNames = Object.fromEntries((tools || []).map(t => [t.id, t.name]))
    }

    // Get bundle names for bundle_ids
    const bundleIds = Array.from(new Set((data || []).filter(p => p.bundle_id).map(p => p.bundle_id)))
    let bundleNames: Record<string, string> = {}
    if (bundleIds.length > 0) {
      const { data: bundles } = await service
        .from('membership_plans')
        .select('id, name')
        .in('id', bundleIds)
      bundleNames = Object.fromEntries((bundles || []).map(b => [b.id, b.name]))
    }

    const payments = (data || []).map(p => ({
      id:             p.id,
      row_type:       'payment' as const,
      payment_code:   p.payment_code,
      amount:         p.amount,
      currency:       p.currency,
      gateway:        p.gateway,
      status:         p.status,
      transaction_id: p.transaction_id,
      tool_name:      toolNames[p.pack_id] || bundleNames[p.bundle_id] || null,
      verified_at:    p.verified_at,
      created_at:     p.created_at,
    }))

    const walletRows = (walletTxs || []).map(tx => ({
      id:             tx.id,
      row_type:       'wallet_tx' as const,
      payment_code:   tx.tx_code || null,
      amount:         tx.amount,
      currency:       tx.currency,
      gateway:        tx.gateway_name || null,
      status:         tx.status || 'completed',
      transaction_id: tx.tx_code || null,
      tool_name:      tx.type === 'deduct'
        ? 'خصم رصيد / Deduct Balance'
        : 'شحن المحفظة / Topup Wallet',
      verified_at:    tx.created_at,
      created_at:     tx.created_at,
    }))

    // Merge and sort by date descending
    const allRows = [...payments, ...walletRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ payments: allRows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
