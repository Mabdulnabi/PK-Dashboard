import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const [expRes, expdRes, logRes] = await Promise.all([
    db.from('members_full')
      .select('id,full_name,email,plan_slug,expires_at,computed_status,phone,telegram')
      .eq('computed_status', 'expiring')
      .order('expires_at'),
    db.from('members_full')
      .select('id,full_name,email,plan_slug,expires_at,computed_status,phone,telegram')
      .eq('computed_status', 'expired')
      .order('expires_at', { ascending: false })
      .limit(50),
    db.from('member_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    expiring: expRes.data || [],
    expired:  expdRes.data || [],
    logs:     logRes.data || [],
  })
}

export async function POST(req: NextRequest) {
  const { member_ids, title, message, type } = await req.json()
  if (!title || !message || !member_ids?.length)
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })

  const rows = member_ids.map((id: string) => ({ member_id: id, title, message, type: type || 'warning' }))
  const { error } = await db.from('member_notifications').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: rows.length })
}
