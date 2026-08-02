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
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data } = await service
    .from('focus_notes')
    .select('id, title, content, created_at, updated_at')
    .eq('member_id', session.member_id)
    .order('updated_at', { ascending: false })
  return NextResponse.json({ notes: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { title, content } = await req.json()
  const { data, error } = await service
    .from('focus_notes')
    .insert({ member_id: session.member_id, title: title || 'Untitled Note', content: content || '' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id, title, content } = await req.json()
  const { error } = await service
    .from('focus_notes')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('member_id', session.member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  await service.from('focus_notes').delete().eq('id', id).eq('member_id', session.member_id)
  return NextResponse.json({ success: true })
}
