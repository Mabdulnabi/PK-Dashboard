import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { notFound, serverError } from '@/lib/responses'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: purchase } = await db
    .from('tool_purchases')
    .select('id, member_id, status, shop_tools(name, image_url)')
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

  const toolName = (purchase as any).shop_tools?.name || 'الأداة'

  void db.from('member_notifications').insert({
    member_id:  (purchase as any).member_id,
    title:      `تم تفعيل اشتراكك في ${toolName} ✅`,
    title_en:   `Your ${toolName} subscription is now active ✅`,
    message:    `تم تأكيد دفعتك وتفعيل اشتراكك في ${toolName}. ابدأ الاستخدام الآن من لوحة التحكم.`,
    message_en: `Your payment was confirmed and your ${toolName} subscription is now active. Start using it from your dashboard.`,
    type:       'success',
    link:       '/u/shop',
  })

  void writeAuditLog({
    member_id: (purchase as any).member_id,
    action:    'subscription_confirmed',
    meta:      { purchase_id: params.id, tool_name: toolName },
  })

  return NextResponse.json({ ok: true })
}
