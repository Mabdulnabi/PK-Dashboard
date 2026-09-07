// POST: toggle like/dislike on a review
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
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: session } = await supabase.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const type = body.type // 'like' | 'dislike'
  if (type !== 'like' && type !== 'dislike')
    return NextResponse.json({ error: 'type must be like or dislike' }, { status: 400 })

  // check existing reaction
  const { data: existing } = await service
    .from('tool_review_reactions')
    .select('id, type')
    .eq('review_id', params.reviewId)
    .eq('member_id', session.member_id)
    .maybeSingle()

  if (existing) {
    if (existing.type === type) {
      // toggle off
      await service.from('tool_review_reactions').delete().eq('id', existing.id)
      return NextResponse.json({ action: 'removed' })
    } else {
      // switch type
      await service.from('tool_review_reactions').update({ type }).eq('id', existing.id)
      return NextResponse.json({ action: 'switched' })
    }
  }

  await service.from('tool_review_reactions').insert({
    review_id: params.reviewId,
    member_id: session.member_id,
    type,
  })
  return NextResponse.json({ action: 'added' })
}
