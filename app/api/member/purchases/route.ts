// app/api/member/purchases/route.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — returns active purchases for dashboard
export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: session } = await service.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: purchases } = await service
    .from('tool_purchases')
    .select(`
      id, status, expires_at, starts_at, payment_method, amount_egp,
      shop_tools (
        id, name, image_url, duration_label, category_slug, video_url
      )
    `)
    .eq('member_id', session.member_id)
    .eq('status', 'confirmed')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const formatted = (purchases || []).map((p: any) => ({
    id:             p.id,
    tool_name:      p.shop_tools?.name,
    tool_image:     p.shop_tools?.image_url,
    tool_video:     p.shop_tools?.video_url,
    duration_label: p.shop_tools?.duration_label,
    category_slug:  p.shop_tools?.category_slug,
    expires_at:     p.expires_at,
    payment_method: p.payment_method,
    amount_egp:     p.amount_egp,
  }))

  return NextResponse.json({ purchases: formatted })
}

// POST — kept for manual purchase creation (admin/coupon flow)
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: session } = await service.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { tool_id, payment_method, reference, coupon_code } = await req.json()
  if (!tool_id || !payment_method) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const { data: tool } = await service.from('shop_tools').select('*').eq('id', tool_id).single()
  if (!tool) return NextResponse.json({ error: 'tool not found' }, { status: 404 })

  let price = tool.price_egp

  if (coupon_code) {
    const { data: coupon } = await service.rpc('apply_coupon', {
      p_code: coupon_code, p_member_id: session.member_id, p_plan_slug: 'none'
    })
    if (coupon?.valid && coupon.type === 'discount') {
      price = price - price * (coupon.value / 100)
    }
  }

  const { data: purchase, error } = await service.from('tool_purchases').insert({
    member_id:      session.member_id,
    tool_id,
    amount_egp:     Math.round(price),
    payment_method,
    reference:      reference || null,
    status:         'pending',
    expires_at:     new Date(Date.now() + tool.duration_days * 86400000).toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, order_id: purchase.id })
}
