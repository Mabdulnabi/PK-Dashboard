import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

// GET — return cart items with tool details
export async function GET() {
  let sess
  try { sess = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { data } = await db
    .from('cart_items')
    .select('id, tool_id, quantity, created_at, shop_tools(id,name,description,image_url,price_egp,price_usd,duration_label,category_slug,is_out_of_stock)')
    .eq('member_id', sess.member_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ items: data || [] })
}

// POST — add or update item  { tool_id, quantity? }
export async function POST(req: NextRequest) {
  let sess
  try { sess = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { tool_id, quantity = 1 } = await req.json()
  if (!tool_id) return NextResponse.json({ error: 'tool_id required' }, { status: 400 })
  if (quantity < 1) return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 })

  const { data, error } = await db
    .from('cart_items')
    .upsert({ member_id: sess.member_id, tool_id, quantity }, { onConflict: 'member_id,tool_id' })
    .select('id, tool_id, quantity')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

// PATCH — update quantity  { tool_id, quantity }
export async function PATCH(req: NextRequest) {
  let sess
  try { sess = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { tool_id, quantity } = await req.json()
  if (!tool_id || quantity == null) return NextResponse.json({ error: 'tool_id and quantity required' }, { status: 400 })
  if (quantity < 1) return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 })

  const { error } = await db
    .from('cart_items')
    .update({ quantity })
    .eq('member_id', sess.member_id)
    .eq('tool_id', tool_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove item  { tool_id } or clear all { clear: true }
export async function DELETE(req: NextRequest) {
  let sess
  try { sess = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { tool_id, clear } = await req.json()

  if (clear) {
    await db.from('cart_items').delete().eq('member_id', sess.member_id)
  } else if (tool_id) {
    await db.from('cart_items').delete().eq('member_id', sess.member_id).eq('tool_id', tool_id)
  } else {
    return NextResponse.json({ error: 'tool_id or clear required' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
