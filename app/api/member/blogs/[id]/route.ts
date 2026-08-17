export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db.from('blog_posts')
    .select('*, members(full_name, avatar_url)')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { data: existing } = await db.from('blog_posts').select('member_id, status').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.member_id !== session.member_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['draft', 'rejected', 'revision_needed'].includes(existing.status)) return NextResponse.json({ error: 'Cannot edit published post' }, { status: 400 })

  const body = await req.json()
  const { title, title_ar, content, content_ar, cover_image_url } = body

  const { data, error } = await db.from('blog_posts').update({
    title: title?.trim(),
    title_ar: title_ar?.trim() || null,
    content: content || '',
    content_ar: content_ar || null,
    cover_image_url: cover_image_url || null,
    status: 'pending',
    rejection_reason: null,
    updated_at: new Date().toISOString(),
  }).eq('id', params.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const { data: existing } = await db.from('blog_posts').select('member_id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.member_id !== session.member_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.from('blog_posts').delete().eq('id', params.id)
  return NextResponse.json({ ok: true })
}
