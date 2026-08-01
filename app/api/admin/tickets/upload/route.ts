import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const ticketId = form.get('ticket_id') as string | null

  if (!file || !ticketId) return NextResponse.json({ error: 'missing file or ticket_id' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const path = `${ticketId}/admin_${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: uploadErr } = await service.storage.from('ticket-attachments').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { error: dbErr } = await service.from('ticket_attachments').insert({
    ticket_id:   ticketId,
    uploaded_by: 'admin',
    file_path:   path,
    file_name:   file.name,
    file_size:   file.size,
    file_type:   file.type,
  })
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ success: true, path })
}
