import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pk_member_token')?.value || req.headers.get('x-member-token') || ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session, error: sessionErr } = await service.rpc('verify_member_session', { p_token: token })
    if (sessionErr || !session?.valid)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { tool_id, bundle_id, amount_egp, coupon_code, existing_purchase_id, cart_items } = await req.json()
    if (!amount_egp) return NextResponse.json({ error: 'Missing amount_egp' }, { status: 400 })

    // Cart mode: array of { tool_id, quantity }
    const isCartMode = Array.isArray(cart_items) && cart_items.length > 0

    const member_id = session.member_id
    const price = Number(amount_egp)

    // Check wallet balance (EGP)
    const { data: txRow } = await service
      .from('wallet_transactions')
      .select('balance_after')
      .eq('member_id', member_id)
      .eq('currency', 'EGP')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const balance = Number(txRow?.balance_after ?? 0)
    if (balance < price)
      return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 })

    // Fetch tool name for notifications
    let toolName = 'الأداة'
    if (tool_id) {
      const { data: tool } = await service.from('shop_tools').select('name').eq('id', tool_id).single()
      if (tool?.name) toolName = tool.name
    }

    // Deduct from wallet
    const newBalance = balance - price
    const { error: txError } = await service.from('wallet_transactions').insert({
      member_id,
      type:          'deduct',
      amount:        price,
      currency:      'EGP',
      balance_after: newBalance,
      description:   `شراء: ${toolName}${coupon_code ? ` (${coupon_code})` : ''}`,
    })
    if (txError) throw txError

    // Record payment
    const { data: pay, error: payErr } = await service.from('payments').insert({
      user_id:  member_id,
      amount:   price,
      currency: 'EGP',
      gateway:  'wallet',
      status:   'completed',
      pack_id:  tool_id  || null,
      bundle_id: bundle_id || null,
    }).select('id').single()
    if (payErr) throw payErr

    const now     = new Date()
    let expiresAt: string | null = null

    if (isCartMode) {
      // Fetch all tools in the cart in one query
      const toolIds = cart_items.map((i: any) => i.tool_id)
      const { data: tools } = await service.from('shop_tools').select('id, name, duration_days').in('id', toolIds)
      const toolMap = Object.fromEntries((tools || []).map((t: any) => [t.id, t]))

      const now = new Date()
      const purchaseRows = cart_items.map((item: any) => {
        const td = toolMap[item.tool_id]
        const days = Number(td?.duration_days || 30)
        return {
          member_id,
          tool_id:        item.tool_id,
          amount_egp:     0, // distributed — logged in payment record
          payment_method: 'wallet',
          status:         'confirmed',
          reference:      pay.id,
          starts_at:      now.toISOString(),
          expires_at:     new Date(now.getTime() + days * 86400000).toISOString(),
          confirmed_at:   now.toISOString(),
        }
      })
      const { error: purchErr } = await service.from('tool_purchases').insert(purchaseRows)
      if (purchErr) throw purchErr

      const names = cart_items.map((i: any) => toolMap[i.tool_id]?.name || i.tool_id).join('، ')
      void service.from('member_notifications').insert({
        member_id,
        title:      `تم تفعيل سلتك ✅`,
        title_en:   `Cart activated ✅`,
        message:    `تم خصم ${price} ج من محفظتك وتفعيل: ${names}.`,
        message_en: `${price} EGP deducted from wallet. Activated: ${names}.`,
        type:       'success',
        link:       '/u/orders',
      })
    } else if (tool_id) {
      // Determine duration
      const { data: toolData } = await service.from('shop_tools').select('duration_days').eq('id', tool_id).single()
      const days = Number(toolData?.duration_days || 30)

      if (existing_purchase_id) {
        // Renewal: extend existing purchase
        const { data: existing } = await service
          .from('tool_purchases')
          .select('expires_at')
          .eq('id', existing_purchase_id)
          .single()

        const base = existing?.expires_at
          ? Math.max(Date.now(), new Date(existing.expires_at).getTime())
          : Date.now()
        expiresAt = new Date(base + days * 86400000).toISOString()

        await service.from('tool_purchases')
          .update({ starts_at: now.toISOString(), expires_at: expiresAt, status: 'confirmed', confirmed_at: now.toISOString() })
          .eq('id', existing_purchase_id)
      } else {
        // New purchase
        expiresAt = new Date(now.getTime() + days * 86400000).toISOString()
        const { error: purchErr } = await service.from('tool_purchases').insert({
          member_id,
          tool_id,
          amount_egp:     price,
          payment_method: 'wallet',
          status:         'confirmed',
          reference:      pay.id,
          starts_at:      now.toISOString(),
          expires_at:     expiresAt,
          confirmed_at:   now.toISOString(),
        })
        if (purchErr) throw purchErr
      }

      const expiryAr = new Date(expiresAt).toLocaleDateString('ar-EG')
      const expiryEn = new Date(expiresAt).toLocaleDateString('en-GB')
      void service.from('member_notifications').insert({
        member_id,
        title:       existing_purchase_id ? `تم تجديد اشتراكك في ${toolName} ✅` : `تم تفعيل اشتراكك ✅`,
        title_en:    existing_purchase_id ? `${toolName} subscription renewed ✅` : `Subscription activated ✅`,
        message:     existing_purchase_id
          ? `تم خصم ${price} ج من محفظتك وتجديد اشتراكك في ${toolName}. ينتهي ${expiryAr}.`
          : `اشتراكك في ${toolName} فعال حتى ${expiryAr}.`,
        message_en:  existing_purchase_id
          ? `${price} EGP deducted and ${toolName} subscription renewed. Expires ${expiryEn}.`
          : `Your ${toolName} subscription is active until ${expiryEn}.`,
        type:        'success',
        link:        '/u/orders',
      })
    }

    // Track coupon usage if a discount coupon was applied
    if (coupon_code && !isCartMode) {
      const { data: coupon } = await service
        .from('coupons')
        .select('id, used_count')
        .eq('code', coupon_code.toUpperCase().trim())
        .single()
      if (coupon) {
        await Promise.all([
          service.from('coupon_usages').insert({
            coupon_id: coupon.id,
            member_id,
            tool_id:   tool_id || null,
            used_at:   new Date().toISOString(),
          }),
          service.from('coupons')
            .update({ used_count: (coupon.used_count || 0) + 1 })
            .eq('id', coupon.id),
        ])
      }
    }

    return NextResponse.json({ ok: true, payment_id: pay.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
