import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const token = cookies().get('pk_member_token')?.value
  if (!token) return NextResponse.json({ reminders: [] })

  const { data: session } = await service.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ reminders: [] })

  const now  = new Date()
  const from = new Date(now.getTime() - 5 * 60_000).toISOString()
  const to   = new Date(now.getTime() + 61_000).toISOString()

  const { data: taskReminders } = await service
    .from('focus_tasks')
    .select('id, title, remind_at')
    .eq('member_id', session.member_id)
    .is('board_id', null)
    .eq('done', false)
    .gte('remind_at', from)
    .lte('remind_at', to)

  const { data: calReminders } = await service
    .from('focus_calendar')
    .select('id, title, remind_at')
    .eq('member_id', session.member_id)
    .is('board_id', null)
    .not('remind_at', 'is', null)
    .gte('remind_at', from)
    .lte('remind_at', to)

  const reminders = [
    ...(taskReminders || []).map(r => ({ ...r, type: 'task' })),
    ...(calReminders  || []).map(r => ({ ...r, type: 'calendar' })),
  ]

  return NextResponse.json({ reminders })
}
