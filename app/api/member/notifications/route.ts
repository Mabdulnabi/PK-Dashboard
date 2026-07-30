import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ notifications: [] })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: session } = await supabase.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ notifications: [] })

  const { data } = await supabase
    .from('member_notifications')
    .select('*')
    .eq('member_id', session.member_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ notifications: data||[] })
}
