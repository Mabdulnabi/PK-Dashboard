import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Called by user dashboard to tell extension to inject session
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error:'unauthorized' }, { status:401 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const sess = await supabase.rpc('verify_member_session', { p_token: token })
  if (!sess.data?.valid) return NextResponse.json({ error:'unauthorized' }, { status:401 })

  const body = await req.json()
  // Return the inject payload — extension reads this from dashboard via content script
  return NextResponse.json({ success:true, inject_payload: body })
}
