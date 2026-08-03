import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember } from '@/lib/auth'
import { SESSION_STATUS } from '@/lib/constants'

export async function GET(req: NextRequest) {
  let session
  try { session = await requireMember() } catch {
    return NextResponse.json({ active: false })
  }

  const serverId = req.nextUrl.searchParams.get('server_id')
  if (!serverId) return NextResponse.json({ active: false })

  const { data } = await db
    .from('user_server_sessions')
    .select('id')
    .eq('user_id',   session.member_id)
    .eq('server_id', serverId)
    .eq('status',    SESSION_STATUS.ACTIVE)
    .gt('expires_at', new Date().toISOString())
    .single()

  return NextResponse.json({ active: !!data })
}
