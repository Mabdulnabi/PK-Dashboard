import { SupabaseClient } from '@supabase/supabase-js'

const REFERRAL_PTS = 500

interface AwardParams {
  memberId:   string
  purchaseId: string
  toolName:   string
  amountEgp:  number       // actual EGP paid (0 = free/coupon order — skip loyalty pts)
  couponCode?: string | null
}

// Shared: award loyalty points + credit referral reward on any confirmed order
export async function awardOrderRewards(db: SupabaseClient, p: AwardParams) {
  const { memberId, purchaseId, toolName, couponCode } = p
  let amountEgp = p.amountEgp
  const now = new Date().toISOString()

  // ── 1. Loyalty points ──────────────────────────────────────────────────────
  if (amountEgp > 0) {
    // Add back redeem coupon value so points reflect full product price
    if (couponCode) {
      const { data: coupon } = await db
        .from('coupons')
        .select('type, value')
        .eq('code', couponCode.toUpperCase().trim())
        .maybeSingle()
      if (coupon?.type === 'redeem') amountEgp += Number(coupon.value)
    }

    const base  = Math.round(amountEgp)
    const bonus = amountEgp >= 1500 ? 300 : amountEgp >= 500 ? 100 : 0
    const earned = base + bonus

    const { data: lp } = await db
      .from('loyalty_points')
      .select('balance, total_earned')
      .eq('member_id', memberId)
      .single()

    if (lp) {
      await db.from('loyalty_points').update({
        balance:       lp.balance + earned,
        total_earned:  lp.total_earned + earned,
        last_activity: now,
        updated_at:    now,
      }).eq('member_id', memberId)
    } else {
      // First purchase — welcome bonus
      const welcome = 200
      await db.from('loyalty_points').insert({
        member_id:     memberId,
        balance:       earned + welcome,
        total_earned:  earned + welcome,
        last_activity: now,
        updated_at:    now,
      })
      await db.from('loyalty_transactions').insert({
        member_id: memberId, delta: welcome, type: 'welcome',
        label: 'Welcome Bonus', label_ar: 'مكافأة الترحيب', ref_id: null, created_at: now,
      })
    }

    const txns: any[] = [{ member_id: memberId, delta: base, type: 'earn', label: `${toolName} subscription`, label_ar: `اشتراك ${toolName}`, ref_id: purchaseId, created_at: now }]
    if (bonus > 0) txns.push({ member_id: memberId, delta: bonus, type: 'bonus', label: `Order bonus (${amountEgp >= 1500 ? '1500+' : '500+'} EGP)`, label_ar: 'بونص الطلب الكبير', ref_id: purchaseId, created_at: now })
    await db.from('loyalty_transactions').insert(txns)
  }

  // ── 2. Referral reward (first confirmed purchase only) ────────────────────
  void (async () => {
    const { data: mem } = await db.from('members').select('referred_by').eq('id', memberId).single()
    if (!mem?.referred_by) return

    const { count: prev } = await db
      .from('tool_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('status', 'confirmed')
    if ((prev || 0) !== 1) return  // only first confirmed purchase

    const { data: existing } = await db.from('referral_rewards').select('id').eq('referred_id', memberId).maybeSingle()
    if (existing) return

    const referrerId = mem.referred_by

    const { data: rr } = await db.from('referral_rewards').insert({
      referrer_id:  referrerId,
      referred_id:  memberId,
      reward_egp:   20,
      status:       'credited',
      triggered_by: 'first_payment',
    }).select('id').single()

    const { data: rlp } = await db.from('loyalty_points').select('balance, total_earned').eq('member_id', referrerId).single()
    if (rlp) {
      await db.from('loyalty_points').update({
        balance:       rlp.balance + REFERRAL_PTS,
        total_earned:  rlp.total_earned + REFERRAL_PTS,
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

    await db.from('loyalty_transactions').insert({
      member_id:  referrerId,
      delta:      REFERRAL_PTS,
      type:       'referral',
      label:      'Referral bonus — friend made first purchase',
      label_ar:   'مكافأة إحالة — صديقك أتم أول عملية شراء',
      ref_id:     rr?.id ?? null,
      created_at: now,
    })

    void db.from('member_notifications').insert({
      member_id:  referrerId,
      title:      'مكافأة إحالة 🎁',
      title_en:   'Referral Reward 🎁',
      message:    'أحد أصدقائك أتم أول عملية شراء! ربحت 500 نقطة ولاء.',
      message_en: 'Your referred friend completed their first purchase! You earned 500 loyalty points.',
      type:       'success',
      link:       '/u/rewards',
    })
  })()
}
