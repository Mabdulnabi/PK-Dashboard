import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

export async function GET() {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { data } = await db
    .from('member_notifications')
    .select('id, title, title_en, message, message_en, type, is_read, link, created_at')
    .eq('member_id', session.member_id)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ notifications: data || [] })
}

export async function PATCH(req: NextRequest) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { ids } = await req.json().catch(() => ({}))

  let query = db
    .from('member_notifications')
    .update({ is_read: true })
    .eq('member_id', session.member_id)
    .eq('is_read', false)

  if (Array.isArray(ids) && ids.length > 0) query = query.in('id', ids)

  await query
  return NextResponse.json({ ok: true })
}
