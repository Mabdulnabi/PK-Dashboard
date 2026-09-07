import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'password_too_short' }, { status: 400 })

    const { data: reset } = await service
      .from('member_password_resets')
      .select('id, member_id, expires_at, used')
      .eq('token', token)
      .single()

    if (!reset) return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    if (reset.used) return NextResponse.json({ error: 'token_already_used' }, { status: 400 })
    if (new Date(reset.expires_at) < new Date()) return NextResponse.json({ error: 'token_expired' }, { status: 400 })

    // Update password and mark token used atomically
    const hashedPassword = await hash(password, 10)
    const [{ error: pwErr }] = await Promise.all([
      service.from('members').update({ password_hash: hashedPassword }).eq('id', reset.member_id),
      service.from('member_password_resets').update({ used: true }).eq('id', reset.id),
    ])

    if (pwErr) throw pwErr

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
