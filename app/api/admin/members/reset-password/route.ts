import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/members/reset-password
// body: { member_id, new_password, new_email? }
export async function POST(req: NextRequest) {
  const { member_id, new_password, new_email } = await req.json()
  if (!member_id) return NextResponse.json({ error: 'missing member_id' }, { status: 400 })

  const update: Record<string, any> = {}
  if (new_password) {
    update.password_hash = createHash('sha256').update(new_password).digest('hex')
  }
  if (new_email) {
    update.email = new_email
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  // Also clear all sessions so user must re-login
  if (new_password || new_email) {
    await service.from('member_sessions').delete().eq('member_id', member_id)
  }

  const { error } = await service.from('members').update(update).eq('id', member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
