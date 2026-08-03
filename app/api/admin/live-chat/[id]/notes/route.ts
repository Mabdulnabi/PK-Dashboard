import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { content, note_id, deleted } = await req.json()
  const cookieStore = cookies()
  const sc = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await sc.auth.getSession()
  const adminId   = session?.user?.id || 'admin'
  const adminName = session?.user?.user_metadata?.full_name || 'Admin'

  if (note_id && deleted) {
    const { error } = await db.from('live_chat_notes').delete().eq('id', note_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }
  if (note_id) {
    const { error } = await db.from('live_chat_notes')
      .update({ content, updated_at: new Date().toISOString() }).eq('id', note_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await db.from('live_chat_notes')
    .insert({ conversation_id: params.id, admin_id: adminId, admin_name: adminName, content })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
