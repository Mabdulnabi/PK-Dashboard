export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const mine   = searchParams.get('mine') === '1'

  let session: Awaited<ReturnType<typeof requireMember>> | null = null
  try { session = await requireMember() } catch {}

  let q = db.from('blog_posts')
    .select('id, title, title_ar, cover_image_url, created_at, published_at, status, member_id, members(name, avatar_url)')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (mine && session) {
    q = q.eq('member_id', session.member_id)
  } else {
    q = q.eq('status', 'approved')
  }

  if (search) q = (q as any).ilike('title', `%${search}%`)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const body = await req.json()
  const { title, title_ar, content, content_ar, cover_image_url } = body
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await db.from('blog_posts').insert({
    member_id: session.member_id,
    title: title.trim(),
    title_ar: title_ar?.trim() || null,
    content: content || '',
    content_ar: content_ar || null,
    cover_image_url: cover_image_url || null,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
