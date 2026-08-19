// General-purpose admin image upload → site-assets/uploads/
export const maxDuration = 30
export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/svg+xml']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file   = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'general'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, GIF, or WebP.' }, { status: 400 })
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 8 MB)' }, { status: 400 })

    const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `uploads/${folder}/${Date.now()}-${Math.random().toString(36).slice(2,6)}.${ext}`
    const buf  = Buffer.from(await file.arrayBuffer())

    const { data: buckets } = await service.storage.listBuckets()
    if (!buckets?.find(b => b.name === 'site-assets')) {
      await service.storage.createBucket('site-assets', { public: true })
    }

    const { error } = await service.storage
      .from('site-assets')
      .upload(path, buf, { upsert: true, contentType: file.type })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: urlData } = service.storage.from('site-assets').getPublicUrl(path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
