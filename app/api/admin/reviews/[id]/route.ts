// PATCH approve/reject, DELETE review
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { approved } = await req.json()

  // Get the tool_id before updating so we can recalculate stats
  const { data: review } = await service.from('tool_reviews').select('tool_id').eq('id', params.id).single()

  const { error } = await service
    .from('tool_reviews')
    .update({ approved: Boolean(approved) })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalculate and sync rating + review_count on shop_tools
  if (review?.tool_id) {
    const { data: approvedReviews } = await service
      .from('tool_reviews')
      .select('stars')
      .eq('tool_id', review.tool_id)
      .eq('approved', true)
    const list = approvedReviews || []
    const avg  = list.length ? Math.round((list.reduce((s, r) => s + r.stars, 0) / list.length) * 10) / 10 : 0
    await service.from('shop_tools').update({ rating: avg, review_count: list.length }).eq('id', review.tool_id)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await service.from('tool_reviews').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
