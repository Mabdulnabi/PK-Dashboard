import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notFound, serverError, badRequest } from '@/lib/responses'
import { fireAdminNotification } from '@/lib/admin-notify'

export async function POST(req: NextRequest) {
  const { payment_id } = await req.json()
  if (!payment_id) return badRequest('payment_id required')

  // Get payment + bundle
  const { data: payment } = await db
    .from('payments')
    .select('id, user_id, amount, bundle_id, status')
    .eq('id', payment_id)
    .single()

  if (!payment)          return notFound('payment not found')
  if (!payment.bundle_id) return badRequest('payment has no bundle_id')
  if (payment.status === 'completed')
    return NextResponse.json({ ok: true, already: true })

  const { data: bundle } = await db
    .from('membership_plans')
    .select('id, name, tool_ids, duration_days, price_egp')
    .eq('id', payment.bundle_id)
    .single()

  if (!bundle) return notFound('bundle not found')

  const toolIds: string[] = bundle.tool_ids || []
  if (toolIds.length === 0) return badRequest('bundle has no tools')

  // Mark payment completed
  const { error: payErr } = await db
    .from('payments')
    .update({ status: 'completed' })
    .eq('id', payment_id)

  if (payErr) return serverError(payErr.message)

  // Create tool_purchases for every tool in the bundle
  const now     = new Date()
  const expires = new Date(now.getTime() + (bundle.duration_days || 30) * 86400 * 1000)

  const purchases = toolIds.map((tool_id: string) => ({
    member_id:      payment.user_id,
    tool_id,
    amount_egp:     0, // cost split not tracked per tool
    payment_method: 'bundle',
    status:         'confirmed',
    reference:      payment_id,
    starts_at:      now.toISOString(),
    expires_at:     expires.toISOString(),
    confirmed_at:   now.toISOString(),
  }))

  const { error: purchErr } = await db.from('tool_purchases').insert(purchases)
  if (purchErr) return serverError(purchErr.message)

  // Notify member
  void db.from('member_notifications').insert({
    member_id:  payment.user_id,
    title:      `تم تفعيل باقة ${bundle.name} ✅`,
    title_en:   `${bundle.name} bundle activated ✅`,
    message:    `تم تأكيد دفعتك وتفعيل جميع أدوات باقة ${bundle.name}. ابدأ الاستخدام الآن.`,
    message_en: `Your payment was confirmed and all tools in the ${bundle.name} bundle are now active.`,
    type:       'success',
  })

  void fireAdminNotification({
    title:   `تم تفعيل bundle ✅`,
    message: `تم تأكيد وتفعيل باقة "${bundle.name}" — ${toolIds.length} أدوات`,
    type:    'success',
  })

  return NextResponse.json({ ok: true, tools_activated: toolIds.length })
}
