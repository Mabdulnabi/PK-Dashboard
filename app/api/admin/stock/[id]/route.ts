import { NextRequest, NextResponse } from 'next/server'
import { db as service } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { delivery_type, email, password, key, notes } = await req.json()

  const update: Record<string, unknown> = { notes: notes?.trim() || null }

  if (delivery_type === 'account') {
    update.delivery_type = 'account'
    if (email?.trim())    update.email        = email.trim()
    if (password?.trim()) update.password_enc = password.trim()
    update.key_enc = null
  } else if (delivery_type === 'key') {
    update.delivery_type = 'key'
    if (key?.trim()) update.key_enc = key.trim()
    update.email        = null
    update.password_enc = null
  }

  const { error } = await service
    .from('private_accounts_stock')
    .update(update)
    .eq('id', params.id)
    .eq('status', 'available')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await service
    .from('private_accounts_stock')
    .delete()
    .eq('id', params.id)
    .eq('status', 'available')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
