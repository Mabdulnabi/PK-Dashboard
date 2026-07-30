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

  const toolName = req.nextUrl.searchParams.get('tool')
  if (!toolName) return NextResponse.json({ error: 'tool required' }, { status: 400 })

  const toolKeyword = toolName.split(' ')[0]
  const tierOrder   = ['basic','vip','private']
  const memberTierIdx = tierOrder.indexOf(session.plan_slug || 'basic')

  const { data: servers } = await service
    .from('tool_servers')
    .select('id, server_label, tier_required, max_concurrent_users, proxy_host, proxy_port, status')
    .ilike('tool_name', `%${toolKeyword}%`)
    .eq('status', 'active')
    .order('server_label')

  if (!servers) return NextResponse.json({ servers: [] })

  // Count active sessions per server from DB (source of truth)
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
    .filter(s => {
      const sIdx = tierOrder.indexOf(s.tier_required)
      return memberTierIdx >= sIdx
    })
    .map(s => ({
      id:                   s.id,
      server_label:         s.server_label,
      tier_required:        s.tier_required,
      max_concurrent_users: s.max_concurrent_users,
      current_active_users: sessionCounts[s.id] || 0,
      proxy_host:           s.proxy_host,
      proxy_port:           s.proxy_port,
      status:               s.status,
      is_full:              (sessionCounts[s.id] || 0) >= s.max_concurrent_users,
    }))

  return NextResponse.json({ servers: accessible })
}
