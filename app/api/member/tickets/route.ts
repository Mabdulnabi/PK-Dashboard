import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getSession(supabase: any, cookieStore: any) {
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return null
  const { data } = await supabase.rpc('verify_member_session', { p_token: token })
  return data?.valid ? data : null
}

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } })
  const session = await getSession(supabase, cookieStore)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data } = await supabase.from('support_tickets').select('*').eq('member_id', session.member_id).order('created_at', { ascending: false })
  return NextResponse.json({ tickets: data||[] })
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } })
  const session = await getSession(supabase, cookieStore)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { subject, message, priority } = await req.json()
  if (!subject || !message) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  const { error } = await supabase.from('support_tickets').insert({ member_id: session.member_id, subject, message, priority: priority||'normal' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
