import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await service
    .from('private_accounts_stock')
    .delete()
    .eq('id', params.id)
    .eq('status', 'available') // لا تحذف حساب مخصص

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
