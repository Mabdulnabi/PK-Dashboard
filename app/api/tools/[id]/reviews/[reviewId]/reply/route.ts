// POST: add a reply to a review (member or admin)
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reviewId: string } }
) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  const adminToken = cookieStore.get('pk_admin_session')?.value

  let memberId: string | null = null
  let isAdmin = false
  let authorName = 'Member'

  if (adminToken) {
    // admin reply
    isAdmin = true
    authorName = 'Pro Keys Support'
  } else if (token) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: session } = await supabase.rpc('verify_member_session', { p_token: token })
    if (!session?.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    memberId = session.member_id
    const { data: member } = await service.from('members').select('full_name').eq('id', memberId).single()
    authorName = member?.full_name || 'Member'
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const content = (body.content || '').trim().slice(0, 1000)
  const parentReplyId = body.parent_reply_id || null

  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const { data, error } = await service.from('tool_review_replies').insert({
    review_id: params.reviewId,
    parent_reply_id: parentReplyId,
    member_id: memberId,
    is_admin: isAdmin,
    author_name: authorName,
    content,
  }).select('id, author_name, is_admin, content, created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reply: data })
}
