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

  // Ensure referral code exists (new members)
  let { data: member } = await service
    .from('members')
    .select('id, referral_code, full_name')
    .eq('id', session.member_id)
    .single()

  if (!member?.referral_code) {
    const newCode = Math.random().toString(36).slice(2, 10).toUpperCase()
    await service.from('members').update({ referral_code: newCode }).eq('id', session.member_id)
    if (member) member.referral_code = newCode
  }

  // Count referrals
  const { count: totalReferred } = await service
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', session.member_id)

  // Sum rewards
  const { data: rewards } = await service
    .from('referral_rewards')
    .select('reward_egp, status')
    .eq('referrer_id', session.member_id)

  const earned = (rewards || []).reduce((s: number, r: any) => s + Number(r.reward_egp), 0)
  const paid   = (rewards || []).filter((r: any) => r.status === 'paid').reduce((s: number, r: any) => s + Number(r.reward_egp), 0)
  const pending = earned - paid

  // Recent referrals list
  const { data: referred } = await service
    .from('members')
    .select('id, full_name, created_at')
    .eq('referred_by', session.member_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    referral_code:  member?.referral_code,
    total_referred: totalReferred || 0,
    earned_egp:     earned,
    paid_egp:       paid,
    pending_egp:    pending,
    referred:       referred || [],
  })
}
