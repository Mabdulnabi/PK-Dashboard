import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }
  const mid = session.member_id

  // Run all queries in parallel
  const [
    lpRes, txRes, memberRes, spentRes, referralRes, referredRes
  ] = await Promise.all([
    // Loyalty balance
    service.from('loyalty_points').select('*').eq('member_id', mid).single(),
    // Recent transactions
    service.from('loyalty_transactions')
      .select('id, delta, type, label, label_ar, created_at')
      .eq('member_id', mid)
      .order('created_at', { ascending: false })
      .limit(15),
    // Member referral code
    service.from('members').select('referral_code, full_name').eq('id', mid).single(),
    // Total spent (for rank) — same source as profile page
    service.from('payments')
      .select('amount, currency')
      .eq('user_id', mid)
      .in('status', ['confirmed', 'completed']),
    // Referral rewards (points from referrals)
    service.from('referral_rewards')
      .select('reward_egp, status')
      .eq('referrer_id', mid),
    // Referred friends count + list
    service.from('members')
      .select('id, full_name, created_at')
      .eq('referred_by', mid)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const lp = lpRes.data
  const balance       = lp?.balance       ?? 0
  const total_earned  = lp?.total_earned  ?? 0
  const total_redeemed = lp?.total_redeemed ?? 0
  const last_activity = lp?.last_activity ?? null

  const total_spent_egp = (spentRes.data || []).reduce((s: number, r: any) => {
    const amt = Number(r.amount) || 0
    return s + (r.currency === 'USD' ? amt * 50 : amt)
  }, 0)

  const referral_code   = memberRes.data?.referral_code ?? null
  const total_referred  = referredRes.data?.length ?? 0
  const referral_points = (referralRes.data || []).reduce(
    (s: number, r: any) => s + Math.round(Number(r.reward_egp || 0) * 20), 0
    // 20 EGP reward → 500 points (20 * 20 = actually: reward_egp stored, convert: 1pt = 0.05 EGP → pts = reward_egp / 0.05 = reward_egp * 20)
  )

  // Expiry warning: points expire 4 months after last_activity
  let expires_days: number | null = null
  if (last_activity) {
    const expAt = new Date(last_activity)
    expAt.setMonth(expAt.getMonth() + 4)
    const diff = Math.ceil((expAt.getTime() - Date.now()) / 86_400_000)
    expires_days = diff > 0 ? diff : 0
  }

  // Redeemable EGP = floor(balance / 100) * 5
  const redeemable_egp = Math.floor(balance / 100) * 5

  return NextResponse.json({
    balance,
    total_earned,
    total_redeemed,
    redeemable_egp,
    expires_days,
    total_spent_egp,
    transactions:     txRes.data     ?? [],
    referral_code,
    total_referred,
    referral_points,
    referred:         referredRes.data ?? [],
  })
}
