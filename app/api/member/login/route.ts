import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const ua = req.headers.get('user-agent') || ''

  const rl = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'too_many_attempts', retryAfter: (rl as any).retryAfter },
      { status: 429, headers: { 'Retry-After': String((rl as any).retryAfter) } }
    )
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const body = await req.json()
  const { email, password, device_fingerprint } = body
  if (!email || !password) return NextResponse.json({ error: 'missing_fields' }, { status: 400 })

  const { data, error } = await supabase.rpc('member_login', {
    p_email: email.toLowerCase().trim(), p_password: password, p_ip: ip, p_ua: ua,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.success) return NextResponse.json({ error: data.error }, { status: 401 })

  // Persist fingerprint on member record (fire-and-forget)
  if (device_fingerprint && data.member_id) {
    service.from('members')
      .update({ device_fingerprint })
      .eq('id', data.member_id)
      .then(() => {})
  }

  // Audit: login event
  service.from('server_usage_logs').insert({
    member_id:          data.member_id ?? null,
    action:             'connect',
    ip_address:         ip,
    user_agent:         ua,
    device_fingerprint: device_fingerprint ?? null,
    meta:               { event: 'login', email: email.toLowerCase().trim() },
  }).then(() => {})

  const res = NextResponse.json({ success: true, member: data })
  res.cookies.set('pk_member_token', data.token, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
  })
  return res
}
