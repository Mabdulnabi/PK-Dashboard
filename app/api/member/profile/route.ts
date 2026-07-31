import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sess = await service.rpc('verify_member_session', { p_token: token })
  if (!sess.data?.valid) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { email, password } = await req.json()
  const member_id = sess.data.member_id

  const updates: any = {}
  if (email?.trim()) updates.email = email.trim().toLowerCase()
  if (password?.trim()) updates.password_hash = password.trim()

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await service.from('members').update(updates).eq('id', member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
