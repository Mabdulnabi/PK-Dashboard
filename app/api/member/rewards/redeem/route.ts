import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'RWD-'
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function POST() {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }
  const mid = session.member_id

  // Get current balance
  const { data: lp } = await service
    .from('loyalty_points')
    .select('balance, total_redeemed')
    .eq('member_id', mid)
    .single()

  const balance = lp?.balance ?? 0
  if (balance < 100) {
    return NextResponse.json({ error: 'insufficient_points', min: 100 }, { status: 400 })
  }

  // Calculate redeemable: floor(balance/100)*5 EGP
  const redeemable_egp = Math.floor(balance / 100) * 5
  const points_to_redeem = Math.floor(balance / 100) * 100

  // Generate unique code
  let code = genCode()
  // Retry if collision (very unlikely)
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await service.from('coupons').select('id').eq('code', code).single()
    if (!existing) break
    code = genCode()
  }

  const now = new Date()
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 days

  // Insert coupon
  const { data: coupon, error: couponErr } = await service.from('coupons').insert({
    code,
    type: 'fixed',
    value: redeemable_egp,
    max_uses: 1,
    used_count: 0,
    is_active: true,
    expires_at: expires.toISOString(),
    description: `Rewards redemption — ${points_to_redeem} pts`,
    source: 'rewards_redemption',
    member_id: mid,
    points_redeemed: points_to_redeem,
    min_order_egp: 300,
  }).select('id, code').single()

  if (couponErr || !coupon) {
    return NextResponse.json({ error: couponErr?.message ?? 'failed' }, { status: 500 })
  }

  // Deduct points
  const newBalance = balance - points_to_redeem
  const nowIso = now.toISOString()
  await service.from('loyalty_points').update({
    balance: newBalance,
    total_redeemed: (lp?.total_redeemed ?? 0) + points_to_redeem,
    last_activity: nowIso,
    updated_at: nowIso,
  }).eq('member_id', mid)

  // Log transaction
  await service.from('loyalty_transactions').insert({
    member_id: mid,
    delta: -points_to_redeem,
    type: 'redeem',
    label: `Coupon ${code} (${redeemable_egp} EGP)`,
    label_ar: `كوبون ${code} (${redeemable_egp} جنيه)`,
    ref_id: coupon.id,
    created_at: nowIso,
  })

  return NextResponse.json({
    ok: true,
    code: coupon.code,
    value_egp: redeemable_egp,
    expires_at: expires.toISOString(),
    points_redeemed: points_to_redeem,
  })
}
