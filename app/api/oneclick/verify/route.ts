import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const body = await req.json()
  const { token, product_id } = body
  if (!token || !product_id)
    return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ua = req.headers.get('user-agent') || ''

  const { data, error } = await supabase.rpc('verify_oneclick_token', {
    p_token:      token,
    p_product_id: product_id,
    p_ip:         ip,
    p_ua:         ua,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data.success) return NextResponse.json({ error: data.error }, { status: 403 })

  return NextResponse.json({ success: true, redirect_url: data.tool_url })
}
