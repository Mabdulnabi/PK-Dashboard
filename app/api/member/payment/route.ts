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

    const { data, error } = await service
      .from('payments')
      .select('id, amount, currency, gateway, status, transaction_id, pack_id, verified_at, created_at')
      .eq('user_id', session.member_id)
      .order('created_at', { ascending: false })

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

    const payments = (data || []).map(p => ({
      id:             p.id,
      amount:         p.amount,
      currency:       p.currency,
      gateway:        p.gateway,
      status:         p.status,
      transaction_id: p.transaction_id,
      tool_name:      toolNames[p.pack_id] || null,
      verified_at:    p.verified_at,
      created_at:     p.created_at,
    }))

    return NextResponse.json({ payments })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
