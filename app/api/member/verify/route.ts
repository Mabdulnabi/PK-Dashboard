import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { unauthorized } from '@/lib/responses'
import { MEMBER_COOKIE, SESSION_STATUS, AUDIT_ACTIONS } from '@/lib/constants'

export async function GET(_req: NextRequest) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { data: member } = await db
    .from('members')
    .select('member_code, avatar_url, created_at')
    .eq('id', session.member_id)
    .single()

  return NextResponse.json({
    ...session,
    member_code: member?.member_code ?? null,
    avatar_url:  member?.avatar_url  ?? null,
    created_at:  member?.created_at  ?? null,
  })
}

export async function DELETE() {
  let session
  try { session = await requireMember() } catch {
    const res = NextResponse.json({ success: true })
    res.cookies.delete(MEMBER_COOKIE)
    return res
  }

  await Promise.all([
    db.from('members')
      .update({ device_fingerprint: null })
      .eq('id', session.member_id),

    db.from('user_server_sessions')
      .update({ status: SESSION_STATUS.EXPIRED, expires_at: new Date().toISOString() })
      .eq('user_id', session.member_id)
      .eq('status', SESSION_STATUS.ACTIVE),

    writeAuditLog({
      member_id: session.member_id,
      action: AUDIT_ACTIONS.DISCONNECT,
      meta: { event: 'logout' },
    }),
  ])

  const res = NextResponse.json({ success: true })
  res.cookies.delete(MEMBER_COOKIE)
  return res
}
