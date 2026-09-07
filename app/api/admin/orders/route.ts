import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const page   = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
  const offset = (page - 1) * limit

  const query = service
    .from('tool_purchases')
    .select(`id, member_id, created_at, expires_at, amount_egp, payment_method, shop_tools(id,name,image_url,category_slug,duration_days), members(id,full_name,email,member_code)`, { count: 'exact' })
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data: purchases, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const allPurchases = purchases || []
  const privateIds = allPurchases
    .filter((p: any) => p.shop_tools?.category_slug === 'private')
    .map((p: any) => p.id)

  const { data: deliveries } = privateIds.length
    ? await service.from('account_deliveries').select('purchase_id,delivered_at,viewed_at').in('purchase_id', privateIds)
    : { data: [] }

  const delivMap: Record<string, any> = {}
  ;(deliveries || []).forEach((d: any) => { delivMap[d.purchase_id] = d })

  const orders = allPurchases.map((p: any) => {
    const catSlug = p.shop_tools?.category_slug
    const isPrivate = catSlug === 'private'
    return {
      id:             p.id,
      member_id:      p.members?.id,
      member_name:    p.members?.full_name,
      member_email:   p.members?.email,
      member_code:    p.members?.member_code || null,
      tool_id:        p.shop_tools?.id,
      tool_name:      p.shop_tools?.name,
      tool_image:     p.shop_tools?.image_url,
      category_slug:  catSlug || 'shared',
      amount_egp:     p.amount_egp,
      payment_method: p.payment_method || null,
      created_at:     p.created_at,
      expires_at:     p.expires_at,
      duration_days:  p.shop_tools?.duration_days || null,
      delivered:      isPrivate ? !!delivMap[p.id] : null,
      delivered_at:   isPrivate ? (delivMap[p.id]?.delivered_at || null) : null,
      viewed_at:      isPrivate ? (delivMap[p.id]?.viewed_at    || null) : null,
    }
  })

  const result = status === 'pending'   ? orders.filter(o => !o.delivered)
               : status === 'delivered' ? orders.filter(o => o.delivered)
               : orders

  return NextResponse.json({ orders: result, total: count ?? 0, page, limit })
}
