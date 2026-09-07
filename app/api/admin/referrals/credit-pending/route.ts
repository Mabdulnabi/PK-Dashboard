import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const REFERRAL_PTS = 500

// POST /api/admin/referrals/credit-pending
// One-time job: converts all pending referral_rewards to loyalty points
export async function POST() {
  const { data: pending } = await db
    .from('referral_rewards')
    .select('id, referrer_id')
    .eq('status', 'pending')

  if (!pending?.length) return NextResponse.json({ credited: 0 })

  let credited = 0
  const now = new Date().toISOString()

  for (const rr of pending) {
    const referrerId = rr.referrer_id

    // Add points
    const { data: lp } = await db.from('loyalty_points').select('balance, total_earned').eq('member_id', referrerId).single()
    if (lp) {
      await db.from('loyalty_points').update({
        balance:       lp.balance + REFERRAL_PTS,
        total_earned:  lp.total_earned + REFERRAL_PTS,
        last_activity: now,
        updated_at:    now,
      }).eq('member_id', referrerId)
    } else {
      await db.from('loyalty_points').insert({
        member_id:     referrerId,
        balance:       REFERRAL_PTS,
        total_earned:  REFERRAL_PTS,
        last_activity: now,
        updated_at:    now,
      })
    }

    // Log transaction
    await db.from('loyalty_transactions').insert({
      member_id:  referrerId,
      delta:      REFERRAL_PTS,
      type:       'referral',
      label:      'Referral bonus — friend made first purchase',
      label_ar:   'مكافأة إحالة — صديقك أتم أول عملية شراء',
      ref_id:     rr.id,
      created_at: now,
    })

    // Mark as credited
    await db.from('referral_rewards').update({ status: 'credited' }).eq('id', rr.id)

    credited++
  }

  return NextResponse.json({ credited })
}
