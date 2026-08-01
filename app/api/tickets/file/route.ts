import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/tickets/file?path=...
// Used by both member and admin to get a signed URL for a private attachment
export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const memberToken = cookieStore.get('pk_member_token')?.value
  const adminSession = await (async () => {
    const { data: { session } } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: req.headers.get('cookie') || '' } } }
    ).auth.getSession()
    return session
  })()

  // Must be authenticated (member or admin)
  const isMember = !!memberToken
  const isAdmin  = !!adminSession

  if (!isMember && !isAdmin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const { data, error } = await service.storage.from('ticket-attachments').createSignedUrl(filePath, 60)
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({ url: data.signedUrl })
}
