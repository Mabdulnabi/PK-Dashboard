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
  const category = req.nextUrl.searchParams.get('category') || ''
  let q = supabase.from('shop_tools').select('*').eq('is_active', true).order('sort_order')
  if (category) q = q.eq('category_slug', category)
  const [toolsRes, freeRes, settingsRes, vidRes] = await Promise.all([
    q,
    supabase.from('free_tools').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('site_settings').select('*'),
    supabase.from('tutorial_videos').select('*').eq('is_active', true).order('sort_order'),
  ])
  const settings: Record<string,string> = {}
  settingsRes.data?.forEach((s:any) => { settings[s.key] = s.value })
  const res = NextResponse.json({ tools: toolsRes.data||[], free: freeRes.data||[], settings, videos: vidRes.data||[] })
  res.headers.set('Cache-Control', 'no-store')
  return res
}
