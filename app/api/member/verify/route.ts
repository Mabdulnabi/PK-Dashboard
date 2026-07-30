// app/api/member/verify/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
  const res = NextResponse.json({ success: true })
  res.cookies.delete('pk_member_token')
  return res
}
