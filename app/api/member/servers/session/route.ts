import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { canAccess } from '@/lib/tiers'
import { normalizeSessionData } from '@/lib/session-data'
import { writeAuditLog } from '@/lib/audit'
import { getClientIp, getUserAgent } from '@/lib/request'
import { badRequest, notFound, forbidden, serverError, unauthorized } from '@/lib/responses'
import { SESSION_TTL_MS, SESSION_STATUS, AUDIT_ACTIONS } from '@/lib/constants'

function sessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString()
}

export async function GET(req: NextRequest) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const serverId = req.nextUrl.searchParams.get('server_id')
  if (!serverId) return badRequest('server_id required')

  const ip = getClientIp(req)
  const ua = getUserAgent(req)

  // Fetch member's stored device fingerprint
  const { data: memberRow } = await db
    .from('members')
    .select('device_fingerprint')
    .eq('id', session.member_id)
    .single()
  const storedFp = memberRow?.device_fingerprint ?? null

  // Fetch server
  const { data: server } = await db
    .from('tool_servers')
    .select('id, tool_name, server_label, session_data_encrypted, proxy_host, proxy_port, proxy_username, proxy_password_encrypted, status, tier_required')
    .eq('id', serverId)
    .single()

  if (!server) return notFound('Server not found')
  if (server.status !== SESSION_STATUS.ACTIVE) return badRequest('Server not available')
  if (!canAccess(session.plan_slug, server.tier_required)) return forbidden('Insufficient tier')

  const sessionData = normalizeSessionData(server.session_data_encrypted)
  if (!sessionData) return serverError('Invalid session data')

  // Expire other active sessions for this member
  await db
    .from('user_server_sessions')
    .update({ status: SESSION_STATUS.EXPIRED })
    .eq('user_id', session.member_id)
    .eq('status', SESSION_STATUS.ACTIVE)
    .neq('server_id', serverId)

  // Upsert session for this server
  const { data: existing } = await db
    .from('user_server_sessions')
    .select('id')
    .eq('user_id', session.member_id)
    .eq('server_id', serverId)
    .eq('status', SESSION_STATUS.ACTIVE)
    .single()

  let sessionId: string | null

  if (!existing) {
    const { data: inserted } = await db
      .from('user_server_sessions')
      .insert({
        user_id:            session.member_id,
        server_id:          serverId,
        status:             SESSION_STATUS.ACTIVE,
        started_at:         new Date().toISOString(),
        last_active_at:     new Date().toISOString(),
        expires_at:         sessionExpiry(),
        device_fingerprint: storedFp,
      })
      .select('id')
      .single()
    sessionId = inserted?.id ?? null

    void writeAuditLog({
      member_id: session.member_id, server_id: serverId,
      action: AUDIT_ACTIONS.CONNECT, ip_address: ip, user_agent: ua,
      device_fingerprint: storedFp, tool_name: server.tool_name,
      server_label: server.server_label, session_id: sessionId,
    })
  } else {
    await db
      .from('user_server_sessions')
      .update({ last_active_at: new Date().toISOString(), expires_at: sessionExpiry() })
      .eq('id', existing.id)
    sessionId = existing.id

    void writeAuditLog({
      member_id: session.member_id, server_id: serverId,
      action: AUDIT_ACTIONS.SESSION_REUSE, ip_address: ip, user_agent: ua,
      device_fingerprint: storedFp, tool_name: server.tool_name,
      server_label: server.server_label, session_id: existing.id,
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
