import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSession() {
  const token = cookies().get('pk_member_token')?.value
  if (!token) return null
  const { data } = await service.rpc('verify_member_session', { p_token: token })
  return data?.valid ? data : null
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const mid = session.member_id

  const [bk, nt, tk, ev] = await Promise.all([
    service.from('focus_bookmarks').select('*').eq('member_id', mid).is('board_id', null),
    service.from('focus_notes').select('*').eq('member_id', mid).is('board_id', null),
    service.from('focus_tasks').select('*').eq('member_id', mid).is('board_id', null),
    service.from('focus_calendar').select('*').eq('member_id', mid).is('board_id', null),
  ])

  const payload = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    bookmarks: bk.data || [],
    notes: nt.data || [],
    tasks: tk.data || [],
    calendar_events: ev.data || [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="focus-mode-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
