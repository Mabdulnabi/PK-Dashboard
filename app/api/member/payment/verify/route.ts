// app/api/member/payment/verify/route.ts
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pk_member_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session, error: sessionErr } = await db
      .rpc('verify_member_session', { p_token: token })

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

    // When EasyKash confirms the payment, notify the member
    if ((data.verified || data.success) && !data.error && payload.amount) {
      void db.from('member_notifications').insert({
        member_id:   session.member_id,
        title:       `تم شحن محفظتك ✅`,
        title_en:    `Wallet topped up ✅`,
        message:     `تم إضافة ${payload.amount} إلى محفظتك بنجاح.`,
        message_en:  `${payload.amount} has been added to your wallet successfully.`,
        type:        'success',
      })
    }

    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
