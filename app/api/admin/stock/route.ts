import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: tools } = await service
    .from('shop_tools').select('id, name, image_url').eq('category_slug', 'private')

  const { data: stock } = await service
    .from('private_accounts_stock')
    .select('id, tool_id, email, notes, status, assigned_to, assigned_at, created_at, members(full_name,email)')
    .order('created_at', { ascending: false })

  // Count per tool
  const counts: Record<string, { available: number; assigned: number }> = {}
  ;(stock || []).forEach((s: any) => {
    if (!counts[s.tool_id]) counts[s.tool_id] = { available: 0, assigned: 0 }
    counts[s.tool_id][s.status as 'available' | 'assigned']++
  })

  return NextResponse.json({
    tools: (tools || []).map((t: any) => ({ ...t, ...( counts[t.id] || { available: 0, assigned: 0 }) })),
    stock: stock || [],
  })
}

export async function POST(req: NextRequest) {
  const { tool_id, delivery_type = 'account', email, password, key, notes } = await req.json()
  if (!tool_id) return NextResponse.json({ error: 'tool_id required' }, { status: 400 })
  if (delivery_type === 'account' && (!email?.trim() || !password?.trim()))
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  if (delivery_type === 'key' && !key?.trim())
    return NextResponse.json({ error: 'key required' }, { status: 400 })

  const { data, error } = await service.from('private_accounts_stock').insert({
    tool_id,
    delivery_type,
    email:        delivery_type === 'account' ? email.trim()    : null,
    password_enc: delivery_type === 'account' ? password.trim() : null,
    key_enc:      delivery_type === 'key'     ? key.trim()      : null,
    notes:        notes?.trim() || null,
    status:       'available',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}
