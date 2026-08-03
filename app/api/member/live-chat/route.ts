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
  return data as { member_id: string; valid: boolean }
}

// GET — get or create conversation for member
export async function GET(req: NextRequest) {
  const sess = await getMember(req)
  if (!sess) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let { data: conv } = await service
    .from('live_chat_conversations')
    .select('id, status, unread_member, updated_at')
    .eq('member_id', sess.member_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!conv) {
    const { data: newConv } = await service
      .from('live_chat_conversations')
      .insert({ member_id: sess.member_id })
      .select('id, status, unread_member, updated_at')
      .single()
    conv = newConv
  }

  // mark member messages as delivered
  if (conv) {
    await service
      .from('live_chat_messages')
      .update({ status: 'delivered' })
      .eq('conversation_id', conv.id)
      .eq('sender_type', 'admin')
      .eq('status', 'sent')
    await service
      .from('live_chat_conversations')
      .update({ unread_member: 0 })
      .eq('id', conv.id)
  }

  return NextResponse.json({ conversation: conv })
}
