import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await db
    .from('shop_tools')
    .select('id, name, image_url, details_slug, landing_data')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tool: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { landing_data } = await req.json()
  const { error } = await db
    .from('shop_tools')
    .update({ landing_data })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
