export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — list all bundles with their items
export async function GET() {
  const { data: bundles } = await service
    .from('shop_tools')
    .select('id, name, image_url, price_egp, is_active, sort_order')
    .eq('category_slug', 'bundle')
    .order('sort_order')

  const bundleIds = (bundles || []).map((b: any) => b.id)

  const { data: items } = bundleIds.length
    ? await service
        .from('bundle_items')
        .select('bundle_id, tool_id, sort_order, tool:shop_tools!bundle_items_tool_id_fkey(id, name, image_url, category_slug)')
        .in('bundle_id', bundleIds)
        .order('sort_order')
    : { data: [] }

  const itemsByBundle: Record<string, any[]> = {}
  ;(items || []).forEach((i: any) => {
    if (!itemsByBundle[i.bundle_id]) itemsByBundle[i.bundle_id] = []
    if (i.tool) itemsByBundle[i.bundle_id].push(i.tool)
  })

  return NextResponse.json({
    bundles: (bundles || []).map((b: any) => ({
      ...b,
      items: itemsByBundle[b.id] || [],
    }))
  })
}

// POST — create bundle
export async function POST(req: NextRequest) {
  const { name, price_egp, image_url, tool_ids } = await req.json()
  if (!name?.trim() || !tool_ids?.length)
    return NextResponse.json({ error: 'name and tool_ids required' }, { status: 400 })

  const { data: bundle, error } = await service
    .from('shop_tools')
    .insert({
      name:         name.trim(),
      price_egp:    price_egp || 0,
      image_url:    image_url || null,
      category_slug:'bundle',
      duration_days: 30,
      duration_label:'30 Days',
      is_active:    true,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: itemErr } = await service.from('bundle_items').insert(
    tool_ids.map((tid: string, i: number) => ({
      bundle_id: bundle.id, tool_id: tid, sort_order: i,
    }))
  )

  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: bundle.id })
}

// PATCH — update bundle (name/price/active + replace items)
export async function PATCH(req: NextRequest) {
  const { id, name, price_egp, image_url, is_active, tool_ids } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: any = {}
  if (name        !== undefined) updates.name       = name.trim()
  if (price_egp   !== undefined) updates.price_egp  = price_egp
  if (image_url   !== undefined) updates.image_url  = image_url
  if (is_active   !== undefined) updates.is_active  = is_active

  if (Object.keys(updates).length) {
    const { error } = await service.from('shop_tools').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (tool_ids) {
    const { error: delErr } = await service.from('bundle_items').delete().eq('bundle_id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    if (tool_ids.length) {
      const { error: insErr } = await service.from('bundle_items').insert(
        tool_ids.map((tid: string, i: number) => ({
          bundle_id: id, tool_id: tid, sort_order: i,
        }))
      )
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE — delete bundle (items cascade)
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await service.from('shop_tools').delete().eq('id', id).eq('category_slug', 'bundle')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
