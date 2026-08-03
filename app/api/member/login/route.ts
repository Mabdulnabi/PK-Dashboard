import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'
import { getClientIp, getUserAgent } from '@/lib/request'
import { badRequest, forbidden, serverError } from '@/lib/responses'
import { MEMBER_COOKIE, COOKIE_MAX_AGE, AUDIT_ACTIONS } from '@/lib/constants'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const ua = getUserAgent(req)

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
  if (!email || !password) return badRequest('missing_fields')

  const { data, error } = await supabase.rpc('member_login', {
    p_email: email.toLowerCase().trim(), p_password: password, p_ip: ip, p_ua: ua,
  })
  if (error) return serverError(error.message)
  if (!data.success) return NextResponse.json({ error: data.error }, { status: 401 })

  // Device fingerprint enforcement
  if (device_fingerprint && data.member_id) {
    const { data: memberRow } = await db
      .from('members')
      .select('device_fingerprint')
      .eq('id', data.member_id)
      .single()

    const storedFp = memberRow?.device_fingerprint

    if (storedFp && storedFp !== device_fingerprint) {
      void writeAuditLog({
        member_id: data.member_id,
        action: AUDIT_ACTIONS.CONNECT,
        ip_address: ip, user_agent: ua,
        device_fingerprint,
        meta: { event: 'login_blocked_device_mismatch', email: email.toLowerCase().trim() },
      })
      return forbidden('device_locked')
    }

    void db.from('members').update({ device_fingerprint }).eq('id', data.member_id)
  }

  void writeAuditLog({
    member_id: data.member_id ?? null,
    action: AUDIT_ACTIONS.CONNECT,
    ip_address: ip, user_agent: ua,
    device_fingerprint: device_fingerprint ?? null,
    meta: { event: 'login', email: email.toLowerCase().trim() },
  })

  const res = NextResponse.json({ success: true, member: data })
  res.cookies.set(MEMBER_COOKIE, data.token, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: COOKIE_MAX_AGE, path: '/',
  })
  return res
}
