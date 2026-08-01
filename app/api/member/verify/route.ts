// app/api/member/verify/route.ts
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ valid: false }, { status: 401 })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data } = await supabase.rpc('verify_member_session', { p_token: token })
  if (!data?.valid) return NextResponse.json({ valid: false }, { status: 401 })
  return NextResponse.json(data)
}

export async function DELETE() {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value

  if (token) {
    const { data: session } = await service.rpc('verify_member_session', { p_token: token })

    if (session?.valid && session.member_id) {
      await Promise.all([
        // Clear device lock — next login from any device is allowed
        service.from('members')
          .update({ device_fingerprint: null })
          .eq('id', session.member_id),

        // Expire all active server sessions
        service.from('user_server_sessions')
          .update({ status: 'expired', expires_at: new Date().toISOString() })
          .eq('user_id', session.member_id)
          .eq('status', 'active'),

        // Audit
        service.from('server_usage_logs').insert({
          member_id: session.member_id,
          action:    'disconnect',
          meta:      { event: 'logout' },
        }),
      ])
    }
  }

  const res = NextResponse.json({ success: true })
  res.cookies.delete('pk_member_token')
  return res
}
