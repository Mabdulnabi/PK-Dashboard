import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel Cron calls this daily at 08:00 UTC
// Protected by CRON_SECRET env var
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now       = new Date()
  const in3days   = new Date(now.getTime() + 3 * 86400000)
  const todayStr  = now.toISOString().slice(0, 10)
  const in3Str    = in3days.toISOString().slice(0, 10)

  // --- Expiring in exactly 3 days ---
  const { data: expiring } = await service
    .from('tool_purchases')
    .select('id, member_id, expires_at, shop_tools(name)')
    .eq('status', 'confirmed')
    .gte('expires_at', in3Str + 'T00:00:00Z')
    .lt( 'expires_at', in3Str + 'T23:59:59Z')

  // --- Expired today ---
  const { data: expired } = await service
    .from('tool_purchases')
    .select('id, member_id, expires_at, shop_tools(name)')
    .eq('status', 'confirmed')
    .gte('expires_at', todayStr + 'T00:00:00Z')
    .lt( 'expires_at', todayStr + 'T23:59:59Z')
    .lt( 'expires_at', now.toISOString()) // already passed

  const inserts: any[] = []

  for (const p of expiring || []) {
    const name = (p as any).shop_tools?.name || 'الأداة'
    inserts.push({
      member_id: p.member_id,
      title:     `اشتراكك ينتهي خلال 3 أيام ⚠️`,
      message:   `اشتراكك في ${name} سينتهي بتاريخ ${new Date(p.expires_at!).toLocaleDateString('ar-EG')}. جدد الآن لتجنب انقطاع الخدمة.`,
      type:      'warning',
    })
  }

  for (const p of expired || []) {
    const name = (p as any).shop_tools?.name || 'الأداة'
    inserts.push({
      member_id: p.member_id,
      title:     `انتهى اشتراكك في ${name} ❌`,
      message:   `اشتراكك في ${name} انتهى اليوم. ادخل على المتجر وجدد للاستمرار.`,
      type:      'error',
    })
  }

  if (inserts.length > 0) {
    await service.from('member_notifications').insert(inserts)
  }

  return NextResponse.json({
    ok:       true,
    expiring: (expiring || []).length,
    expired:  (expired  || []).length,
    sent:     inserts.length,
  })
}
