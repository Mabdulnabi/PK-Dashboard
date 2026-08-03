import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/responses'
import { SESSION_STATUS } from '@/lib/constants'
import { normalizeSessionData } from '@/lib/session-data'

export async function POST(req: NextRequest) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { server_id, updated_cookies } = await req.json()
  if (!server_id || !Array.isArray(updated_cookies) || updated_cookies.length === 0)
    return badRequest('server_id and updated_cookies required')

  // Verify member has/had an active session on this server
  const { data: activeSession } = await db
    .from('user_server_sessions')
    .select('id')
    .eq('server_id',  server_id)
    .eq('member_id',  session.member_id)
    .in('status', [SESSION_STATUS.ACTIVE, SESSION_STATUS.EXPIRED])
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (!activeSession) return forbidden('no session found for this server')

  const { data: server } = await db
    .from('tool_servers')
    .select('session_data_encrypted')
    .eq('id', server_id)
    .single()

  if (!server) return notFound('server not found')

  const existing = normalizeSessionData(server.session_data_encrypted)
  const existingCookies = existing?.cookies ?? []

  const updateMap = new Map(updated_cookies.map((c: any) => [c.name, c]))
  const merged = [
    ...existingCookies.map((c: any) => updateMap.has(c.name) ? { ...c, ...updateMap.get(c.name) } : c),
    ...updated_cookies.filter((c: any) => !existingCookies.find((e: any) => e.name === c.name)),
  ]

  const { error } = await db
    .from('tool_servers')
    .update({ session_data_encrypted: JSON.stringify({ ...existing, cookies: merged }) })
    .eq('id', server_id)

  if (error) return serverError(error.message)

  return NextResponse.json({ ok: true, updated: merged.length })
}
