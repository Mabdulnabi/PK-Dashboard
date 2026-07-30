// app/api/member/servers/session/disconnect/route.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('pk_member_token')?.value
    if (!token) return NextResponse.json({ ok: true }) // silent fail

    const { data: session } = await service.rpc('verify_member_session', { p_token: token })
    if (!session?.valid) return NextResponse.json({ ok: true })

    const { server_id, action } = await req.json()

    if (action === 'keepalive') {
      // Renew expiry
      await service
        .from('user_server_sessions')
        .update({ 
          last_active_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        })
        .eq('user_id', session.member_id)
        .eq('server_id', server_id)
        .eq('status', 'active')
    } else {
      // Disconnect
      await service
        .from('user_server_sessions')
        .update({ status: 'expired', expires_at: new Date().toISOString() })
        .eq('user_id', session.member_id)
        .eq('server_id', server_id)
        .eq('status', 'active')
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
