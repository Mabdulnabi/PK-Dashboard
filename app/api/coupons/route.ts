import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: coupons } = await supabase
    .from('coupons')
    .select(`*, coupon_usages(id, member_id, tool_id, used_at, members(full_name, email))`)
    .order('created_at', { ascending: false })

  const { data: tools } = await supabase
    .from('shop_tools')
    .select('id, name, image_url')
    .eq('is_active', true)
    .order('name')

  return NextResponse.json({ coupons: coupons || [], tools: tools || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { code, description, type, value, max_uses, expires_at, tool_ids, is_active } = body

  if (!code || !type || value === undefined || value === null)
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })

  const { data, error } = await supabase.from('coupons').insert({
    code: code.toUpperCase().trim(),
    description: description || null,
    type,
    value: Number(value),
    max_uses: Number(max_uses) || 9999,
    used_count: 0,
    expires_at: expires_at || null,
    tool_ids: tool_ids?.length ? tool_ids : null,
    is_active: is_active !== false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ coupon: data })
}
