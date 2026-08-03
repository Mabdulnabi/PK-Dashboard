import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { badRequest } from '@/lib/responses'

// GET — fetch all tickets with member info (service role bypasses RLS)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')

  let query = db
    .from('support_tickets')
    .select('*, ticket_attachments(*), ticket_messages(id, sender_type, message, sender_name, sender_avatar, created_at)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: tickets, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with member info in one query
  const memberIds = [...new Set((tickets || []).map((t: any) => t.member_id).filter(Boolean))]
  let memberMap: Record<string, any> = {}
  if (memberIds.length > 0) {
    const { data: members } = await db
      .from('members')
      .select('id, full_name, member_code, avatar_url')
      .in('id', memberIds)
    for (const m of members || []) memberMap[m.id] = m
  }

  const enriched = (tickets || []).map((t: any) => ({
    ...t,
    member: memberMap[t.member_id] ?? null,
  }))

  return NextResponse.json({ tickets: enriched })
}

// PATCH — update ticket status
export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id || !status) return badRequest('id and status required')

  const { error } = await db.from('support_tickets').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
