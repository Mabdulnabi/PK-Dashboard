import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'missing_email' }, { status: 400 })

    const { data: member } = await service
      .from('members')
      .select('id, full_name, whatsapp')
      .eq('email', email.toLowerCase().trim())
      .single()

    // Always return success to prevent email enumeration
    if (!member) return NextResponse.json({ ok: true })

    // Delete any previous unused tokens for this member
    await service.from('member_password_resets').delete().eq('member_id', member.id).eq('used', false)

    // Create reset token (expires in 1 hour)
    const { data: reset } = await service
      .from('member_password_resets')
      .insert({ member_id: member.id })
      .select('token')
      .single()

    if (!reset?.token) return NextResponse.json({ ok: true })

    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/u/reset-password?token=${reset.token}`

    // Notify admin to send the reset link to the member
    void service.from('admin_notifications').insert({
      title:   `طلب استعادة كلمة مرور 🔑`,
      message: `العضو ${member.full_name} (${email}) طلب إعادة تعيين كلمة المرور.\nأرسل الرابط التالي:\n${resetUrl}`,
      type:    'info',
      link:    '/members',
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
