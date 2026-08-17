export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  // Auth is handled by middleware (sets x-admin-user-id header)
  if (!req.headers.get('x-admin-user-id'))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await service.from('blog_posts')
    .select('*, members(full_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
