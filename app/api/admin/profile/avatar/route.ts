import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file    = form.get('file')    as File   | null
  const adminId = form.get('admin_id') as string | null

  if (!file)    return NextResponse.json({ error: 'no file' },    { status: 400 })
  if (!adminId) return NextResponse.json({ error: 'no admin_id' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${adminId}.${ext}`

  // Auto-create bucket if missing
  const { data: buckets } = await service.storage.listBuckets()
  if (!buckets?.find(b => b.name === 'admin-avatars')) {
    await service.storage.createBucket('admin-avatars', { public: true })
  }

  const bytes = await file.arrayBuffer()
  const { error } = await service.storage
    .from('admin-avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add cache-buster so browser loads the new image immediately
  const { data: { publicUrl } } = service.storage.from('admin-avatars').getPublicUrl(path)
  const urlWithBust = `${publicUrl}?v=${Date.now()}`

  await service.from('admin_profiles').upsert({
    id:         adminId,
    avatar_url: publicUrl,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ url: urlWithBust })
}
