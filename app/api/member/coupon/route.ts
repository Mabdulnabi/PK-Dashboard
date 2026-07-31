import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ valid: false }, { status: 401 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const sess = await supabase.rpc('verify_member_session', { p_token: token })
  if (!sess.data?.valid) return NextResponse.json({ valid: false }, { status: 401 })

  const { code, plan_slug, tool_id } = await req.json()
  const { data } = await supabase.rpc('apply_coupon', {
    p_code: code?.toUpperCase(), p_member_id: sess.data.member_id, p_plan_slug: plan_slug || null, p_tool_id: tool_id || null
  })
  return NextResponse.json(data || { valid: false, error: 'invalid_coupon' })
}
