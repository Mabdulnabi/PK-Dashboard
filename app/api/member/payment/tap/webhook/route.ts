import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const chargeId = body?.id
    const status   = body?.status
    const paymentId = body?.metadata?.payment_id

    if (!chargeId || !paymentId) return NextResponse.json({ ok: false })

    if (status === 'CAPTURED') {
      await service.from('payments').update({ status: 'completed' }).eq('id', paymentId)
    } else if (status === 'DECLINED' || status === 'CANCELLED' || status === 'FAILED') {
      await service.from('payments').update({ status: 'failed' }).eq('id', paymentId)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
