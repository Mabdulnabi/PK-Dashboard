import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Returns all shop products (id + name) for admin dropdowns
export async function GET() {
  const { data, error } = await service
    .from('shop_tools')
    .select('id, name, image_url, category_slug')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data || [] })
}
