import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export async function GET() {
  const cookieStore = cookies()
  const sc = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await sc.auth.getSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await db
    .from('admin_profiles')
    .select('id, display_name, avatar_url')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json({
    id:           profile?.id           || session.user.id,
    display_name: profile?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Admin',
    avatar_url:   profile?.avatar_url   || null,
  })
}
