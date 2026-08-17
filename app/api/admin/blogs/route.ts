export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

export async function GET() {
  try { await requireAdmin() } catch { return unauthorized() }

  const { data, error } = await db.from('blog_posts')
    .select('*, members(name, avatar_url)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
