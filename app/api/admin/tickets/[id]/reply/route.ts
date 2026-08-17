import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { fireAdminNotification } from '@/lib/admin-notify'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { reply, status = 'in_progress', admin_id } = await req.json()
  const replyText = reply?.trim() || ''

  const { data: ticket } = await service
    .from('support_tickets')
    .select('id, member_id, subject')
    .eq('id', params.id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'ticket not found' }, { status: 404 })

  // Fetch admin profile for display name
  let adminName   = 'Support Team'
  let adminAvatar: string | null = null
  if (admin_id) {
    const { data: profile } = await service
      .from('admin_profiles')
      .select('display_name, avatar_url')
      .eq('id', admin_id)
      .single()
    if (profile) {
      adminName   = profile.display_name || 'Support Team'
      adminAvatar = profile.avatar_url   || null
    }
  }

  const { error } = await service.from('support_tickets').update({
    reply:       replyText || null,
    status,
    replied_by:  admin_id || null,
    replied_at:  new Date().toISOString(),
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert message bubble and surface any error to the client
  if (replyText) {
    const { error: msgErr } = await service.from('ticket_messages').insert({
      ticket_id:     params.id,
      sender_type:   'admin',
      message:       replyText,
      sender_name:   adminName,
      sender_avatar: adminAvatar,
    })
    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })
  }

  // Notify admin channel so other admin tabs reload the ticket list instantly
  void fireAdminNotification({
    title:   `رد أُرسل على تذكرة 💬`,
    message: `تم الرد على التذكرة: "${ticket.subject}"`,
    type:    'info',
    link:    '/tickets',
  })

  // Notify member (bilingual)
  service.from('member_notifications').insert({
    member_id:   ticket.member_id,
    title:       `رد من ${adminName} على تذكرتك 💬`,
    title_en:    `Reply from ${adminName} on your ticket 💬`,
    message:     `تم الرد على تذكرتك "${ticket.subject}". افتح Help Desk لعرض الرد.`,
    message_en:  `Your ticket "${ticket.subject}" has a new reply. Open Help Desk to view it.`,
    type:        'info',
    link:        '/u/tickets',
  }).then(() => {})

  return NextResponse.json({ ok: true })
}
