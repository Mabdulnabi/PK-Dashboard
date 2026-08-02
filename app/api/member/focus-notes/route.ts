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

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const boardId = searchParams.get('board_id')

  let query = service.from('focus_notes').select('*')

  if (boardId) {
    if (!await canAccessBoard(session.member_id, boardId))
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    query = query.eq('board_id', boardId)
  } else {
    query = query.eq('member_id', session.member_id).is('board_id', null)
  }

  const { data } = await query.order('updated_at', { ascending: false })
  return NextResponse.json({ notes: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { title, content, board_id } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  if (board_id && !await canAccessBoard(session.member_id, board_id))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await service
    .from('focus_notes')
    .insert({
      member_id:  session.member_id,
      board_id:   board_id || null,
      created_by: session.member_id,
      title:      title.trim(),
      content:    content || '',
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, title, content } = await req.json()

  const { data: note } = await service
    .from('focus_notes').select('board_id, member_id').eq('id', id).single()
  if (!note) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (note.board_id) {
    if (!await canAccessBoard(session.member_id, note.board_id))
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  } else if (note.member_id !== session.member_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const updates: any = { updated_at: new Date().toISOString() }
  if (title   !== undefined) updates.title   = title
  if (content !== undefined) updates.content = content

  const { error } = await service.from('focus_notes').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  await service.from('focus_notes').delete()
    .eq('id', id)
    .or(`member_id.eq.${session.member_id},created_by.eq.${session.member_id}`)

  return NextResponse.json({ success: true })
}
