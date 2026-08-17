export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin() } catch { return unauthorized() }

  const body = await req.json()
  const { action, reason } = body // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action))
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const update: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
    updated_at: new Date().toISOString(),
  }
  if (action === 'approve') update.published_at = new Date().toISOString()
  if (action === 'reject')  update.rejection_reason = reason || 'No reason provided'

  const { data, error } = await db.from('blog_posts').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
