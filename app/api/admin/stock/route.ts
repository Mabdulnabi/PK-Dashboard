import { NextRequest, NextResponse } from 'next/server'
import { db as service } from '@/lib/db'

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

  // Notify members who have a pending purchase for this tool
  const { data: tool } = await service
    .from('shop_tools').select('name').eq('id', tool_id).single()

  if (tool) {
    const { data: pendingMembers } = await service
      .from('tool_purchases')
      .select('member_id')
      .eq('shop_tool_id', tool_id)
      .eq('status', 'pending')

    const memberIds = [...new Set((pendingMembers || []).map((p: any) => p.member_id))]
    if (memberIds.length > 0) {
      const notifications = memberIds.map((member_id: string) => ({
        member_id,
        title:      `${tool.name} متاح الآن 🎉`,
        title_en:   `${tool.name} is now available 🎉`,
        message:    `تم إضافة حساب جديد لـ ${tool.name}. تواصل مع الدعم لاستكمال تفعيل اشتراكك.`,
        message_en: `A new ${tool.name} account has been added. Contact support to activate your subscription.`,
        type:       'info',
      }))
      void service.from('member_notifications').insert(notifications)
    }
  }

  return NextResponse.json({ ok: true, item: data })
}
