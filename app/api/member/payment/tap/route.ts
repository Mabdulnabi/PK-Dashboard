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
    const token =
      cookieStore.get('pk_member_token')?.value ||
      req.headers.get('x-member-token') || ''

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session } = await service.rpc('verify_member_session', { p_token: token })
    if (!session?.valid) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { token: cardToken, payment_id, amount, currency } = await req.json()
    if (!cardToken || !payment_id || !amount)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const tapKey = process.env.TAP_SECRET_KEY
    if (!tapKey) return NextResponse.json({ error: 'Tap not configured' }, { status: 500 })

    // Create charge via Tap API
    const chargeBody = {
      amount,
      currency: currency || 'KWD',
      customer_initiated: true,
      threeDSecure: true,
      save_card: false,
      source: { id: cardToken },
      redirect: { url: `${process.env.NEXT_PUBLIC_SITE_URL}/u/checkout/tap-callback?payment_id=${payment_id}` },
      post: { url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/member/payment/tap/webhook` },
      metadata: { payment_id, member_id: session.member_id },
    }

    const tapRes = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tapKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chargeBody),
    })
    const charge = await tapRes.json()

    if (!tapRes.ok || charge.errors?.length) {
      const msg = charge.errors?.[0]?.description || charge.message || 'Tap charge failed'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Store charge ID on the payment record
    await service.from('payments').update({ external_id: charge.id }).eq('id', payment_id)

    // If 3DS redirect needed
    if (charge.transaction?.url) {
      return NextResponse.json({ redirect_url: charge.transaction.url, charge_id: charge.id })
    }

    // Direct approval (rare without 3DS)
    if (charge.status === 'CAPTURED') {
      await service.from('payments').update({ status: 'completed' }).eq('id', payment_id)
      return NextResponse.json({ verified: true, charge_id: charge.id })
    }

    return NextResponse.json({ charge_id: charge.id, status: charge.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
