import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pk_member_token')?.value || req.headers.get('x-member-token') || ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session } = await service.rpc('verify_member_session', { p_token: token })
    if (!session?.valid) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { payment_id, tap_id } = await req.json()
    if (!payment_id) return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 })

    const tapKey = process.env.TAP_SECRET_KEY
    if (!tapKey) return NextResponse.json({ error: 'Tap not configured' }, { status: 500 })

    // Get stored charge ID from payment record
    const { data: payment } = await service
      .from('payments')
      .select('id, status, external_id, pack_id, bundle_id')
      .eq('id', payment_id)
      .eq('user_id', session.member_id)
      .single()

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.status === 'completed') return NextResponse.json({ verified: true })

    const chargeId = tap_id || payment.external_id
    if (!chargeId) return NextResponse.json({ error: 'No charge ID' }, { status: 400 })

    // Verify charge status with Tap
    const tapRes = await fetch(`https://api.tap.company/v2/charges/${chargeId}`, {
      headers: { 'Authorization': `Bearer ${tapKey}` },
    })
    const charge = await tapRes.json()

    if (charge.status === 'CAPTURED') {
      await service.from('payments').update({ status: 'completed', external_id: chargeId }).eq('id', payment_id)
      return NextResponse.json({ verified: true })
    }

    return NextResponse.json({ verified: false, status: charge.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
