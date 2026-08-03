import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getMember(req: NextRequest) {
  const token = cookies().get('pk_member_token')?.value || req.headers.get('x-session-token') || ''
  if (!token) return null
  const { data } = await service.rpc('verify_member_session', { p_token: token })
  if (!data?.valid) return null
  return data as { member_id: string }
}

// GET — fetch messages for member's conversation
export async function GET(req: NextRequest) {
  const sess = await getMember(req)
  if (!sess) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const convId = req.nextUrl.searchParams.get('conv_id')
  if (!convId) return NextResponse.json({ error: 'missing conv_id' }, { status: 400 })

  // verify ownership
  const { data: conv } = await service
    .from('live_chat_conversations')
    .select('id')
    .eq('id', convId)
    .eq('member_id', sess.member_id)
    .single()
  if (!conv) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: messages } = await service
    .from('live_chat_messages')
    .select('*, live_chat_attachments(*)')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })

  // mark admin messages as read
  await service.from('live_chat_messages')
    .update({ status: 'read' })
    .eq('conversation_id', convId)
    .eq('sender_type', 'admin')
    .neq('status', 'read')

  return NextResponse.json({ messages: messages || [] })
}

// POST — member sends a message
export async function POST(req: NextRequest) {
  const sess = await getMember(req)
  if (!sess) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { conv_id, content, attachments } = await req.json()

  // verify ownership
  const { data: conv } = await service
    .from('live_chat_conversations')
    .select('id')
    .eq('id', conv_id)
    .eq('member_id', sess.member_id)
    .single()
  if (!conv) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: member } = await service
    .from('members')
    .select('full_name, avatar_url')
    .eq('id', sess.member_id)
    .single()

  const { data: msg, error } = await service
    .from('live_chat_messages')
    .insert({
      conversation_id: conv_id,
      sender_type: 'member',
      sender_id: sess.member_id,
      sender_name: member?.full_name || 'Member',
      sender_avatar: member?.avatar_url || null,
      content: content || null,
      status: 'sent',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (attachments?.length) {
    await service.from('live_chat_attachments').insert(
      attachments.map((a: any) => ({ ...a, message_id: msg.id }))
    )
  }

  // update conversation preview
  await service.from('live_chat_conversations').update({
    last_message: content || '📎 Attachment',
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'open',
  }).eq('id', conv_id)

  // increment unread_admin atomically
  await service.rpc('increment_chat_unread_admin', { conv_id })

  const { data: full } = await service
    .from('live_chat_messages')
    .select('*, live_chat_attachments(*)')
    .eq('id', msg.id)
    .single()

  return NextResponse.json({ message: full })
}

// PATCH — member edits/deletes own message
export async function PATCH(req: NextRequest) {
  const sess = await getMember(req)
  if (!sess) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { message_id, content, deleted } = await req.json()

  const { data: msg } = await service
    .from('live_chat_messages')
    .select('sender_id')
    .eq('id', message_id)
    .single()
  if (msg?.sender_id !== sess.member_id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const update: any = {}
  if (deleted) update.deleted_at = new Date().toISOString()
  else { update.content = content; update.edited_at = new Date().toISOString() }

  await service.from('live_chat_messages').update(update).eq('id', message_id)
  return NextResponse.json({ ok: true })
}
