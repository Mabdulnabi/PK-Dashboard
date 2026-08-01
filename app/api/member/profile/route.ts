import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSession() {
  const token = cookies().get('pk_member_token')?.value
  if (!token) return null
  const { data } = await service.rpc('verify_member_session', { p_token: token })
  return data?.valid ? data : null
}

export async function GET() {
  const sess = await getSession()
  if (!sess) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await service
    .from('members')
    .select('id, full_name, email, phone, whatsapp, avatar_url, member_code, plan_slug, expires_at')
    .eq('id', sess.member_id)
    .single()

  return NextResponse.json(data ?? {})
}

export async function PATCH(req: NextRequest) {
  const sess = await getSession()
  if (!sess) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, any> = {}

  if (body.full_name?.trim())        updates.full_name    = body.full_name.trim()
  if (body.email?.trim())            updates.email        = body.email.trim().toLowerCase()
  if (body.password?.trim())         updates.password_hash = body.password.trim()
  if (body.whatsapp !== undefined)   updates.whatsapp     = body.whatsapp?.trim() || null
  if (body.avatar_url !== undefined) updates.avatar_url   = body.avatar_url || null

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const { error } = await service.from('members').update(updates).eq('id', sess.member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
