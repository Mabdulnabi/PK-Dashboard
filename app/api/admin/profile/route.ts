import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAdminId() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

export async function GET() {
  const adminId = await getAdminId()
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await service
    .from('admin_profiles')
    .select('*')
    .eq('id', adminId)
    .single()

  // Return defaults if no profile yet
  return NextResponse.json(data ?? { id: adminId, display_name: 'Support Team', avatar_url: null })
}

export async function PATCH(req: NextRequest) {
  const adminId = await getAdminId()
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { display_name, avatar_url } = await req.json()

  const { error } = await service
    .from('admin_profiles')
    .upsert({ id: adminId, display_name, avatar_url, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
