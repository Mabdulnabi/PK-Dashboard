import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const { data, error } = await db.from('quick_replies').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ replies: data })
}

export async function POST(req: NextRequest) {
  const { id, title, content, deleted } = await req.json()

  if (id && deleted) {
    await db.from('quick_replies').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }
  if (id) {
    await db.from('quick_replies').update({ title, content, updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await db.from('quick_replies')
    .insert({ title, content }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reply: data })
}
