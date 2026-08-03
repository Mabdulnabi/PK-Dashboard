import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

async function getAdminSession() {
  const cookieStore = cookies()
  const sc = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await sc.auth.getSession()
  return session ?? null
}

// POST — admin sends a message
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { content, attachments } = await req.json()
  const session = await getAdminSession()
  const adminId   = session?.user?.id   || 'admin'
  const adminName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Admin'

  const { data: msg, error } = await db
    .from('live_chat_messages')
    .insert({
      conversation_id: params.id,
      sender_type: 'admin',
      sender_id: adminId,
      sender_name: adminName,
      content: content || null,
      status: 'sent',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (attachments?.length) {
    await db.from('live_chat_attachments').insert(
      attachments.map((a: any) => ({ ...a, message_id: msg.id }))
    )
  }

  // update conversation preview
  await db.from('live_chat_conversations').update({
    last_message: content || '📎 Attachment',
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', params.id)

  // increment unread_member atomically
  await db.rpc('increment_chat_unread_member', { conv_id: params.id })

  const { data: full } = await db
    .from('live_chat_messages')
    .select('*, live_chat_attachments(*)')
    .eq('id', msg.id)
    .single()

  return NextResponse.json({ message: full })
}

// PATCH message (edit/delete)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { message_id, content, deleted } = await req.json()
  const update: any = {}
  if (deleted) update.deleted_at = new Date().toISOString()
  else { update.content = content; update.edited_at = new Date().toISOString() }

  const { error } = await db.from('live_chat_messages').update(update).eq('id', message_id).eq('conversation_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
