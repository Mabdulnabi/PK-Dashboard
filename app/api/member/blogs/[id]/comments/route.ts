export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireMember, AuthError } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db.from('blog_comments')
    .select('*, members(name, avatar_url)')
    .eq('post_id', params.id)
    .eq('approved', true)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let session
  try { session = await requireMember() } catch (e) {
    return e instanceof AuthError ? e.response : unauthorized()
  }

  const body = await req.json()
  const content = body.content?.trim()
  const rating  = parseInt(body.rating) || null
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  if (rating !== null && (rating < 1 || rating > 5)) return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })

  const { data: post } = await db.from('blog_posts').select('status').eq('id', params.id).single()
  if (!post || post.status !== 'approved') return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const { data, error } = await db.from('blog_comments').insert({
    post_id: params.id,
    member_id: session.member_id,
    content,
    rating,
    approved: true,
  }).select('*, members(name, avatar_url)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
