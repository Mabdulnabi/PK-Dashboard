import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'chat-attachments'
const MAX_MB = 10
const ALLOWED_MIME = [
  'image/jpeg','image/png','image/gif','image/webp',
  'application/pdf','text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip','application/x-rar-compressed',
]

export async function POST(req: NextRequest) {
  const token = cookies().get('pk_member_token')?.value || ''
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: sess } = await service.rpc('verify_member_session', { p_token: token })
  if (!sess?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })
  if (file.size > MAX_MB * 1024 * 1024) return NextResponse.json({ error: `Max ${MAX_MB}MB` }, { status: 400 })
  if (!ALLOWED_MIME.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

  const ext  = file.name.split('.').pop() || 'bin'
  const path = `member/${sess.member_id}/${Date.now()}.${ext}`
  const buf  = await file.arrayBuffer()

  const { error } = await service.storage.from(BUCKET).upload(path, buf, { contentType: file.type })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({
    url: publicUrl,
    name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    kind: file.type.startsWith('image/') ? 'image' : 'file',
  })
}
