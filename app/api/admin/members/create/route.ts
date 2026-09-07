import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hash } from 'bcryptjs'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password, whatsapp, plan_slug, expires_at } = await req.json()
    if (!full_name || !email || !password)
      return NextResponse.json({ error: 'full_name, email, and password are required' }, { status: 400 })

    const normalEmail = email.toLowerCase().trim()

    const { data: existing } = await service
      .from('members')
      .select('id')
      .eq('email', normalEmail)
      .single()

    if (existing)
      return NextResponse.json({ error: 'email_taken' }, { status: 409 })

    const hashedPassword = await hash(password, 10)

    const defaultExpiry = expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const { data: member, error } = await service
      .from('members')
      .insert({
        full_name:     full_name.trim(),
        email:         normalEmail,
        password_hash: hashedPassword,
        whatsapp:      whatsapp?.trim() || null,
        plan_slug:     plan_slug || 'free',
        status:        'active',
        expires_at:    defaultExpiry,
      })
      .select('id, full_name, email')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, member })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
