import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { product_id } = await req.json()
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  // Get product + secret key
  const { data: product } = await supabase
    .from('oneclick_products')
    .select('*')
    .eq('product_id', product_id)
    .eq('is_active', true)
    .single()

  if (!product) return NextResponse.json({ error: 'product not found' }, { status: 404 })

  // Generate HMAC-SHA256 token (same as aMember logic)
  const payload   = Math.floor(Date.now() / 1000) + product.token_ttl
  const signature = createHmac('sha256', product.secret_key)
    .update(String(payload))
    .digest('hex')
  const token = `${payload}.${signature}`

  // Store token in DB
  const expires_at = new Date(payload * 1000).toISOString()
  await supabase.from('oneclick_tokens').insert({
    product_id: product.product_id,
    token,
    user_id:    session.user.id,
    expires_at,
  })

  // Build redirect URL
  const url = `${product.tool_url}?pk_payload=${payload}&pk_sig=${signature}&pk_pid=${product_id}`

  return NextResponse.json({ success: true, token, url, expires_at })
}
