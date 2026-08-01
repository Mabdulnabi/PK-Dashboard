import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const [bundlesRes, toolsRes] = await Promise.all([
    supabase.from('membership_plans').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('shop_tools').select('id,name,image_url,description,category_slug').eq('is_active', true),
  ])

  const tools = toolsRes.data || []
  const bundles = (bundlesRes.data || []).map((b: any) => ({
    ...b,
    included_tools: (b.tool_ids || [])
      .map((id: string) => tools.find((t: any) => t.id === id))
      .filter(Boolean),
  }))

  return NextResponse.json({ bundles })
}
