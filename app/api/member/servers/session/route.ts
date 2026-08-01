// app/api/member/servers/session/route.ts
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function writeAuditLog(fields: {
  member_id: string; server_id: string; action: string
  ip: string; ua: string; device_fingerprint?: string | null
  tool_name?: string; server_label?: string; session_id?: string | null
  meta?: Record<string, unknown>
}) {
  await service.from('server_usage_logs').insert({
    member_id:          fields.member_id,
    server_id:          fields.server_id,
    action:             fields.action,
    ip_address:         fields.ip,
    user_agent:         fields.ua,
    device_fingerprint: fields.device_fingerprint ?? null,
    tool_name:          fields.tool_name ?? null,
    server_label:       fields.server_label ?? null,
    session_id:         fields.session_id ?? null,
    meta:               fields.meta ?? {},
  })
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: session } = await service.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const serverId = req.nextUrl.searchParams.get('server_id')
  if (!serverId) return NextResponse.json({ error: 'server_id required' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const ua = req.headers.get('user-agent') || ''

  // Read stored fingerprint from member record
  const { data: memberRow } = await service
    .from('members')
    .select('device_fingerprint')
    .eq('id', session.member_id)
    .single()
  const storedFp = memberRow?.device_fingerprint ?? null

  const { data: server } = await service
    .from('tool_servers')
    .select('id, tool_name, server_label, session_data_encrypted, proxy_host, proxy_port, proxy_username, proxy_password_encrypted, status, tier_required')
    .eq('id', serverId)
    .single()

  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  if (server.status !== 'active') return NextResponse.json({ error: 'Server not available' }, { status: 400 })

  // Tier check
  const tierOrder     = ['basic', 'vip', 'private']
  const memberTierIdx = tierOrder.indexOf(session.plan_slug || 'basic')
  const serverTierIdx = tierOrder.indexOf(server.tier_required)
  if (memberTierIdx < serverTierIdx) return NextResponse.json({ error: 'Insufficient tier' }, { status: 403 })

  // Parse + normalize session data
  // Extension expects: { cookies: [...], localStorage: {}, indexedDB: [] }
  // Some servers were saved as a bare cookies array — wrap those automatically
  let sessionData: { cookies: any[]; localStorage: Record<string,any>; indexedDB: any[] } | null = null
  try {
    const raw = server.session_data_encrypted ? JSON.parse(server.session_data_encrypted) : null
    if (raw === null) {
      sessionData = null
    } else if (Array.isArray(raw)) {
      // bare cookies array → normalize to envelope format
      sessionData = { cookies: raw, localStorage: {}, indexedDB: [] }
    } else if (raw && typeof raw === 'object' && Array.isArray(raw.cookies)) {
      // already correct envelope
      sessionData = raw
    } else {
      sessionData = raw
    }
  } catch {
    return NextResponse.json({ error: 'Invalid session data' }, { status: 500 })
  }

  // Expire other active sessions
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

  let upsertedId: string | null = null

  if (!existing) {
    const { data: inserted } = await service.from('user_server_sessions').insert({
      user_id:            session.member_id,
      server_id:          serverId,
      status:             'active',
      started_at:         new Date().toISOString(),
      last_active_at:     new Date().toISOString(),
      expires_at:         new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      device_fingerprint: storedFp,
    }).select('id').single()
    upsertedId = inserted?.id ?? null

    // Audit: new connect
    writeAuditLog({
      member_id:          session.member_id,
      server_id:          serverId,
      action:             'connect',
      ip, ua,
      device_fingerprint: storedFp,
      tool_name:          server.tool_name,
      server_label:       server.server_label,
      session_id:         upsertedId,
    })
  } else {
    await service.from('user_server_sessions')
      .update({
        last_active_at: new Date().toISOString(),
        expires_at:     new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .eq('id', existing.id)
    upsertedId = existing.id

    // Audit: session reuse (heartbeat)
    writeAuditLog({
      member_id:          session.member_id,
      server_id:          serverId,
      action:             'session_reuse',
      ip, ua,
      device_fingerprint: storedFp,
      tool_name:          server.tool_name,
      server_label:       server.server_label,
      session_id:         existing.id,
    })
  }

  const proxy = server.proxy_host ? {
    host:     server.proxy_host,
    port:     server.proxy_port,
    username: server.proxy_username,
    password: server.proxy_password_encrypted,
  } : null

  return NextResponse.json({ session_data: sessionData, proxy })
}
