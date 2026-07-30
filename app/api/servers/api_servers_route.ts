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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const tool = req.nextUrl.searchParams.get('tool')

  const { data: subs } = await supabase
    .from('user_subscriptions')
    .select('tool_name, tier')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  const userTiers: Record<string, string> = {}
  subs?.forEach((s: any) => { userTiers[s.tool_name] = s.tier })

  let query = supabase
    .from('servers_available')
    .select('*')
    .order('load_percent', { ascending: true })

  if (tool) query = query.eq('tool_name', tool)

  const { data: servers, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const accessible = servers?.filter((s: any) => {
    const userTier = userTiers[s.tool_name]
    if (!userTier) return false
    if (s.tier_required === 'private') return false
    if (s.tier_required === 'vip' && userTier === 'basic') return false
    return true
  })

  return NextResponse.json({ servers: accessible, user_tiers: userTiers })
}
