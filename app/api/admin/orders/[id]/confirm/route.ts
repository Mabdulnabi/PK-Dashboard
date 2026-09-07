import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { notFound, serverError } from '@/lib/responses'

async function awardLoyaltyPoints(memberId: string, amountEgp: number, refId: string, toolName: string) {
  const base   = Math.round(amountEgp)
  const bonus  = amountEgp >= 1500 ? 300 : amountEgp >= 500 ? 100 : 0
  const earned = base + bonus
  const label    = `اشتراك ${toolName}`
  const labelEn  = `${toolName} subscription`
  const now = new Date().toISOString()

  // Upsert balance row
  const { data: existing } = await db.from('loyalty_points').select('balance, total_earned').eq('member_id', memberId).single()
  if (existing) {
    await db.from('loyalty_points').update({
      balance:      existing.balance + earned,
      total_earned: existing.total_earned + earned,
      last_activity: now,
      updated_at:   now,
    }).eq('member_id', memberId)
  } else {
    // First purchase — add welcome bonus
    const welcome = 200
    await db.from('loyalty_points').insert({ member_id: memberId, balance: earned + welcome, total_earned: earned + welcome, last_activity: now, updated_at: now })
    await db.from('loyalty_transactions').insert({ member_id: memberId, delta: welcome, type: 'welcome', label: 'Welcome Bonus', label_ar: 'مكافأة الترحيب', ref_id: null, created_at: now })
  }
  // Log earn transaction
  const txns = [{ member_id: memberId, delta: base, type: 'earn', label: labelEn, label_ar: label, ref_id: refId }]
  if (bonus > 0) txns.push({ member_id: memberId, delta: bonus, type: 'bonus', label: `Order bonus (${amountEgp >= 1500 ? '1500+' : '500+'} EGP)`, label_ar: `بونص الطلب الكبير`, ref_id: refId })
  await db.from('loyalty_transactions').insert(txns)
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: purchase } = await db
    .from('tool_purchases')
    .select('id, member_id, status, shop_tools(id, name, image_url, category_slug)')
    .eq('id', params.id)
    .single()

  if (!purchase) return notFound('purchase not found')
  if ((purchase as any).status === 'confirmed')
    return NextResponse.json({ ok: true, already: true })

  const { error } = await db
    .from('tool_purchases')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return serverError(error.message)

  const toolId2 = (purchase as any).shop_tools?.id
  if (toolId2) {
    void (async () => {
      const { data: t } = await db.from('shop_tools').select('sales_count').eq('id', toolId2).single()
      if (t != null) await db.from('shop_tools').update({ sales_count: (t.sales_count || 0) + 1 }).eq('id', toolId2)
    })()
  }

  const toolName    = (purchase as any).shop_tools?.name || 'الأداة'
  const toolId      = (purchase as any).shop_tools?.id
  const memberId    = (purchase as any).member_id
  const isPrivate   = (purchase as any).shop_tools?.category_slug === 'private'

  void db.from('member_notifications').insert({
    member_id:  memberId,
    title:      `تم تفعيل اشتراكك في ${toolName} ✅`,
    title_en:   `Your ${toolName} subscription is now active ✅`,
    message:    `تم تأكيد دفعتك وتفعيل اشتراكك في ${toolName}. ابدأ الاستخدام الآن من لوحة التحكم.`,
    message_en: `Your payment was confirmed and your ${toolName} subscription is now active. Start using it from your dashboard.`,
    type:       'success',
    link:       '/u/shop',
  })

  // Auto-deliver from stock for private tools
  if (isPrivate && toolId) {
    const { data: stockItem } = await db
      .from('private_accounts_stock')
      .select('id, delivery_type, email, password_enc, key_enc, notes')
      .eq('tool_id', toolId)
      .eq('status', 'available')
      .limit(1)
      .single()

    if (stockItem) {
      await db.from('account_deliveries').insert({
        purchase_id:   params.id,
        member_id:     memberId,
        tool_id:       toolId,
        delivery_type: stockItem.delivery_type,
        email:         stockItem.email,
        password_enc:  stockItem.password_enc,
        key_enc:       stockItem.key_enc,
        notes:         stockItem.notes,
        source:        'stock',
        delivered_at:  new Date().toISOString(),
        viewed_at:     null,
      })

      await db.from('private_accounts_stock')
        .update({ status: 'assigned', assigned_to: memberId, assigned_at: new Date().toISOString() })
        .eq('id', stockItem.id)

      const label   = stockItem.delivery_type === 'key' ? 'مفتاح التفعيل' : 'بيانات الحساب'
      const labelEn = stockItem.delivery_type === 'key' ? 'activation key' : 'account credentials'
      void db.from('member_notifications').insert({
        member_id:  memberId,
        title:      `تم تسليم ${label} 🎉`,
        title_en:   `Your ${labelEn} has been delivered 🎉`,
        message:    `تم تسليم ${label} الخاص بـ ${toolName}. ادخل على اشتراكاتي لعرض البيانات.`,
        message_en: `Your ${labelEn} for ${toolName} is ready. Go to My Subscriptions to view it.`,
        type:       'success',
        link:       '/u/shop',
      })
    }
  }

  // Increment coupon usage if this payment had a coupon applied
  void (async () => {
    const { data: payment } = await db
      .from('payments')
      .select('coupon_code, user_id')
      .eq('reference', params.id)
      .single()
    if (payment?.coupon_code) {
      const { data: coupon } = await db
        .from('coupons')
        .select('id, used_count')
        .eq('code', payment.coupon_code.toUpperCase().trim())
        .single()
      if (coupon) {
        await Promise.all([
          db.from('coupon_usages').insert({
            coupon_id: coupon.id,
            member_id: payment.user_id,
            tool_id:   toolId || null,
            used_at:   new Date().toISOString(),
          }),
          db.from('coupons')
            .update({ used_count: (coupon.used_count || 0) + 1 })
            .eq('id', coupon.id),
        ])
      }
    }
  })()

  // Award loyalty points
  void (async () => {
    const { data: purchase2 } = await db.from('tool_purchases').select('amount_egp').eq('id', params.id).single()
    if (purchase2?.amount_egp) {
      await awardLoyaltyPoints(memberId, Number(purchase2.amount_egp), params.id, toolName)
    }
  })()

  void writeAuditLog({
    action:      'payment.confirm',
    actor_type:  'admin',
    target_type: 'purchase',
    target_id:   params.id,
    details:     { member_id: memberId, tool_name: toolName },
  })

  // Referral reward: give referrer 20 EGP on member's first confirmed payment
  void (async () => {
    const { data: mem } = await db.from('members').select('referred_by').eq('id', memberId).single()
    if (!mem?.referred_by) return
    const { count: prevPayments } = await db
      .from('tool_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
      .eq('status', 'confirmed')
    if ((prevPayments || 0) !== 1) return  // only first payment triggers reward
    const { data: existing } = await db.from('referral_rewards').select('id').eq('referred_id', memberId).single()
    if (existing) return  // already rewarded
    await db.from('referral_rewards').insert({
      referrer_id:  mem.referred_by,
      referred_id:  memberId,
      reward_egp:   20,
      status:       'pending',
      triggered_by: 'first_payment',
    })
    void db.from('member_notifications').insert({
      member_id:  mem.referred_by,
      title:      'مكافأة إحالة 🎁',
      title_en:   'Referral Reward 🎁',
      message:    'أحد أصدقائك أتم أول عملية شراء! حصلت على 20 جنيه مكافأة إحالة.',
      message_en: 'Your referred friend completed their first purchase! You earned a 20 EGP referral reward.',
      type:       'success',
      link:       '/u/rewards',
    })
  })()

  return NextResponse.json({ ok: true })
}
