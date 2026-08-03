import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serverError } from '@/lib/responses'

export async function POST(req: NextRequest) {
  const { payment_id, member_id, plan_name } = await req.json()
  if (!payment_id || !member_id) return NextResponse.json({ error: 'payment_id and member_id required' }, { status: 400 })

  const { error } = await db.rpc('confirm_payment', { p_payment_id: payment_id, p_admin_id: null })
  if (error) return serverError(error.message)

  const name = plan_name || 'الاشتراك'
  void db.from('member_notifications').insert({
    member_id,
    title:      `تم تأكيد دفعتك ✅`,
    title_en:   `Payment confirmed ✅`,
    message:    `تم تأكيد دفعتك وتفعيل ${name}. يمكنك الاستخدام الآن.`,
    message_en: `Your payment was confirmed and ${name} is now active. You can start using it.`,
    type:       'success',
  })

  return NextResponse.json({ ok: true })
}
