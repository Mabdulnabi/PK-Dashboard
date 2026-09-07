import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel Cron calls this daily at 09:00 UTC
// Protected by CRON_SECRET env var
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Find expired purchases with auto_renew = true
  const { data: expired } = await service
    .from('tool_purchases')
    .select('id, member_id, tool_id, price_egp, duration_days, expires_at, shop_tools(name)')
    .eq('status', 'confirmed')
    .eq('auto_renew', true)
    .lt('expires_at', now)

  if (!expired?.length) return NextResponse.json({ ok: true, renewed: 0 })

  const renewed: string[] = []
  const failed:  string[] = []

  for (const p of expired) {
    const price = Number(p.price_egp) || 0
    const days  = Number(p.duration_days) || 30
    const name  = (p as any).shop_tools?.name || 'الأداة'

    // Get wallet balance
    const { data: txRow } = await service
      .from('wallet_transactions')
      .select('balance_after')
      .eq('member_id', p.member_id)
      .eq('currency', 'EGP')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const balance = Number(txRow?.balance_after ?? 0)

    if (balance < price) {
      // Not enough balance — notify member
      await service.from('member_notifications').insert({
        member_id:  p.member_id,
        title:      'رصيد غير كافٍ للتجديد التلقائي ⚠️',
        title_en:   'Insufficient balance for auto-renewal ⚠️',
        message:    `لم يتم تجديد اشتراكك في ${name} تلقائياً بسبب نقص الرصيد. الرصيد المطلوب: ${price} ج. اشحن محفظتك الآن.`,
        message_en: `Your ${name} subscription could not be auto-renewed due to insufficient balance. Required: ${price} EGP. Top up your wallet now.`,
        type:       'warning',
        link:       '/u/wallet',
      })
      failed.push(p.id)
      continue
    }

    // Deduct from wallet
    const newBalance = balance - price
    const { error: txError } = await service.from('wallet_transactions').insert({
      member_id:     p.member_id,
      type:          'deduct',
      amount:        price,
      currency:      'EGP',
      balance_after: newBalance,
      description:   `تجديد تلقائي: ${name}`,
    })
    if (txError) { failed.push(p.id); continue }

    // Extend subscription
    const newExpiry = new Date(
      Math.max(Date.now(), new Date(p.expires_at!).getTime()) + days * 86400000
    ).toISOString()

    const { error: upError } = await service
      .from('tool_purchases')
      .update({ expires_at: newExpiry, status: 'confirmed' })
      .eq('id', p.id)
    if (upError) { failed.push(p.id); continue }

    // Notify member of successful renewal
    await service.from('member_notifications').insert({
      member_id:  p.member_id,
      title:      `تم تجديد اشتراكك في ${name} ✅`,
      title_en:   `Your ${name} subscription was renewed ✅`,
      message:    `تم خصم ${price} ج من محفظتك وتجديد اشتراكك تلقائياً لمدة ${days} يوم. ينتهي بتاريخ ${new Date(newExpiry).toLocaleDateString('ar-EG')}.`,
      message_en: `${price} EGP was deducted and your subscription was renewed for ${days} days. Expires on ${new Date(newExpiry).toLocaleDateString('en-GB')}.`,
      type:       'success',
      link:       '/u/orders',
    })

    renewed.push(p.id)
  }

  return NextResponse.json({ ok: true, renewed: renewed.length, failed: failed.length })
}
