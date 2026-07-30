// app/api/member/payment/manual/route.ts
// Marks payment for manual admin review (no edge fn)
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
      return NextResponse.json({ error: session?.error || 'Invalid session' }, { status: 401 })

    const { payment_id, ref } = await req.json()
    if (!payment_id) return NextResponse.json({ error: 'Missing payment_id' }, { status: 400 })

    const { error } = await service
      .from('payments')
      .update({ transaction_id: ref })
      .eq('id', payment_id)
      .eq('user_id', session.member_id)

    if (error) {
      console.error('manual payment update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
