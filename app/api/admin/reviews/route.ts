// GET: all approved reviews with reactions + replies (admin)
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: NextRequest) {
  const { data: reviews } = await service
    .from('tool_reviews')
    .select('id,tool_id,member_id,member_name,stars,comment,approved,created_at,shop_tools(name)')
    .order('created_at', { ascending: false })

  const list = reviews || []
  if (!list.length) return NextResponse.json({ reviews: [] })

  const reviewIds = list.map(r => r.id)

  const [{ data: reactions }, { data: replies }] = await Promise.all([
    service.from('tool_review_reactions').select('review_id,type').in('review_id', reviewIds),
    service.from('tool_review_replies').select('id,review_id,author_name,is_admin,content,created_at').in('review_id', reviewIds).order('created_at', { ascending: true }),
  ])

  const likesMap: Record<string, { likes: number; dislikes: number }> = {}
  for (const r of (reactions || [])) {
    if (!likesMap[r.review_id]) likesMap[r.review_id] = { likes: 0, dislikes: 0 }
    if (r.type === 'like') likesMap[r.review_id].likes++
    else likesMap[r.review_id].dislikes++
  }
  const repliesMap: Record<string, any[]> = {}
  for (const rep of (replies || [])) {
    if (!repliesMap[rep.review_id]) repliesMap[rep.review_id] = []
    repliesMap[rep.review_id].push(rep)
  }

  const enriched = list.map(r => ({
    ...r,
    tool_name: (r.shop_tools as any)?.name || '',
    likes: likesMap[r.id]?.likes || 0,
    dislikes: likesMap[r.id]?.dislikes || 0,
    replies: repliesMap[r.id] || [],
  }))

  return NextResponse.json({ reviews: enriched })
}
