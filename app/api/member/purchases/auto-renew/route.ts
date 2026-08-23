import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember } from '@/lib/auth'
import { AuthError } from '@/lib/auth'

// PATCH — toggle auto_renew on one or multiple purchases
// body: { purchase_id, auto_renew } OR { ids: string[], auto_renew }
export async function PATCH(req: NextRequest) {
  let session
  try { session = await requireMember() } catch (e) {
    if (e instanceof AuthError) return e.response
    throw e
  }

  const body = await req.json()
  const { auto_renew } = body

  // Bulk update
  if (Array.isArray(body.ids)) {
    const { error } = await db
      .from('tool_purchases')
      .update({ auto_renew })
      .in('id', body.ids)
      .eq('member_id', session.member_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Single update
  const { purchase_id } = body
  if (!purchase_id) return NextResponse.json({ error: 'purchase_id required' }, { status: 400 })

  const { error } = await db
    .from('tool_purchases')
    .update({ auto_renew })
    .eq('id', purchase_id)
    .eq('member_id', session.member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
