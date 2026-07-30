// app/api/ui-settings/route.ts
// Public read (login page needs it before auth) + Admin write
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { data } = await service.from('ui_settings').select('key, value')
  const settings: Record<string, string> = {}
  ;(data || []).forEach((r: any) => { settings[r.key] = r.value })
  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const body = await req.json() // { key: value, key2: value2, ... }
  const rows = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }))
  const { error } = await service.from('ui_settings').upsert(rows, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
