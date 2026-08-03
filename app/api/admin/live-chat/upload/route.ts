import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const BUCKET = 'chat-attachments'
const MAX_MB = 10

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })
  if (file.size > MAX_MB * 1024 * 1024)
    return NextResponse.json({ error: `Max ${MAX_MB}MB` }, { status: 400 })

  const ext  = file.name.split('.').pop() || 'bin'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buf  = await file.arrayBuffer()

  const { error } = await db.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path)

  const isImage = file.type.startsWith('image/')
  return NextResponse.json({
    url: publicUrl,
    name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    kind: isImage ? 'image' : 'file',
  })
}
