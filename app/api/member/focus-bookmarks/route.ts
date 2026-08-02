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
    .from('shared_boards')
    .select('owner_id')
    .eq('id', boardId)
    .single()
  if (board?.owner_id === memberId) return true
  const { data: inv } = await service
    .from('board_invitations')
    .select('id')
    .eq('board_id', boardId)
    .eq('invitee_id', memberId)
    .eq('status', 'accepted')
    .maybeSingle()
  return !!inv
}

// GET: bookmarks for private (board_id null) or shared board
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const boardId = searchParams.get('board_id')

  let query = service.from('focus_bookmarks').select('*')

  if (boardId) {
    if (!await canAccessBoard(session.member_id, boardId))
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    query = query.eq('board_id', boardId)
  } else {
    query = query.eq('member_id', session.member_id).is('board_id', null)
  }

  const { data } = await query.order('position').order('created_at')
  return NextResponse.json({ bookmarks: data || [] })
}

// POST: create bookmark or folder
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { type, name, url, folder_id, board_id, position } = await req.json()

  if (board_id && !await canAccessBoard(session.member_id, board_id))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await service
    .from('focus_bookmarks')
    .insert({
      member_id:  session.member_id,
      board_id:   board_id || null,
      created_by: session.member_id,
      type:       type || 'bookmark',
      name,
      url:        url || null,
      folder_id:  folder_id || null,
      position:   position || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookmark: data })
}

// PATCH: rename
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, name, url, folder_id } = await req.json()
  const updates: any = {}
  if (name      !== undefined) updates.name      = name
  if (url       !== undefined) updates.url        = url
  if (folder_id !== undefined) updates.folder_id  = folder_id

  // Only creator can edit
  const { error } = await service
    .from('focus_bookmarks')
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
  const id   = searchParams.get('id')
  const type = searchParams.get('type')

  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  if (type === 'folder') {
    // Delete folder contents first, then folder — only if creator
    await service.from('focus_bookmarks').delete()
      .eq('folder_id', id).eq('created_by', session.member_id)
    await service.from('focus_bookmarks').delete()
      .eq('id', id).eq('created_by', session.member_id)
  } else {
    await service.from('focus_bookmarks').delete()
      .eq('id', id).eq('created_by', session.member_id)
  }

  return NextResponse.json({ success: true })
}
