import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET conversation + messages + notes
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  const [{ data: conv }, { data: messages }, { data: notes }] = await Promise.all([
    db.from('live_chat_conversations').select('*').eq('id', id).single(),
    db.from('live_chat_messages')
      .select('*, live_chat_attachments(*)')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
    db.from('live_chat_notes')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // mark admin messages as read, reset unread_admin counter
  await db.from('live_chat_conversations').update({ unread_admin: 0 }).eq('id', id)
  await db.from('live_chat_messages')
    .update({ status: 'read' })
    .eq('conversation_id', id)
    .eq('sender_type', 'member')
    .neq('status', 'read')

  return NextResponse.json({ conversation: conv, messages: messages || [], notes: notes || [] })
}

// PATCH — update status / assigned_admin
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { error } = await db
    .from('live_chat_conversations')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — delete conversation
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await db.from('live_chat_conversations').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
