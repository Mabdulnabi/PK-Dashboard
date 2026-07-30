// app/api/member/servers/session/status/route.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pk_member_token')?.value
    if (!token) return NextResponse.json({ active: false })

    const { data: session } = await service.rpc('verify_member_session', { p_token: token })
    if (!session?.valid) return NextResponse.json({ active: false })

    const serverId = req.nextUrl.searchParams.get('server_id')
    if (!serverId) return NextResponse.json({ active: false })

    const { data } = await service
      .from('user_server_sessions')
      .select('id')
      .eq('user_id', session.member_id)
      .eq('server_id', serverId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single()

    return NextResponse.json({ active: !!data })
  } catch {
    return NextResponse.json({ active: false })
  }
}
