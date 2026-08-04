import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

// GET — return favorited tools
export async function GET() {
  let sess
  try { sess = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { data } = await db
    .from('favorites')
    .select('id, tool_id, created_at, shop_tools(id,name,description,image_url,price_egp,price_usd,duration_label,category_slug,is_out_of_stock)')
    .eq('member_id', sess.member_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ favorites: data || [] })
}

// POST — toggle favorite  { tool_id }
export async function POST(req: NextRequest) {
  let sess
  try { sess = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { tool_id } = await req.json()
  if (!tool_id) return NextResponse.json({ error: 'tool_id required' }, { status: 400 })

  // Check if already favorited
  const { data: existing } = await db
    .from('favorites')
    .select('id')
    .eq('member_id', sess.member_id)
    .eq('tool_id', tool_id)
    .single()

  if (existing) {
    await db.from('favorites').delete().eq('id', existing.id)
    return NextResponse.json({ favorited: false })
  } else {
    await db.from('favorites').insert({ member_id: sess.member_id, tool_id })
    return NextResponse.json({ favorited: true })
  }
}
