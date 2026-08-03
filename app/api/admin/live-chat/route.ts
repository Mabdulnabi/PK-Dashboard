import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET  /api/admin/live-chat  — list all conversations with member info
export async function GET(req: NextRequest) {
  const filter = req.nextUrl.searchParams.get('filter') || 'all'
  const search = req.nextUrl.searchParams.get('search') || ''

  let query = db
    .from('live_chat_conversations')
    .select('*, live_chat_messages(id)', { count: 'exact' })
    .order('updated_at', { ascending: false })

  if (filter === 'unread') query = query.gt('unread_admin', 0)

  const { data: convs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const memberIds = [...new Set((convs || []).map((c: any) => c.member_id))]
  let memberMap: Record<string, any> = {}
  if (memberIds.length) {
    const { data: members } = await db
      .from('members')
      .select('id, full_name, member_code, avatar_url, email')
      .in('id', memberIds)
    for (const m of members || []) memberMap[m.id] = m
  }

  let list = (convs || []).map((c: any) => ({ ...c, member: memberMap[c.member_id] ?? null }))

  if (search) {
    const q = search.toLowerCase()
    list = list.filter((c: any) =>
      c.member?.full_name?.toLowerCase().includes(q) ||
      c.member?.member_code?.toLowerCase().includes(q)
    )
  }

  return NextResponse.json({ conversations: list })
}
