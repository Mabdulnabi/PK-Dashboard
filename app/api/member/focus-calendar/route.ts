import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSession() {
  const token = cookies().get('pk_member_token')?.value
  if (!token) return null
  const { data } = await service.rpc('verify_member_session', { p_token: token })
  return data?.valid ? data : null
}

async function canAccessBoard(memberId: string, boardId: string) {
  const { data: board } = await service
    .from('shared_boards').select('owner_id').eq('id', boardId).single()
  if (board?.owner_id === memberId) return true
  const { data: inv } = await service
    .from('board_invitations').select('id')
    .eq('board_id', boardId).eq('invitee_id', memberId).eq('status', 'accepted').maybeSingle()
  return !!inv
}

// GET: events for a month range
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const boardId = searchParams.get('board_id')
  const from    = searchParams.get('from')
  const to      = searchParams.get('to')

  let query = service.from('focus_calendar').select('*')

  if (boardId) {
    if (!await canAccessBoard(session.member_id, boardId))
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    query = query.eq('board_id', boardId)
  } else {
    query = query.eq('member_id', session.member_id).is('board_id', null)
  }

  if (from) query = query.gte('start_at', from)
  if (to)   query = query.lte('start_at', to)

  const { data } = await query.order('start_at')
  return NextResponse.json({ events: data || [] })
}

// POST: create event
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { title, description, start_at, end_at, all_day, color, remind_at, board_id, recurrence } = await req.json()

  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
  if (!start_at)      return NextResponse.json({ error: 'start_at required' }, { status: 400 })

  if (board_id && !await canAccessBoard(session.member_id, board_id))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await service
    .from('focus_calendar')
    .insert({
      member_id:   session.member_id,
      board_id:    board_id || null,
      created_by:  session.member_id,
      title:       title.trim(),
      description: description || null,
      start_at,
      end_at:      end_at || null,
      all_day:     all_day || false,
      color:       color || '#06b6d4',
      remind_at:   remind_at || null,
      recurrence:  recurrence || 'none',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

// PATCH: update — only creator
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, title, description, start_at, end_at, all_day, color, remind_at, recurrence } = await req.json()
  const updates: any = {}
  if (title       !== undefined) updates.title       = title
  if (description !== undefined) updates.description = description
  if (start_at    !== undefined) updates.start_at    = start_at
  if (end_at      !== undefined) updates.end_at      = end_at
  if (all_day     !== undefined) updates.all_day     = all_day
  if (color       !== undefined) updates.color       = color
  if (remind_at   !== undefined) updates.remind_at   = remind_at
  if (recurrence  !== undefined) updates.recurrence  = recurrence

  const { error } = await service
    .from('focus_calendar')
    .update(updates)
    .eq('id', id)
    .eq('created_by', session.member_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: only creator
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  await service.from('focus_calendar').delete()
    .eq('id', id).eq('created_by', session.member_id)

  return NextResponse.json({ success: true })
}
