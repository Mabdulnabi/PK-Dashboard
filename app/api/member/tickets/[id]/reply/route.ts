import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { fireAdminNotification } from '@/lib/admin-notify'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: sess } = await service.rpc('verify_member_session', { p_token: token })
  if (!sess?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { message } = await req.json()
  const messageText = message?.trim() || ''

  // Verify ticket belongs to member and is not closed
  const { data: ticket } = await service
    .from('support_tickets')
    .select('id, subject, status')
    .eq('id', params.id)
    .eq('member_id', sess.member_id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'ticket not found' }, { status: 404 })
  if (ticket.status === 'closed') return NextResponse.json({ error: 'ticket is closed' }, { status: 403 })

  // Only insert message row if there's text (attachment-only replies don't need a row)
  if (messageText) {
    const { error } = await service.from('ticket_messages').insert({
      ticket_id:   params.id,
      sender_type: 'member',
      message:     messageText,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  void fireAdminNotification({
    title:   `رد جديد على تذكرة 💬`,
    message: `رد العضو على التذكرة: "${ticket.subject}"`,
    type:    'info',
    link:    '/tickets',
  })

  // Reopen if resolved so admin sees it
  if (ticket.status === 'resolved') {
    await service.from('support_tickets').update({ status: 'in_progress' }).eq('id', params.id)
  }

  return NextResponse.json({ ok: true })
}
