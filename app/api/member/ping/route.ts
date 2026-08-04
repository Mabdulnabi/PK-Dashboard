import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

export async function POST() {
  let sess
  try { sess = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }
  await db.from('members').update({ last_seen_at: new Date().toISOString() }).eq('id', sess.member_id)
  return NextResponse.json({ ok: true })
}
