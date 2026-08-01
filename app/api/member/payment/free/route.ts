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

    const { data: session, error: sessionErr } = await service.rpc('verify_member_session', { p_token: token })
    if (sessionErr || !session?.valid)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { tool_id, duration_days, coupon_code } = await req.json()
    if (!tool_id || !duration_days)
      return NextResponse.json({ error: 'Missing tool_id or duration_days' }, { status: 400 })

    const member_id = session.member_id
    const now       = new Date()
    const expires   = new Date(now.getTime() + duration_days * 86400 * 1000)

    // Record zero-amount payment
    const { data: pay, error: payErr } = await service.from('payments').insert({
      user_id:  member_id,
      amount:   0,
      currency: 'EGP',
      gateway:  'coupon',
      status:   'completed',
      credits:  null,
      pack_id:  tool_id,
    }).select('id').single()

    if (payErr) throw payErr

    // Activate tool purchase
    const { error: purchErr } = await service.from('tool_purchases').insert({
      member_id,
      tool_id,
      amount_egp:     0,
      payment_method: `coupon${coupon_code ? ':' + coupon_code : ''}`,
      status:         'confirmed',
      reference:      coupon_code || 'FREE',
      starts_at:      now.toISOString(),
      expires_at:     expires.toISOString(),
      confirmed_at:   now.toISOString(),
    })

    if (purchErr) throw purchErr

    // Notify member: subscription activated
    const { data: tool } = await service.from('shop_tools').select('name').eq('id', tool_id).single()
    service.from('member_notifications').insert({
      member_id,
      title:   `تم تفعيل اشتراكك ✅`,
      message: `اشتراكك في ${tool?.name || 'الأداة'} فعال حتى ${expires.toLocaleDateString('ar-EG')}.`,
      type:    'success',
    }).then(() => {})

    return NextResponse.json({ ok: true, payment_id: pay.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
