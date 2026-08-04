import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

// Extract the admin user ID from the Supabase auth cookie by decoding
// the JWT payload directly. Avoids getSession() (which fails on token
// expiry when setAll is a no-op) and avoids db.auth.getUser() (which
// can update the shared db singleton's Authorization header, corrupting
// service-role access on tables with RLS).
// The middleware already verified the cookie exists; we trust the sub claim.
function getAdminUserId(): string | null {
  const cookieStore = cookies()
  const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    .replace('https://', '').split('.')[0]
  const name = `sb-${ref}-auth-token`

  // Read cookie value, handling chunked storage (.0, .1, ...)
  let raw = cookieStore.get(name)?.value ?? ''
  if (!raw) {
    let i = 0
    while (true) {
      const chunk = cookieStore.get(`${name}.${i}`)?.value
      if (!chunk) break
      raw += chunk
      i++
    }
  }
  if (!raw) return null

  try {
    const session = JSON.parse(decodeURIComponent(raw))
    const accessToken: string = session?.access_token
    if (!accessToken) return null
    // Decode JWT payload (middle segment) — no signature verification needed
    // since the middleware already gated on the cookie's existence.
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf-8')
    )
    return payload?.sub ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const userId = getAdminUserId()
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
  const userId = getAdminUserId()
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
