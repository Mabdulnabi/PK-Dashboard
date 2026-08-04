import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/members/notify-renewal
// body: { member_id }
export async function POST(req: NextRequest) {
  const { member_id } = await req.json()
  if (!member_id) return NextResponse.json({ error: 'missing member_id' }, { status: 400 })

  // Get soonest upcoming subscription
  const { data: purchases } = await service
    .from('tool_purchases')
    .select('id, expires_at, shop_tools(name)')
    .eq('member_id', member_id)
    .eq('status', 'confirmed')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(1)

  const soonest = purchases?.[0]
  if (!soonest) return NextResponse.json({ error: 'no upcoming subscription found' }, { status: 404 })

  const toolName = (soonest.shop_tools as any)?.name || 'اشتراكك'
  const expiryDate = format(new Date(soonest.expires_at), 'dd MMM yyyy')
  const daysLeft = Math.ceil((new Date(soonest.expires_at).getTime() - Date.now()) / 86400000)

  const { error } = await service.from('member_notifications').insert({
    member_id,
    title:      `تذكير: ${toolName} ينتهي قريباً ⏰`,
    title_en:   `Reminder: ${toolName} expires soon ⏰`,
    message:    `اشتراكك في ${toolName} سينتهي بتاريخ ${expiryDate} (بعد ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}). جدد الآن لتجنب انقطاع الخدمة.`,
    message_en: `Your ${toolName} subscription expires on ${expiryDate} (in ${daysLeft} day${daysLeft === 1 ? '' : 's'}). Renew now to avoid interruption.`,
    type: daysLeft <= 3 ? 'urgent' : 'warning',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, tool: toolName, expires_at: soonest.expires_at })
}
