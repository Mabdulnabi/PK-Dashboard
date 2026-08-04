import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/members/wallet
// body: { member_id, action: 'charge'|'deduct', amount, currency, note, gateway, gateway_name, tx_ref }
export async function POST(req: NextRequest) {
  const { member_id, action, amount, currency = 'EGP', note, gateway, gateway_name, tx_ref } = await req.json()
  if (!member_id || !action || !amount) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const cur = currency.toUpperCase() as 'EGP' | 'USD'

  // Current balance for this member + currency
  const { data: lastTx } = await service
    .from('wallet_transactions')
    .select('balance_after')
    .eq('member_id', member_id)
    .eq('currency', cur)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const currentBalance = Number(lastTx?.balance_after ?? 0)
  const amt = Number(amount)
  if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: 'invalid amount' }, { status: 400 })

  const type = action === 'charge' ? 'charge' : 'deduct'
  const balanceAfter = action === 'charge' ? currentBalance + amt : currentBalance - amt

  if (action === 'deduct' && balanceAfter < 0)
    return NextResponse.json({ error: 'insufficient balance' }, { status: 400 })

  // Verify member exists — user_id may be null for manually-created members
  const { data: memberRow } = await service.from('members').select('id, user_id').eq('id', member_id).single()
  if (!memberRow) return NextResponse.json({ error: 'member not found' }, { status: 404 })

  const { error } = await service.from('wallet_transactions').insert({
    member_id,
    ...(memberRow.user_id ? { user_id: memberRow.user_id } : {}),
    type,
    amount: amt,
    currency: cur,
    balance_before: currentBalance,
    balance_after: balanceAfter,
    description: note || (action === 'charge' ? 'Admin wallet charge' : 'Admin wallet deduction'),
    admin_note: note || null,
    gateway: gateway || null,
    gateway_name: gateway_name || null,
    tx_code: tx_ref || null,
    status: 'completed',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify member
  void service.from('member_notifications').insert({
    member_id,
    title:      action === 'charge' ? `تم شحن محفظتك ✅` : `تم خصم من محفظتك`,
    title_en:   action === 'charge' ? `Wallet credited ✅` : `Wallet debited`,
    message:    action === 'charge'
      ? `تمت إضافة ${amt} ${cur} إلى محفظتك.`
      : `تم خصم ${amt} ${cur} من محفظتك.`,
    message_en: action === 'charge'
      ? `${amt} ${cur} has been added to your wallet.`
      : `${amt} ${cur} has been deducted from your wallet.`,
    type: action === 'charge' ? 'success' : 'info',
  })

  return NextResponse.json({ ok: true, balance_after: balanceAfter })
}
