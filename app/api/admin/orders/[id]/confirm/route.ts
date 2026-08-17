import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { notFound, serverError } from '@/lib/responses'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: purchase } = await db
    .from('tool_purchases')
    .select('id, member_id, status, shop_tools(id, name, image_url, category_slug)')
    .eq('id', params.id)
    .single()

  if (!purchase) return notFound('purchase not found')
  if ((purchase as any).status === 'confirmed')
    return NextResponse.json({ ok: true, already: true })

  const { error } = await db
    .from('tool_purchases')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return serverError(error.message)

  const toolId2 = (purchase as any).shop_tools?.id
  if (toolId2) {
    void db.rpc('increment_sales_count', { tool_id: toolId2 }).catch(() => {
      void db.from('shop_tools').select('sales_count').eq('id', toolId2).single().then(({ data }) => {
        if (data) db.from('shop_tools').update({ sales_count: (data.sales_count || 0) + 1 }).eq('id', toolId2)
      })
    })
  }

  const toolName    = (purchase as any).shop_tools?.name || 'الأداة'
  const toolId      = (purchase as any).shop_tools?.id
  const memberId    = (purchase as any).member_id
  const isPrivate   = (purchase as any).shop_tools?.category_slug === 'private'

  void db.from('member_notifications').insert({
    member_id:  memberId,
    title:      `تم تفعيل اشتراكك في ${toolName} ✅`,
    title_en:   `Your ${toolName} subscription is now active ✅`,
    message:    `تم تأكيد دفعتك وتفعيل اشتراكك في ${toolName}. ابدأ الاستخدام الآن من لوحة التحكم.`,
    message_en: `Your payment was confirmed and your ${toolName} subscription is now active. Start using it from your dashboard.`,
    type:       'success',
    link:       '/u/shop',
  })

  // Auto-deliver from stock for private tools
  if (isPrivate && toolId) {
    const { data: stockItem } = await db
      .from('private_accounts_stock')
      .select('id, delivery_type, email, password_enc, key_enc, notes')
      .eq('tool_id', toolId)
      .eq('status', 'available')
      .limit(1)
      .single()

    if (stockItem) {
      await db.from('account_deliveries').insert({
        purchase_id:   params.id,
        member_id:     memberId,
        tool_id:       toolId,
        delivery_type: stockItem.delivery_type,
        email:         stockItem.email,
        password_enc:  stockItem.password_enc,
        key_enc:       stockItem.key_enc,
        notes:         stockItem.notes,
        source:        'stock',
        delivered_at:  new Date().toISOString(),
        viewed_at:     null,
      })

      await db.from('private_accounts_stock')
        .update({ status: 'assigned', assigned_to: memberId, assigned_at: new Date().toISOString() })
        .eq('id', stockItem.id)

      const label   = stockItem.delivery_type === 'key' ? 'مفتاح التفعيل' : 'بيانات الحساب'
      const labelEn = stockItem.delivery_type === 'key' ? 'activation key' : 'account credentials'
      void db.from('member_notifications').insert({
        member_id:  memberId,
        title:      `تم تسليم ${label} 🎉`,
        title_en:   `Your ${labelEn} has been delivered 🎉`,
        message:    `تم تسليم ${label} الخاص بـ ${toolName}. ادخل على اشتراكاتي لعرض البيانات.`,
        message_en: `Your ${labelEn} for ${toolName} is ready. Go to My Subscriptions to view it.`,
        type:       'success',
        link:       '/u/shop',
      })
    }
  }

  void writeAuditLog({
    member_id: memberId,
    action:    'subscription_confirmed',
    meta:      { purchase_id: params.id, tool_name: toolName },
  })

  return NextResponse.json({ ok: true })
}
