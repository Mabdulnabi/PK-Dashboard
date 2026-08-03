import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET  — list pending wallet charge requests
export async function GET() {
  const { data, error } = await service
    .from('wallet_charges')
    .select('*, members(full_name,email,avatar_url,member_code)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ charges: data })
}

// POST — confirm or reject a charge request
// body: { charge_id, action: 'confirm'|'reject', admin_note }
export async function POST(req: NextRequest) {
  const { charge_id, action, admin_note } = await req.json()
  if (!charge_id || !action) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const { data: charge, error: fetchErr } = await service
    .from('wallet_charges')
    .select('*')
    .eq('id', charge_id)
    .single()

  if (fetchErr || !charge) return NextResponse.json({ error: 'charge not found' }, { status: 404 })
  if (charge.status !== 'pending') return NextResponse.json({ error: 'already processed' }, { status: 400 })

  if (action === 'confirm') {
    const cur = (charge.currency || 'EGP').toUpperCase()
    const { data: lastTx } = await service
      .from('wallet_transactions')
      .select('balance_after')
      .eq('member_id', charge.member_id)
      .eq('currency', cur)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const currentBalance = Number(lastTx?.balance_after ?? 0)
    const balanceAfter   = currentBalance + Number(charge.amount)

    await service.from('wallet_transactions').insert({
      member_id: charge.member_id,
      type: 'charge',
      amount: charge.amount,
      currency: cur,
      balance_before: currentBalance,
      balance_after: balanceAfter,
      description: `Wallet top-up via ${charge.gateway_name || charge.gateway}`,
      tx_code: charge.tx_ref,
      gateway: charge.gateway,
      gateway_name: charge.gateway_name,
      status: 'completed',
    })
  }

  await service.from('wallet_charges').update({
    status: action === 'confirm' ? 'confirmed' : 'rejected',
    admin_note: admin_note || null,
    confirmed_at: new Date().toISOString(),
  }).eq('id', charge_id)

  // Notify member
  const cur = (charge.currency || 'EGP').toUpperCase()
  if (action === 'confirm') {
    void service.from('member_notifications').insert({
      member_id:   charge.member_id,
      title:       `تم شحن محفظتك ✅`,
      title_en:    `Wallet topped up ✅`,
      message:     `تمت إضافة ${charge.amount} ${cur} إلى محفظتك بنجاح.`,
      message_en:  `${charge.amount} ${cur} has been added to your wallet.`,
      type:        'success',
    })
  } else {
    void service.from('member_notifications').insert({
      member_id:   charge.member_id,
      title:       `طلب الشحن مرفوض`,
      title_en:    `Top-up request rejected`,
      message:     `تم رفض طلب شحن محفظتك بقيمة ${charge.amount} ${cur}.${admin_note ? ' ' + admin_note : ''}`,
      message_en:  `Your top-up request of ${charge.amount} ${cur} was rejected.${admin_note ? ' ' + admin_note : ''}`,
      type:        'warning',
    })
  }

  return NextResponse.json({ ok: true })
}
