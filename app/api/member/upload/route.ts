export const maxDuration = 30
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const form = await req.formData()
  const file = form.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext  = file.name.split('.').pop()
  const path = `blogs/${session.member_id}/${Date.now()}.${ext}`
  const buf  = Buffer.from(await file.arrayBuffer())

  const { data: buckets } = await service.storage.listBuckets()
  if (!buckets?.find(b => b.name === 'site-assets'))
    await service.storage.createBucket('site-assets', { public: true })

  const { error } = await service.storage.from('site-assets').upload(path, buf, { upsert: true, contentType: file.type })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('site-assets').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
