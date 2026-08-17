import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { badRequest, notFound, serverError } from '@/lib/responses'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { delivery_type = 'account', email, password, key, notes } = await req.json()

  if (delivery_type === 'account' && (!email?.trim() || !password?.trim()))
    return badRequest('email and password required')
  if (delivery_type === 'key' && !key?.trim())
    return badRequest('key required')

  const { data: purchase } = await db
    .from('tool_purchases')
    .select('id, member_id, shop_tools(id, name, category_slug)')
    .eq('id', params.id)
    .in('status', ['confirmed', 'delivered'])
    .single()

  if (!purchase) return notFound('purchase not found')
  if ((purchase as any).shop_tools?.category_slug !== 'private')
    return badRequest('not a private tool')

  const deliveryPayload = {
    purchase_id:  params.id,
    member_id:    (purchase as any).member_id,
    tool_id:      (purchase as any).shop_tools?.id,
    delivery_type,
    email:        delivery_type === 'account' ? email.trim()    : null,
    password_enc: delivery_type === 'account' ? password.trim() : null,
    key_enc:      delivery_type === 'key'     ? key.trim()      : null,
    notes:        notes?.trim() || null,
    source:       'manual',
    delivered_at: new Date().toISOString(),
    viewed_at:    null,
  }

  const { data: existing } = await db
    .from('account_deliveries')
    .select('id')
    .eq('purchase_id', params.id)
    .maybeSingle()

  let dbError
  if (existing) {
    const { error } = await db
      .from('account_deliveries')
      .update(deliveryPayload)
      .eq('purchase_id', params.id)
    dbError = error
  } else {
    const { error } = await db.from('account_deliveries').insert(deliveryPayload)
    dbError = error
  }

  if (dbError) return serverError(dbError.message)

  // Mark purchase as delivered so member can see it in their orders
  await db.from('tool_purchases').update({ status: 'delivered' }).eq('id', params.id)

  const toolName = (purchase as any).shop_tools?.name || 'الأداة'
  const label    = delivery_type === 'key' ? 'مفتاح التفعيل' : 'بيانات الحساب'
  const labelEn  = delivery_type === 'key' ? 'activation key' : 'account credentials'

  void db.from('member_notifications').insert({
    member_id:  (purchase as any).member_id,
    title:      `تم تسليم ${label} 🎉`,
    title_en:   `Your ${labelEn} has been delivered 🎉`,
    message:    `تم تسليم ${label} الخاص بـ ${toolName}. ادخل على قسم اشتراكاتي لعرض البيانات.`,
    message_en: `Your ${labelEn} for ${toolName} is ready. Go to My Subscriptions to view it.`,
    type:       'success',
    link:       '/u/shop',
  })

  return NextResponse.json({ ok: true })
}
