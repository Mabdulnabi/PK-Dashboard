import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { InvoicePDF } from '@/lib/pdf/invoice-template'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const token = cookieStore.get('pk_member_token')?.value
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: session } = await service.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: payment } = await service
    .from('payments')
    .select('id, amount, currency, gateway, status, transaction_id, pack_id, bundle_id, payment_code, created_at')
    .eq('id', params.id)
    .eq('user_id', session.member_id)
    .single()

  if (!payment) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (payment.status !== 'completed') return NextResponse.json({ error: 'payment not completed' }, { status: 400 })

  const { data: member } = await service
    .from('members')
    .select('full_name, email, phone')
    .eq('id', session.member_id)
    .single()

  let tool_name: string | null   = null
  let bundle_name: string | null = null

  if (payment.pack_id) {
    const { data: tool } = await service.from('shop_tools').select('name').eq('id', payment.pack_id).single()
    tool_name = tool?.name || null
  }
  if (payment.bundle_id) {
    const { data: bundle } = await service.from('membership_plans').select('name').eq('id', payment.bundle_id).single()
    bundle_name = bundle?.name || null
  }

  const { data: settingsRows } = await service.from('ui_settings').select('key, value')
  const settings: Record<string, string> = {}
  ;(settingsRows || []).forEach((r: any) => { settings[r.key] = r.value })

  const logoUrl  = settings.invoice_logo || null
  const siteName = settings.site_name || 'Pro Keys'

  const element = React.createElement(InvoicePDF, {
    payment:  { ...payment, tool_name, bundle_name, payment_code: payment.payment_code || null },
    member:   member || { full_name: 'Customer', email: '' },
    logoUrl,
    siteName,
  }) as any

  const pdfBuffer = await renderToBuffer(element)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${payment.payment_code || payment.id.slice(0, 8)}.pdf"`,
    },
  })
}
