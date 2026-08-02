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

// GET: return my board + boards I'm invited to (accepted)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // My own board
  const { data: myBoard } = await service
    .from('shared_boards')
    .select('*')
    .eq('owner_id', session.member_id)
    .maybeSingle()

  // Boards I've been invited to and accepted
  const { data: invitations } = await service
    .from('board_invitations')
    .select('board_id, shared_boards(*)')
    .eq('invitee_id', session.member_id)
    .eq('status', 'accepted')

  const invitedBoards = (invitations || []).map((inv: any) => ({
    ...inv.shared_boards,
    role: 'collaborator',
  }))

  return NextResponse.json({
    myBoard: myBoard ? { ...myBoard, role: 'owner' } : null,
    invitedBoards,
  })
}

// POST: create my shared board (one per member)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { name } = await req.json()

  // Check if already has a board
  const { data: existing } = await service
    .from('shared_boards')
    .select('id')
    .eq('owner_id', session.member_id)
    .maybeSingle()

  if (existing) return NextResponse.json({ board: existing })

  const { data, error } = await service
    .from('shared_boards')
    .insert({ owner_id: session.member_id, name: name || 'Shared Board' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ board: data })
}

// PATCH: rename board
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { name } = await req.json()
  const { error } = await service
    .from('shared_boards')
    .update({ name })
    .eq('owner_id', session.member_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
