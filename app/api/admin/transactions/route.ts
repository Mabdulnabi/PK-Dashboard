import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type     = searchParams.get('type') || ''
  const currency = searchParams.get('currency') || ''
  const search   = searchParams.get('search') || ''
  const page     = Number(searchParams.get('page') || '1')
  const limit    = 50

  let q = service.from('wallet_transactions')
    .select('id,type,amount,currency,balance_before,balance_after,description,tx_code,admin_name,created_at,member_id,gateway_name,status,members(full_name,email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page-1)*limit, page*limit-1)

  if (type)     q = q.eq('type', type)
  if (currency) q = q.eq('currency', currency)

  const { data, count, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rows = data || []
  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter((r: any) =>
      r.members?.full_name?.toLowerCase().includes(s) ||
      r.members?.email?.toLowerCase().includes(s) ||
      r.tx_code?.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s)
    )
  }

  return NextResponse.json({ transactions: rows, total: count || 0, page, pages: Math.ceil((count || 0) / limit) })
}
