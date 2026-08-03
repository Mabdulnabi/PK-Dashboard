import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { getClientIp, getUserAgent } from '@/lib/request'
import { SESSION_STATUS, SESSION_TTL_MS, AUDIT_ACTIONS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  let session
  try { session = await requireMember() } catch {
    return NextResponse.json({ ok: true }) // silent — extension doesn't care
  }

  const { server_id, action } = await req.json()
  const ip = getClientIp(req)
  const ua = getUserAgent(req)

  if (action === 'keepalive') {
    await db
      .from('user_server_sessions')
      .update({
        last_active_at: new Date().toISOString(),
        expires_at:     new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      })
      .eq('user_id',   session.member_id)
      .eq('server_id', server_id)
      .eq('status',    SESSION_STATUS.ACTIVE)

    return NextResponse.json({ ok: true })
  }

  // Fetch session metadata for audit before expiring
  const { data: activeSession } = await db
    .from('user_server_sessions')
    .select('id, device_fingerprint, tool_servers(tool_name, server_label)')
    .eq('user_id',   session.member_id)
    .eq('server_id', server_id)
    .eq('status',    SESSION_STATUS.ACTIVE)
    .single()

  await db
    .from('user_server_sessions')
    .update({ status: SESSION_STATUS.EXPIRED, expires_at: new Date().toISOString() })
    .eq('user_id',   session.member_id)
    .eq('server_id', server_id)
    .eq('status',    SESSION_STATUS.ACTIVE)

  const serverInfo = (activeSession?.tool_servers as any) ?? {}
  void writeAuditLog({
    member_id:          session.member_id,
    server_id,
    action:             AUDIT_ACTIONS.DISCONNECT,
    ip_address:         ip,
    user_agent:         ua,
    device_fingerprint: (activeSession as any)?.device_fingerprint ?? null,
    tool_name:          serverInfo.tool_name ?? null,
    server_label:       serverInfo.server_label ?? null,
    session_id:         activeSession?.id ?? null,
    meta:               { triggered_by: 'member' },
  })

  return NextResponse.json({ ok: true })
}
