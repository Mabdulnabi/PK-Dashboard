import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getMember(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
    || req.headers.get('x-session-token') || ''
  if (!token) return null
  const { data } = await service.rpc('verify_member_session', { p_token: token })
  if (!data?.valid) return null
  return data.member_id as string
}

// GET — wallet balance + last transactions
export async function GET(req: NextRequest) {
  const member_id = await getMember(req)
  if (!member_id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const [{ data: txEgp }, { data: txUsd }, { data: charges }] = await Promise.all([
    service.from('wallet_transactions').select('balance_after').eq('member_id', member_id).eq('currency','EGP').order('created_at',{ascending:false}).limit(1),
    service.from('wallet_transactions').select('balance_after').eq('member_id', member_id).eq('currency','USD').order('created_at',{ascending:false}).limit(1),
    service.from('wallet_charges').select('*').eq('member_id', member_id).order('created_at',{ascending:false}).limit(5),
  ])

  const lastCharge = await service.from('wallet_transactions')
    .select('amount,currency,created_at').eq('member_id', member_id)
    .in('type',['charge','topup']).order('created_at',{ascending:false}).limit(1)

  const lastDeduct = await service.from('wallet_transactions')
    .select('amount,currency,created_at').eq('member_id', member_id)
    .in('type',['deduct','deduction','spend']).order('created_at',{ascending:false}).limit(1)

  return NextResponse.json({
    balance_egp: Number(txEgp?.[0]?.balance_after ?? 0),
    balance_usd: Number(txUsd?.[0]?.balance_after ?? 0),
    last_charge: lastCharge.data?.[0] || null,
    last_deduct: lastDeduct.data?.[0] || null,
    pending_charges: charges || [],
  })
}

// POST — submit a wallet top-up request
// body: { amount, currency, gateway, gateway_name, tx_ref, screenshot_url }
export async function POST(req: NextRequest) {
  const member_id = await getMember(req)
  if (!member_id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { amount, currency = 'EGP', gateway, gateway_name, tx_ref, screenshot_url } = await req.json()
  if (!amount || !gateway) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const { error } = await service.from('wallet_charges').insert({
    member_id, amount: Number(amount), currency: currency.toUpperCase(),
    gateway, gateway_name, tx_ref, screenshot_url, status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
