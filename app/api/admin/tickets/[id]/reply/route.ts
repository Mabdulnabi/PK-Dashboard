import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { reply, status = 'resolved', admin_id } = await req.json()
  if (!reply?.trim()) return NextResponse.json({ error: 'reply required' }, { status: 400 })

  const { data: ticket } = await service
    .from('support_tickets')
    .select('id, member_id, subject')
    .eq('id', params.id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'ticket not found' }, { status: 404 })

  const { error } = await service.from('support_tickets').update({
    reply,
    status,
    replied_by:  admin_id || null,
    replied_at:  new Date().toISOString(),
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify member
  service.from('member_notifications').insert({
    member_id: ticket.member_id,
    title:     'رد جديد على تذكرتك 💬',
    message:   `تم الرد على تذكرتك "${ticket.subject}". ادخل على Help Desk لعرض الرد.`,
    type:      'info',
  }).then(() => {})

  return NextResponse.json({ ok: true })
}
