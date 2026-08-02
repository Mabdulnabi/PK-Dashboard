import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: session } = await service.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { server_id, updated_cookies } = await req.json()
  if (!server_id || !Array.isArray(updated_cookies) || updated_cookies.length === 0)
    return NextResponse.json({ error: 'server_id and updated_cookies required' }, { status: 400 })

  // Verify this member has/had an active session on this server
  const { data: activeSession } = await service
    .from('user_server_sessions')
    .select('id')
    .eq('server_id', server_id)
    .eq('member_id', session.member_id)
    .in('status', ['active', 'disconnected'])
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (!activeSession)
    return NextResponse.json({ error: 'no session found for this server' }, { status: 403 })

  // Fetch current session_data and merge updated cookies
  const { data: server } = await service
    .from('tool_servers')
    .select('session_data_encrypted')
    .eq('id', server_id)
    .single()

  if (!server) return NextResponse.json({ error: 'server not found' }, { status: 404 })

  let sessionData: any = {}
  try { sessionData = JSON.parse(server.session_data_encrypted || '{}') } catch {}

  // Merge: update existing cookies by name, keep ones not in the update
  const existing: any[] = Array.isArray(sessionData.cookies) ? sessionData.cookies : []
  const updateMap = new Map(updated_cookies.map((c: any) => [c.name, c]))
  const merged = existing.map((c: any) => updateMap.has(c.name) ? { ...c, ...updateMap.get(c.name) } : c)
  // Add any new cookies that weren't in the original set
  updated_cookies.forEach((c: any) => {
    if (!existing.find((e: any) => e.name === c.name)) merged.push(c)
  })

  const { error } = await service
    .from('tool_servers')
    .update({ session_data_encrypted: JSON.stringify({ ...sessionData, cookies: merged }) })
    .eq('id', server_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: merged.length })
}
