import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAdminSession() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session ?? null
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await service
    .from('admin_profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json(data ?? {
    id: session.user.id,
    display_name: 'Support Team',
    full_name:    session.user.user_metadata?.full_name || '',
    avatar_url:   null,
    whatsapp:     null,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const profile: Record<string, any> = { id: session.user.id, updated_at: new Date().toISOString() }

  if (body.display_name !== undefined) profile.display_name = body.display_name
  if (body.full_name    !== undefined) profile.full_name    = body.full_name
  if (body.avatar_url   !== undefined) profile.avatar_url   = body.avatar_url || null
  if (body.whatsapp     !== undefined) profile.whatsapp     = body.whatsapp?.trim() || null

  const { error } = await service.from('admin_profiles').upsert(profile)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update email/password via Supabase Auth if provided
  if (body.email || body.password) {
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookies().getAll(), setAll: () => {} } }
    )
    const authUpdates: any = {}
    if (body.email?.trim())    authUpdates.email    = body.email.trim()
    if (body.password?.trim()) authUpdates.password = body.password.trim()
    if (Object.keys(authUpdates).length > 0) {
      await adminSupabase.auth.updateUser(authUpdates)
    }
  }

  return NextResponse.json({ ok: true })
}
