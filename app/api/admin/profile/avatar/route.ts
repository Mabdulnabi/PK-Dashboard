import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAdminId(): Promise<string | null> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  // Try session first, fall back to getUser (validates JWT server-side)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) return session.user.id
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function POST(req: NextRequest) {
  const adminId = await getAdminId()
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  // alias for rest of handler
  const session = { user: { id: adminId } }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${session.user.id}.${ext}`

  const bytes = await file.arrayBuffer()
  const { error } = await service.storage
    .from('admin-avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('admin-avatars').getPublicUrl(path)

  // Save to admin_profiles
  await service.from('admin_profiles').upsert({
    id:         session.user.id,
    avatar_url: publicUrl,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ url: publicUrl })
}
