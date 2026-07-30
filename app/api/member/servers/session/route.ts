// app/api/member/servers/session/route.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: session } = await service.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const serverId = req.nextUrl.searchParams.get('server_id')
  if (!serverId) return NextResponse.json({ error: 'server_id required' }, { status: 400 })

  const { data: server } = await service
    .from('tool_servers')
    .select('id, session_data_encrypted, proxy_host, proxy_port, proxy_username, proxy_password_encrypted, status, tier_required')
    .eq('id', serverId)
    .single()

  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  if (server.status !== 'active') return NextResponse.json({ error: 'Server not available' }, { status: 400 })

  // Check tier
  const tierOrder     = ['basic','vip','private']
  const memberTierIdx = tierOrder.indexOf(session.plan_slug || 'basic')
  const serverTierIdx = tierOrder.indexOf(server.tier_required)
  if (memberTierIdx < serverTierIdx) return NextResponse.json({ error: 'Insufficient tier' }, { status: 403 })

  // Parse session data
  let sessionData = null
  try {
    sessionData = server.session_data_encrypted ? JSON.parse(server.session_data_encrypted) : null
  } catch {
    return NextResponse.json({ error: 'Invalid session data' }, { status: 500 })
  }

  // Upsert session record — expire old ones first
  await service
    .from('user_server_sessions')
    .update({ status: 'expired' })
    .eq('user_id', session.member_id)
    .eq('status', 'active')
    .neq('server_id', serverId)

  // Upsert active session for this server
  const { data: existing } = await service
    .from('user_server_sessions')
    .select('id')
    .eq('user_id', session.member_id)
    .eq('server_id', serverId)
    .eq('status', 'active')
    .single()

  if (!existing) {
    await service.from('user_server_sessions').insert({
      user_id:        session.member_id,
      server_id:      serverId,
      status:         'active',
      started_at:     new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      expires_at:     new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
  } else {
    await service.from('user_server_sessions')
      .update({ last_active_at: new Date().toISOString(), expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() })
      .eq('id', existing.id)
  }

  const proxy = server.proxy_host ? {
    host:     server.proxy_host,
    port:     server.proxy_port,
    username: server.proxy_username,
    password: server.proxy_password_encrypted,
  } : null

  return NextResponse.json({ session_data: sessionData, proxy })
}
