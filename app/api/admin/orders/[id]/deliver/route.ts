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
    .eq('status', 'confirmed')
    .single()

  if (!purchase) return notFound('purchase not found')
  if ((purchase as any).shop_tools?.category_slug !== 'private')
    return badRequest('not a private tool')

  const { error } = await db.from('account_deliveries').upsert({
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
  }, { onConflict: 'purchase_id' })

  if (error) return serverError(error.message)

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
  })

  return NextResponse.json({ ok: true })
}
