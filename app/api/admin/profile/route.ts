import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

async function getAdminSession() {
  const cookieStore = cookies()
  const sc = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await sc.auth.getSession()
  return session
}

export async function GET() {
  const session = await getAdminSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await db
    .from('admin_profiles')
    .select('id, display_name, full_name, avatar_url, whatsapp')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json({
    id:           profile?.id           || session.user.id,
    display_name: profile?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Admin',
    full_name:    profile?.full_name    || null,
    avatar_url:   profile?.avatar_url   || null,
    whatsapp:     profile?.whatsapp     || null,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { display_name, full_name, avatar_url, whatsapp, email, password } = await req.json()

  // Save profile fields
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (display_name !== undefined) updates.display_name = display_name
  if (full_name    !== undefined) updates.full_name    = full_name
  if (avatar_url   !== undefined) updates.avatar_url   = avatar_url
  if (whatsapp     !== undefined) updates.whatsapp     = whatsapp

  const { error } = await db
    .from('admin_profiles')
    .upsert({ id: session.user.id, ...updates }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update Supabase auth email/password if provided
  if (email || password) {
    const cookieStore = cookies()
    const sc = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const authUpdate: any = {}
    if (email)    authUpdate.email    = email
    if (password) authUpdate.password = password
    await sc.auth.updateUser(authUpdate)
  }

  return NextResponse.json({ ok: true })
}
