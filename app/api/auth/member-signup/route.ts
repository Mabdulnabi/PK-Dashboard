// Create new member account and return pk_member_token
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MEMBER_COOKIE, COOKIE_MAX_AGE } from '@/lib/constants'
import { getClientIp, getUserAgent } from '@/lib/request'

export async function POST(req: NextRequest) {
  const { email, password, full_name, whatsapp } = await req.json()
  if (!email || !password || !full_name)
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })

  const ip = getClientIp(req)
  const ua = getUserAgent(req)
  const normalEmail = email.toLowerCase().trim()

  // Check if member already exists
  const { data: existing } = await db
    .from('members')
    .select('id')
    .eq('email', normalEmail)
    .single()

  if (existing) return NextResponse.json({ error: 'email_taken' }, { status: 409 })

  // Create member (no plan — free/pending status, admin activates subscription)
  const { data: member, error: createErr } = await db
    .from('members')
    .insert({
      email:         normalEmail,
      full_name:     full_name.trim(),
      whatsapp:      whatsapp?.trim() || null,
      password_hash: password,
      status:        'active',
      plan_slug:     'free',
      expires_at:    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (createErr || !member)
    return NextResponse.json({ error: createErr?.message || 'create_failed' }, { status: 500 })

  // Create session
  const { data: sess } = await db
    .from('member_sessions')
    .insert({ member_id: member.id, ip_address: ip, user_agent: ua })
    .select('token')
    .single()

  if (!sess?.token)
    return NextResponse.json({ error: 'session_failed' }, { status: 500 })

  // Notify admin of new registration
  void db.from('admin_notifications').insert({
    title:   `عضو جديد 🎉`,
    message: `${full_name.trim()} (${normalEmail}) سجّل حساباً جديداً`,
    type:    'info',
    link:    '/members',
  })

  const res = NextResponse.json({ success: true })
  res.cookies.set(MEMBER_COOKIE, sess.token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  })
  return res
}
