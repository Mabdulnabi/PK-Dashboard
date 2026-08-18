import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { canAccess } from '@/lib/tiers'
import { badRequest, unauthorized } from '@/lib/responses'
import { SESSION_STATUS } from '@/lib/constants'

export async function GET(req: NextRequest) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const toolId   = req.nextUrl.searchParams.get('tool_id')
  const toolName = req.nextUrl.searchParams.get('tool')
  if (!toolId && !toolName) return badRequest('tool_id or tool required')

  let query = db
    .from('tool_servers')
    .select('id, tool_name, shop_tool_id, server_label, tier_required, max_concurrent_users, proxy_host, status')
    .eq('status', SESSION_STATUS.ACTIVE)
    .order('server_label')

  if (toolId) {
    query = query.eq('shop_tool_id', toolId)
  } else {
    const keyword = (toolName as string).split(' ')[0]
    query = query.ilike('tool_name', `%${keyword}%`)
  }

  const { data: servers } = await query
  if (!servers?.length) return NextResponse.json({ servers: [] })

  // Count active sessions per server in one query
  const { data: activeSessions } = await db
    .from('user_server_sessions')
    .select('server_id')
    .in('server_id', servers.map(s => s.id))
    .eq('status', SESSION_STATUS.ACTIVE)
    .gt('expires_at', new Date().toISOString())

  const sessionCounts: Record<string, number> = {}
  for (const s of activeSessions || []) {
    sessionCounts[s.server_id] = (sessionCounts[s.server_id] || 0) + 1
  }

  const accessible = servers
    .filter(s => canAccess(session.plan_slug, s.tier_required))
    .map(s => {
      const active = sessionCounts[s.id] || 0
      return {
        id:                   s.id,
        tool_name:            s.tool_name,
        server_label:         s.server_label,
        tier_required:        s.tier_required,
        max_concurrent_users: s.max_concurrent_users,
        current_active_users: active,
        proxy_host:           s.proxy_host,
        status:               s.status,
        is_full:              active >= s.max_concurrent_users,
      }
    })

  return NextResponse.json({ servers: accessible })
}
