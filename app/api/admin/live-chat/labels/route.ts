import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const { data } = await db.from('chat_labels').select('*').order('created_at', { ascending: true })
  return NextResponse.json({ labels: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Toggle label assignment on a conversation
  if (body.conversation_id && body.label_id) {
    const { data: existing } = await db
      .from('conversation_labels')
      .select('label_id')
      .eq('conversation_id', body.conversation_id)
      .eq('label_id', body.label_id)
      .maybeSingle()

    if (existing) {
      await db.from('conversation_labels')
        .delete()
        .eq('conversation_id', body.conversation_id)
        .eq('label_id', body.label_id)
    } else {
      await db.from('conversation_labels')
        .insert({ conversation_id: body.conversation_id, label_id: body.label_id })
    }
    return NextResponse.json({ ok: true })
  }

  // Delete label
  if (body.id && body.deleted) {
    await db.from('chat_labels').delete().eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  // Update label
  if (body.id) {
    const { data } = await db.from('chat_labels')
      .update({ name: body.name, color: body.color })
      .eq('id', body.id)
      .select().single()
    return NextResponse.json({ label: data })
  }

  // Create label
  const { data } = await db.from('chat_labels')
    .insert({ name: body.name, color: body.color || '#6366f1' })
    .select().single()
  return NextResponse.json({ label: data })
}
