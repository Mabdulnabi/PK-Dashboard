// Exchange email+password for a pk_member_token (used by landing page auth modal)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MEMBER_COOKIE, COOKIE_MAX_AGE } from '@/lib/constants'
import { getClientIp, getUserAgent } from '@/lib/request'
import { logAudit } from '@/lib/audit'

// In-memory rate limiter: 5 attempts per IP per 60s window
const RATE_LIMIT = 5
const WINDOW_MS  = 60_000
const attempts   = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password)
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })

  const ip = getClientIp(req)
  const ua = getUserAgent(req)

  if (!checkRateLimit(ip))
    return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 })

  const { data, error } = await db.rpc('member_login', {
    p_email: email.toLowerCase().trim(),
    p_password: password,
    p_ip: ip,
    p_ua: ua,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.success) {
    logAudit({ action: 'member.login.failed', actor_type: 'member', target_type: 'member', target_id: email.toLowerCase().trim(), ip })
    return NextResponse.json({ error: data.error }, { status: 401 })
  }

  logAudit({ action: 'member.login', actor_type: 'member', actor_id: data.member_id, target_type: 'member', target_id: email.toLowerCase().trim(), ip })

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
