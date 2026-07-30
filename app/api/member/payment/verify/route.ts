// app/api/member/payment/verify/route.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pk_member_token')?.value
    console.log('VERIFY TOKEN:', token)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Create client inside the function — not at module level
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: session, error: sessionErr } = await service
      .rpc('verify_member_session', { p_token: token })

    console.log('VERIFY SESSION:', JSON.stringify(session))
    console.log('VERIFY SESSION ERR:', JSON.stringify(sessionErr))

    if (sessionErr || !session?.valid)
      return NextResponse.json({ error: session?.error || 'Invalid session' }, { status: 401 })

    const body = await req.json()
    const { edge_fn, ...payload } = body
    if (!edge_fn) return NextResponse.json({ error: 'Missing edge_fn' }, { status: 400 })

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${edge_fn}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ ...payload, member_id: session.member_id }),
      }
    )

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
