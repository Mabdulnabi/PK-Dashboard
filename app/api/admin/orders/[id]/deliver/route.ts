import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const purchaseId = params.id
  const { delivery_type = 'account', email, password, key, notes } = await req.json()

  if (delivery_type === 'account' && (!email?.trim() || !password?.trim()))
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  if (delivery_type === 'key' && !key?.trim())
    return NextResponse.json({ error: 'key required' }, { status: 400 })

  const { data: purchase } = await service
    .from('tool_purchases')
    .select('id, member_id, shop_tools(id, category_slug)')
    .eq('id', purchaseId)
    .eq('status', 'confirmed')
    .single()

  if (!purchase) return NextResponse.json({ error: 'purchase not found' }, { status: 404 })
  if ((purchase as any).shop_tools?.category_slug !== 'private')
    return NextResponse.json({ error: 'not a private tool' }, { status: 400 })

  const { error } = await service.from('account_deliveries').upsert({
    purchase_id:   purchaseId,
    member_id:     (purchase as any).member_id,
    tool_id:       (purchase as any).shop_tools?.id,
    delivery_type,
    email:         delivery_type === 'account' ? email.trim()    : null,
    password_enc:  delivery_type === 'account' ? password.trim() : null,
    key_enc:       delivery_type === 'key'     ? key.trim()      : null,
    notes:         notes?.trim() || null,
    source:        'manual',
    delivered_at:  new Date().toISOString(),
    viewed_at:     null,
  }, { onConflict: 'purchase_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify member
  const toolName = (purchase as any).shop_tools?.name || 'الأداة'
  const label    = delivery_type === 'key' ? 'مفتاح التفعيل' : 'بيانات الحساب'
  service.from('member_notifications').insert({
    member_id: (purchase as any).member_id,
    title:     `تم تسليم ${label} 🎉`,
    message:   `تم تسليم ${label} الخاص بـ ${toolName}. ادخل على قسم اشتراكاتي لعرض البيانات.`,
    type:      'success',
  }).then(() => {})

  return NextResponse.json({ ok: true })
}
