import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { db } from '@/lib/db'

// Create a fresh, isolated Supabase client (anon key) to verify the
// current user session. Using auth.getUser() (not getSession()) hits
// the Supabase Auth API directly, so it always returns the correct user
// even when the local session appears stale. A fresh client is used
// instead of the shared `db` singleton so that this call cannot mutate
// the singleton's Authorization header and corrupt service-role access.
async function getAdminUserId(): Promise<string | null> {
  const cookieStore = cookies()
  const sc = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await sc.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const userId = await getAdminUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await db
    .from('admin_profiles')
    .select('id, display_name, full_name, avatar_url, whatsapp')
    .eq('id', userId)
    .single()

  return NextResponse.json({
    id:           profile?.id           || userId,
    display_name: profile?.display_name || 'Admin',
    full_name:    profile?.full_name    || null,
    avatar_url:   profile?.avatar_url   || null,
    whatsapp:     profile?.whatsapp     || null,
  })
}

export async function PATCH(req: NextRequest) {
  const userId = await getAdminUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { display_name, full_name, avatar_url, whatsapp, email, password } = await req.json()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (display_name !== undefined) updates.display_name = display_name
  if (full_name    !== undefined) updates.full_name    = full_name
  if (avatar_url   !== undefined) updates.avatar_url   = avatar_url
  if (whatsapp     !== undefined) updates.whatsapp     = whatsapp

  const { error } = await db
    .from('admin_profiles')
    .upsert({ id: userId, ...updates }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update auth email/password if provided
  if (email || password) {
    const authUpdate: any = {}
    if (email)    authUpdate.email    = email
    if (password) authUpdate.password = password
    await db.auth.admin.updateUserById(userId, authUpdate)
  }

  return NextResponse.json({ ok: true })
}
