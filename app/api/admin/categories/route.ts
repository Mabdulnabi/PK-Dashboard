import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const { data, error } = await db
    .from('tool_categories')
    .select('*')
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categories: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, name_ar, slug, color, icon, image_url, image_url_ar, sort_order } = body
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })

  const { error } = await db.from('tool_categories').insert({
    name, name_ar: name_ar || null, slug, color: color || '#3B82F6',
    icon: icon || '🔧', image_url: image_url || null, image_url_ar: image_url_ar || null,
    sort_order: sort_order ?? 0, is_active: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await db.from('tool_categories').update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await db.from('tool_categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
