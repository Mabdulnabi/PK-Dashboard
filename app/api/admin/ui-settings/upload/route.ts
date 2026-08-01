// app/api/admin/ui-settings/upload/route.ts
// Uploads logo file to Supabase Storage (supports GIF)
export const maxDuration = 30
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const slot = (formData.get('slot') as string) || 'logo'
    const ext  = file.name.split('.').pop()
    const path = `ui-settings/${slot}-${Date.now()}.${ext}`
    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: upErr } = await service.storage
      .from('site-assets')
      .upload(path, buffer, { upsert: true, contentType: file.type })

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: urlData } = service.storage.from('site-assets').getPublicUrl(path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
