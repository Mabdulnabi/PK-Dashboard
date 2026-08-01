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
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await service
    .from('support_tickets')
    .select('*, ticket_attachments(*), ticket_messages(id, sender_type, message, created_at)')
    .eq('member_id', session.member_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tickets: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getMemberSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { subject, message, priority, category } = await req.json()
  if (!subject || !message) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const { data: ticket, error } = await service.from('support_tickets').insert({
    member_id: session.member_id,
    subject,
    message,
    priority:  priority || 'normal',
    category:  category || 'general',
    status:    'open',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify member: ticket received confirmation
  service.from('member_notifications').insert({
    member_id:   session.member_id,
    title:       'تذكرة دعم مُستلمة 📩',
    title_en:    'Support ticket received 📩',
    message:     `تذكرتك "${subject}" وصلت لفريق الدعم وهيردوا عليك قريباً.`,
    message_en:  `Your ticket "${subject}" has been received. We'll reply soon.`,
    type:        'info',
  }).then(() => {})

  return NextResponse.json({ success: true, ticket_id: ticket?.id })
}
