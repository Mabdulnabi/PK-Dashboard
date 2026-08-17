// GET approved reviews + POST new review (member)
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: reviews } = await service
    .from('tool_reviews')
    .select('id,member_name,stars,comment,created_at,members(avatar_url)')
    .eq('tool_id', params.id)
    .eq('approved', true)
    .order('created_at', { ascending: false })

  // aggregate
  const list = reviews || []
  const avg  = list.length ? list.reduce((s,r)=>s+r.stars,0)/list.length : 0
  const dist = [5,4,3,2,1].map(s=>({ stars:s, count: list.filter(r=>r.stars===s).length }))

  return NextResponse.json({ reviews: list, avg: Math.round(avg*10)/10, total: list.length, dist })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  const { data: member } = await service
    .from('members')
    .select('full_name')
    .eq('id', session.member_id)
    .single()

  const body = await req.json()
  const stars   = Number(body.stars)
  const comment = (body.comment || '').trim().slice(0, 1000)

  if (!stars || stars < 1 || stars > 5)
    return NextResponse.json({ error: 'stars must be 1-5' }, { status: 400 })

  const { error } = await service.from('tool_reviews').upsert({
    tool_id:     params.id,
    member_id:   session.member_id,
    member_name: member?.full_name || 'Member',
    stars,
    comment: comment || null,
    approved: false,
  }, { onConflict: 'tool_id,member_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
