import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: sess } = await service.rpc('verify_member_session', { p_token: token })
  if (!sess?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const purchaseId = req.nextUrl.searchParams.get('purchase_id')
  if (!purchaseId) return NextResponse.json({ error: 'purchase_id required' }, { status: 400 })

  // Verify the purchase belongs to this member
  const { data: purchase } = await service
    .from('tool_purchases')
    .select('id, member_id')
    .eq('id', purchaseId)
    .eq('member_id', sess.member_id)
    .single()

  if (!purchase) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: delivery } = await service
    .from('account_deliveries')
    .select('id, delivery_type, email, password_enc, key_enc, notes, delivered_at, viewed_at, source')
    .eq('purchase_id', purchaseId)
    .single()

  if (!delivery) return NextResponse.json({ delivery: null })

  // Mark as viewed (first time only)
  if (!delivery.viewed_at) {
    await service.from('account_deliveries')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', delivery.id)
  }

  return NextResponse.json({
    delivery: {
      delivery_type: delivery.delivery_type || 'account',
      email:         delivery.email,
      password:      delivery.password_enc,
      key:           delivery.key_enc,
      notes:         delivery.notes,
      delivered_at:  delivery.delivered_at,
      source:        delivery.source,
    }
  })
}
