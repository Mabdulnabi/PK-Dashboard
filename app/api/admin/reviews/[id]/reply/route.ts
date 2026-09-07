// POST: admin reply on any review
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  const cookieStore = cookies()
  const adminToken = cookieStore.get('pk_admin_session')?.value
  if (!adminToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // verify admin session
  const { data: admin } = await service
    .from('admin_sessions')
    .select('id')
    .eq('token', adminToken)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const content = (body.content || '').trim().slice(0, 1000)
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const { data, error } = await service.from('tool_review_replies').insert({
    review_id: params.reviewId,
    member_id: null,
    is_admin: true,
    author_name: 'Pro Keys Support',
    content,
  }).select('id, author_name, is_admin, content, created_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reply: data })
}
