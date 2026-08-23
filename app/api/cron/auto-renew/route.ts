import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Called by Vercel Cron every hour — renews subscriptions expiring in ≤24h if wallet has balance
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Get purchases with auto_renew=true expiring within 24h
  const { data: expiring } = await db
    .from('tool_purchases')
    .select('id, member_id, amount_egp, expires_at, shop_tools(duration_days, retail_price_egp, name)')
    .eq('auto_renew', true)
    .in('status', ['confirmed', 'delivered'])
    .lte('expires_at', in24h.toISOString())
    .gte('expires_at', now.toISOString())

  if (!expiring?.length) return NextResponse.json({ renewed: 0 })

  let renewed = 0
  const results: any[] = []

  for (const purchase of expiring) {
    const tool = (purchase as any).shop_tools
    const price = Number(tool?.retail_price_egp ?? purchase.amount_egp ?? 0)
    const days  = Number(tool?.duration_days ?? 30)

    // Get wallet balance
    const { data: tx } = await db
      .from('wallet_transactions')
      .select('balance_after')
      .eq('member_id', purchase.member_id)
      .eq('currency', 'EGP')
      .order('created_at', { ascending: false })
      .limit(1)

    const balance = Number(tx?.[0]?.balance_after ?? 0)
    if (balance < price) {
      // Notify member — insufficient balance
      await db.from('member_notifications').insert({
        member_id: purchase.member_id,
        title:    'فشل التجديد التلقائي',
        title_en: 'Auto-Renew Failed',
        message:    `رصيد المحفظة غير كافٍ لتجديد "${tool?.name}". يرجى شحن المحفظة.`,
        message_en: `Insufficient wallet balance to renew "${tool?.name}". Please top up.`,
        type: 'warning',
        link: '/u/wallet',
      })
      results.push({ id: purchase.id, status: 'insufficient_balance' })
      continue
    }

    // Deduct wallet
    const newBalance = balance - price
    const { error: deductErr } = await db.from('wallet_transactions').insert({
      member_id:    purchase.member_id,
      type:         'deduct',
      amount:       price,
      currency:     'EGP',
      balance_after: newBalance,
      note:         `تجديد تلقائي: ${tool?.name}`,
    })
    if (deductErr) { results.push({ id: purchase.id, status: 'deduct_error', error: deductErr.message }); continue }

    // Extend expiry
    const currentExpiry = new Date(purchase.expires_at)
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000)
    await db.from('tool_purchases').update({ expires_at: newExpiry.toISOString() }).eq('id', purchase.id)

    // Notify member
    await db.from('member_notifications').insert({
      member_id: purchase.member_id,
      title:    'تم التجديد التلقائي',
      title_en: 'Auto-Renewed Successfully',
      message:    `تم تجديد اشتراك "${tool?.name}" تلقائياً بخصم ${price} ج من محفظتك.`,
      message_en: `Your "${tool?.name}" subscription was auto-renewed. ${price} EGP deducted from wallet.`,
      type: 'success',
      link: '/u/orders',
    })

    renewed++
    results.push({ id: purchase.id, status: 'renewed', new_expiry: newExpiry.toISOString() })
  }

  return NextResponse.json({ renewed, results })
}
