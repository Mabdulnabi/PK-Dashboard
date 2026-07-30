// app/api/member/settings/route.ts
// Returns site settings for user dashboard
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await service
    .from('site_settings')
    .select('key, value')

  const settings: Record<string, string> = {}
  ;(data || []).forEach((r: any) => { settings[r.key] = r.value })

  return NextResponse.json({ settings })
}
