// app/api/landing/route.ts — public read of landing page settings
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { data } = await service.from('ui_settings').select('key, value')
  const raw: Record<string, string> = {}
  ;(data || []).forEach((r: any) => { raw[r.key] = r.value })
  return NextResponse.json({ settings: raw })
}
