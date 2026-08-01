// GET all reviews for admin (pending first)
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await service
    .from('tool_reviews')
    .select('id,tool_id,member_name,stars,comment,approved,created_at, shop_tools(name)')
    .order('approved', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviews: data || [] })
}
