import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getMember(req: NextRequest) {
  const token = cookies().get('pk_member_token')?.value || req.headers.get('x-session-token') || ''
  if (!token) return null
  const { data } = await service.rpc('verify_member_session', { p_token: token })
  if (!data?.valid) return null
  return data.member_id as string
}

// POST — initiate an EasyKash payment for wallet top-up
// body: { amount, currency, gateway, gateway_name }
export async function POST(req: NextRequest) {
  const member_id = await getMember(req)
  if (!member_id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { amount, currency = 'EGP', gateway, gateway_name } = await req.json()
  if (!amount || !gateway) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  // Fetch merchant config from payment_gateways.uid
  const { data: gw } = await service
    .from('payment_gateways')
    .select('uid')
    .eq('id', gateway)
    .single()

  const merchantId = gw?.uid || process.env.EASYKASH_MERCHANT_ID

  let payment_url: string | null = null

  // Call EasyKash API if credentials are configured
  if (merchantId && process.env.EASYKASH_API_KEY) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'
      const r = await fetch('https://api.easykash.net/v1/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EASYKASH_API_KEY}`,
        },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: Number(amount),
          currency: currency.toUpperCase(),
          callback_url: `${baseUrl}/api/member/wallet/easykash/callback`,
          redirect_url: `${baseUrl}/u/wallet`,
        }),
      })
      const d = await r.json()
      payment_url = d.payment_url || d.url || d.checkout_url || null
    } catch {}
  }

  // Always create the pending wallet_charge record
  await service.from('wallet_charges').insert({
    member_id,
    amount: Number(amount),
    currency: currency.toUpperCase(),
    gateway,
    gateway_name,
    status: 'pending',
  })

  return NextResponse.json({ ok: true, payment_url })
}
