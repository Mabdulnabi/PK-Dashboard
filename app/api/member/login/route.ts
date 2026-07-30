import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  const ip = req.headers.get('x-forwarded-for') || ''
  const ua = req.headers.get('user-agent') || ''
  const { data, error } = await supabase.rpc('member_login', {
    p_email: email.toLowerCase().trim(), p_password: password, p_ip: ip, p_ua: ua,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.success) return NextResponse.json({ error: data.error }, { status: 401 })
  const res = NextResponse.json({ success: true, member: data })
  res.cookies.set('pk_member_token', data.token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60*60*24*30, path: '/' })
  return res
}
