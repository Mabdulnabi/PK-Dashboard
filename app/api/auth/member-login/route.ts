// Exchange email+password for a pk_member_token (used by landing page auth modal)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MEMBER_COOKIE, COOKIE_MAX_AGE } from '@/lib/constants'
import { getClientIp, getUserAgent } from '@/lib/request'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password)
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })

  const ip = getClientIp(req)
  const ua = getUserAgent(req)

  const { data, error } = await db.rpc('member_login', {
    p_email: email.toLowerCase().trim(),
    p_password: password,
    p_ip: ip,
    p_ua: ua,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.success) return NextResponse.json({ error: data.error }, { status: 401 })

  const res = NextResponse.json({ success: true })
  res.cookies.set(MEMBER_COOKIE, data.token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  })
  return res
}
