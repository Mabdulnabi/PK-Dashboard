// app/api/member/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: session } = await service.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { action, rating, comment } = await req.json()

  const { data: purchase } = await service
    .from('tool_purchases')
    .select('id, status, member_id, shop_tools(id, name)')
    .eq('id', params.id)
    .eq('member_id', session.member_id)
    .single()

  if (!purchase) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (action === 'confirm_delivery') {
    if ((purchase as any).status !== 'delivered')
      return NextResponse.json({ error: 'not delivered yet' }, { status: 400 })

    await service
      .from('tool_purchases')
      .update({ status: 'completed' })
      .eq('id', params.id)

    return NextResponse.json({ ok: true })
  }

  if (action === 'rate') {
    if (!rating || rating < 1 || rating > 5)
      return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })

    const toolId = (purchase as any).shop_tools?.id
    if (!toolId) return NextResponse.json({ error: 'no tool' }, { status: 400 })

    const { data: memberInfo } = await service
      .from('members')
      .select('full_name')
      .eq('id', session.member_id)
      .single()

    // Delete existing review for this member+tool then re-insert (no unique constraint on purchase_id)
    await service.from('tool_reviews')
      .delete()
      .eq('tool_id', toolId)
      .eq('member_id', session.member_id)

    const { error } = await service.from('tool_reviews').insert({
      tool_id:     toolId,
      member_id:   session.member_id,
      member_name: (memberInfo as any)?.full_name || 'Member',
      stars:       rating,
      comment:     comment?.trim() || null,
      approved:    false,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Recalculate average rating from approved reviews
    const { data: reviews } = await service
      .from('tool_reviews')
      .select('stars')
      .eq('tool_id', toolId)
      .eq('approved', true)

    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((s: number, r: any) => s + r.stars, 0) / reviews.length
      await service
        .from('shop_tools')
        .update({ rating: Math.round(avg * 10) / 10, review_count: reviews.length })
        .eq('id', toolId)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
