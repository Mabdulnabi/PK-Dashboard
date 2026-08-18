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
  const { data: review } = await service.from('tool_reviews').select('tool_id, member_id').eq('id', params.id).single()

  const { error } = await service
    .from('tool_reviews')
    .update({ approved: Boolean(approved) })
    .eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (review?.tool_id) {
    const [{ data: approvedReviews }, { data: tool }] = await Promise.all([
      service.from('tool_reviews').select('stars').eq('tool_id', review.tool_id).eq('approved', true),
      service.from('shop_tools').select('name').eq('id', review.tool_id).single(),
    ])
    const list = approvedReviews || []
    const avg  = list.length ? Math.round((list.reduce((s, r) => s + r.stars, 0) / list.length) * 10) / 10 : 0
    await service.from('shop_tools').update({ rating: avg, review_count: list.length }).eq('id', review.tool_id)

    if (review.member_id) {
      const toolName = tool?.name || ''
      await service.from('member_notifications').insert({
        member_id:  review.member_id,
        type:       approved ? 'success' : 'warning',
        title:      approved ? 'تم قبول تقييمك' : 'تم رفض تقييمك',
        title_en:   approved ? 'Review Approved' : 'Review Rejected',
        message:    approved ? `تم قبول تقييمك على "${toolName}" وأصبح ظاهراً للجميع 🌟` : `لم يتم قبول تقييمك على "${toolName}"`,
        message_en: approved ? `Your review for "${toolName}" has been approved and is now public 🌟` : `Your review for "${toolName}" was not approved`,
      })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await service.from('tool_reviews').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
