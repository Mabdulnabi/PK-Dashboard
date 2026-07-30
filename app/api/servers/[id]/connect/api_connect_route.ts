import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { device_fingerprint, duration_minutes = 60 } = body

  if (!device_fingerprint)
    return NextResponse.json({ error: 'device_fingerprint required' }, { status: 400 })

  const { data, error } = await supabase.rpc('connect_to_server', {
    p_server_id:          params.id,
    p_user_id:            session.user.id,
    p_device_fingerprint: device_fingerprint,
    p_duration_minutes:   duration_minutes,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.success) return NextResponse.json({ error: data.error }, { status: 403 })

  const { data: server } = await supabase
    .from('tool_servers')
    .select('session_data_encrypted, encryption_iv, proxy_host, proxy_port, proxy_username')
    .eq('id', params.id)
    .single()

  return NextResponse.json({
    success:                true,
    session_id:             data.session_id,
    expires_at:             data.expires_at,
    server_label:           data.server_label,
    session_data_encrypted: server?.session_data_encrypted,
    encryption_iv:          server?.encryption_iv,
    proxy: server?.proxy_host ? {
      host:     server.proxy_host,
      port:     server.proxy_port,
      username: server.proxy_username,
    } : null,
  })
}
