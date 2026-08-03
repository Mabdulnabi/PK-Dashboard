import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const { data } = await db
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ notifications: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { id, all } = await req.json()

  if (all) {
    await db.from('admin_notifications').update({ is_read: true }).eq('is_read', false)
  } else if (id) {
    await db.from('admin_notifications').update({ is_read: true }).eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
