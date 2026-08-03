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

    const { payment_id, bundle_id, ref } = await req.json()
    if (!payment_id || !bundle_id)
      return NextResponse.json({ error: 'Missing payment_id or bundle_id' }, { status: 400 })

    // Verify payment belongs to this member
    const { data: payment } = await service
      .from('payments')
      .select('id, amount, gateway, bundle_id')
      .eq('id', payment_id)
      .eq('user_id', session.member_id)
      .single()

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // Get bundle details
    const { data: bundle } = await service
      .from('membership_plans')
      .select('id, name, tool_ids, duration_days, price_egp')
      .eq('id', bundle_id)
      .eq('is_active', true)
      .single()

    if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })

    const toolIds: string[] = bundle.tool_ids || []
    if (toolIds.length === 0)
      return NextResponse.json({ error: 'Bundle has no tools' }, { status: 400 })

    // Store ref and mark payment as pending manual review
    await service.from('payments').update({ transaction_id: ref || null }).eq('id', payment_id)

    // Notify admin
    void service.from('admin_notifications').insert({
      title:   `طلب دفع bundle جديد 📦`,
      message: `عضو طلب باقة "${bundle.name}" — بانتظار تأكيد الدفع`,
      type:    'info',
      link:    '/members',
    })

    return NextResponse.json({ ok: true, bundle_name: bundle.name, tool_count: toolIds.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
