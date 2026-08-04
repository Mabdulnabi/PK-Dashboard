import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MEMBER_COOKIE, COOKIE_MAX_AGE } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/landing?auth_error=${error || 'no_code'}`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (pairs) => pairs.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )

  const { data: { session }, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeErr || !session?.user?.email) {
    return NextResponse.redirect(`${origin}/landing?auth_error=exchange_failed`)
  }

  const email = session.user.email.toLowerCase()

  // Look up member by email
  const { data: member } = await db
    .from('members')
    .select('id, full_name, plan_slug, expires_at, status')
    .eq('email', email)
    .single()

  if (!member || member.status === 'suspended') {
    // No member account found — send them back to landing with a message
    return NextResponse.redirect(`${origin}/landing?auth_error=no_member`)
  }

  // Create a member session token
  const { data: sess } = await db
    .from('member_sessions')
    .insert({
      member_id:  member.id,
      ip_address: req.headers.get('x-forwarded-for') ?? 'oauth',
      user_agent: req.headers.get('user-agent') ?? 'oauth',
    })
    .select('token')
    .single()

  if (!sess?.token) {
    return NextResponse.redirect(`${origin}/landing?auth_error=session_failed`)
  }

  // Update last login
  void db.from('members').update({ last_login_at: new Date().toISOString() }).eq('id', member.id)

  const res = NextResponse.redirect(`${origin}/u/dashboard`)
  res.cookies.set(MEMBER_COOKIE, sess.token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  })
  return res
}
