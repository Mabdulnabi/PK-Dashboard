import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pk_member_token')?.value || req.headers.get('x-member-token') || ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session, error: sessionErr } = await service.rpc('verify_member_session', { p_token: token })
    if (sessionErr || !session?.valid)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { payment_id, bundle_id } = await req.json()
    if (!payment_id || !bundle_id)
      return NextResponse.json({ error: 'Missing payment_id or bundle_id' }, { status: 400 })

    // Verify payment belongs to this member and is completed (set by edge function)
    const { data: payment } = await service
      .from('payments')
      .select('id, status, bundle_id, user_id')
      .eq('id', payment_id)
      .eq('user_id', session.member_id)
      .single()

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.status !== 'completed')
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })

    // Get bundle
    const { data: bundle } = await service
      .from('membership_plans')
      .select('id, name, tool_ids, duration_days')
      .eq('id', bundle_id)
      .eq('is_active', true)
      .single()

    if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })

    const toolIds: string[] = bundle.tool_ids || []
    if (toolIds.length === 0)
      return NextResponse.json({ error: 'Bundle has no tools' }, { status: 400 })

    // Prevent double-activation
    const { data: existing } = await service
      .from('tool_purchases')
      .select('id')
      .eq('reference', payment_id)
      .limit(1)

    if (existing && existing.length > 0)
      return NextResponse.json({ ok: true, already: true })

    // Create tool_purchases for every tool in the bundle
    const now     = new Date()
    const expires = new Date(now.getTime() + (bundle.duration_days || 30) * 86400 * 1000)

    const { error: purchErr } = await service.from('tool_purchases').insert(
      toolIds.map((tool_id: string) => ({
        member_id:      session.member_id,
        tool_id,
        amount_egp:     0,
        payment_method: 'bundle',
        status:         'confirmed',
        reference:      payment_id,
        starts_at:      now.toISOString(),
        expires_at:     expires.toISOString(),
        confirmed_at:   now.toISOString(),
      }))
    )

    if (purchErr) return NextResponse.json({ error: purchErr.message }, { status: 500 })

    // Notify member
    void service.from('member_notifications').insert({
      member_id:  session.member_id,
      title:      `تم تفعيل باقة ${bundle.name} ✅`,
      title_en:   `${bundle.name} bundle activated ✅`,
      message:    `تم تفعيل جميع أدوات باقة ${bundle.name}. ابدأ الاستخدام الآن.`,
      message_en: `All tools in the ${bundle.name} bundle are now active. Start using them now.`,
      type:       'success',
    })

    return NextResponse.json({ ok: true, tools_activated: toolIds.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
