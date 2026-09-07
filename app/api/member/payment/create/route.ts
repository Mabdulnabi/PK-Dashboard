// app/api/member/payment/create/route.ts
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
    const token =
      cookieStore.get('pk_member_token')?.value ||
      req.headers.get('x-member-token') || ''

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session, error: sessionErr } = await service
      .rpc('verify_member_session', { p_token: token })

    if (sessionErr || !session?.valid)
      return NextResponse.json({ error: session?.error || 'Invalid session' }, { status: 401 })

    const { gateway, amount, currency, credits, tool_id, bundle_id, cart_items, coupon_code } = await req.json()
    if (!gateway || !amount)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data, error } = await service
      .from('payments')
      .insert({
        user_id:     session.member_id,
        amount,
        currency:    currency || 'EGP',
        gateway,
        status:      'pending',
        credits:     credits || null,
        pack_id:     tool_id  || null,
        bundle_id:   bundle_id || null,
        cart_items:  cart_items || null,
        coupon_code: coupon_code || null,
      })
      .select('id')
      .single()

    if (error) throw error

    // For cart payments, immediately create pending tool_purchases so admin can see the order
    const isCart = Array.isArray(cart_items) && cart_items.length > 0
    if (isCart && !tool_id && !bundle_id) {
      const toolIds = cart_items.map((i: any) => i.tool_id)
      const { data: tools } = await service.from('shop_tools').select('id, duration_days').in('id', toolIds)
      const toolMap = Object.fromEntries((tools || []).map((t: any) => [t.id, t]))
      const now = new Date()
      const purchaseRows = cart_items.map((item: any) => {
        const days = Number(toolMap[item.tool_id]?.duration_days || 30)
        return {
          member_id:      session.member_id,
          tool_id:        item.tool_id,
          amount_egp:     0,
          payment_method: gateway,
          status:         'pending',
          reference:      data.id,
          starts_at:      now.toISOString(),
          expires_at:     new Date(now.getTime() + days * 86400000).toISOString(),
        }
      })
      await service.from('tool_purchases').insert(purchaseRows)
    }

    return NextResponse.json({ payment_id: data.id, member_token: token })

  } catch (err: any) {
    console.log('CATCH ERROR:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
