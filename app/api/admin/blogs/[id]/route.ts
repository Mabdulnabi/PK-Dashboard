export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!req.headers.get('x-admin-user-id'))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await service.from('blog_posts').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!req.headers.get('x-admin-user-id'))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, title_ar, content, content_ar, cover_image_url } = body
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await service.from('blog_posts').update({
    title: title.trim(),
    title_ar: title_ar?.trim() || null,
    content: content || '',
    content_ar: content_ar || null,
    cover_image_url: cover_image_url || null,
    updated_at: new Date().toISOString(),
  }).eq('id', params.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!req.headers.get('x-admin-user-id'))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { error } = await service.from('blog_posts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
