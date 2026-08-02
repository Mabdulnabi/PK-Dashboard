// app/api/member/servers/route.ts
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

  const toolId   = req.nextUrl.searchParams.get('tool_id')
  const toolName = req.nextUrl.searchParams.get('tool')
  if (!toolId && !toolName) return NextResponse.json({ error: 'tool_id or tool required' }, { status: 400 })

  const tierOrder      = ['basic','vip','private']
  const memberTierIdx  = tierOrder.indexOf(session.plan_slug || 'basic')

  let query = service
    .from('tool_servers')
    .select('id, tool_name, shop_tool_id, server_label, tier_required, max_concurrent_users, proxy_host, proxy_port, status')
    .eq('status', 'active')
    .order('server_label')

  if (toolId) {
    // Exact match by product UUID — most reliable
    query = query.eq('shop_tool_id', toolId)
  } else {
    // Fallback: keyword match on tool_name (first word)
    const keyword = (toolName as string).split(' ')[0]
    query = query.ilike('tool_name', `%${keyword}%`)
  }

  const { data: servers } = await query
  if (!servers) return NextResponse.json({ servers: [] })

  // Count active sessions per server
  const serverIds = servers.map(s => s.id)
  const { data: sessions } = await service
    .from('user_server_sessions')
    .select('server_id')
    .in('server_id', serverIds)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  const sessionCounts: Record<string, number> = {}
  ;(sessions || []).forEach(s => {
    sessionCounts[s.server_id] = (sessionCounts[s.server_id] || 0) + 1
  })

  const accessible = servers
    .filter(s => memberTierIdx >= tierOrder.indexOf(s.tier_required))
    .map(s => ({
      id:                   s.id,
      tool_name:            s.tool_name,
      server_label:         s.server_label,
      tier_required:        s.tier_required,
      max_concurrent_users: s.max_concurrent_users,
      current_active_users: sessionCounts[s.id] || 0,
      proxy_host:           s.proxy_host,
      status:               s.status,
      is_full:              (sessionCounts[s.id] || 0) >= s.max_concurrent_users,
    }))

  return NextResponse.json({ servers: accessible })
}
