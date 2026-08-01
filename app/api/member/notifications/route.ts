import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getMemberSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return null
  const { data } = await service.rpc('verify_member_session', { p_token: token })
  return data?.valid ? data : null
}

export async function GET() {
  const session = await getMemberSession()
  if (!session) return NextResponse.json({ notifications: [] })

  const { data } = await service
    .from('member_notifications')
    .select('*')
    .eq('member_id', session.member_id)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ notifications: data || [] })
}

// Mark notifications as read
export async function PATCH(req: NextRequest) {
  const session = await getMemberSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ids: string[] | undefined = body.ids

  let query = service
    .from('member_notifications')
    .update({ is_read: true })
    .eq('member_id', session.member_id)
    .eq('is_read', false)

  if (ids?.length) query = query.in('id', ids)

  await query
  return NextResponse.json({ ok: true })
}
