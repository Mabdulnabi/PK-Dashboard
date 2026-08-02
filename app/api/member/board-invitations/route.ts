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

// GET: pending invitations sent TO me
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ invitations: [] })

  // Find by email
  const { data: member } = await service
    .from('members')
    .select('email')
    .eq('id', session.member_id)
    .single()

  if (!member) return NextResponse.json({ invitations: [] })

  const { data } = await service
    .from('board_invitations')
    .select('*, shared_boards(name, owner_id)')
    .eq('invitee_email', member.email)
    .eq('status', 'pending')

  return NextResponse.json({ invitations: data || [] })
}

// POST: send invitation
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { invitee_email } = await req.json()
  if (!invitee_email?.trim())
    return NextResponse.json({ error: 'email required' }, { status: 400 })

  // Get or create my board
  let { data: board } = await service
    .from('shared_boards')
    .select('id')
    .eq('owner_id', session.member_id)
    .maybeSingle()

  if (!board) {
    const { data: newBoard } = await service
      .from('shared_boards')
      .insert({ owner_id: session.member_id })
      .select()
      .single()
    board = newBoard
  }

  if (!board) return NextResponse.json({ error: 'could not create board' }, { status: 500 })

  // Check invitee exists
  const { data: invitee } = await service
    .from('members')
    .select('id')
    .eq('email', invitee_email.trim().toLowerCase())
    .maybeSingle()

  const { data, error } = await service
    .from('board_invitations')
    .upsert({
      board_id: board.id,
      inviter_id: session.member_id,
      invitee_email: invitee_email.trim().toLowerCase(),
      invitee_id: invitee?.id || null,
      status: 'pending',
    }, { onConflict: 'board_id,invitee_email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invitation: data })
}

// PATCH: accept or reject
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  if (!['accepted', 'rejected'].includes(status))
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })

  const updates: any = { status }
  if (status === 'accepted') updates.invitee_id = session.member_id

  const { error } = await service
    .from('board_invitations')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: revoke invitation (by board owner)
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  await service.from('board_invitations').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
