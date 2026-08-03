import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { db } from './db'
import { MEMBER_COOKIE } from './constants'
import { unauthorized } from './responses'

export interface MemberSession {
  valid:       boolean
  member_id:   string
  plan_slug:   string | null
  email?:      string
}

export class AuthError extends Error {
  readonly response: ReturnType<typeof unauthorized>
  constructor(msg = 'unauthorized') {
    super(msg)
    this.response = unauthorized(msg)
  }
}

export interface AdminSession {
  id:    string
  email: string | undefined
}

export async function requireAdmin(): Promise<AdminSession> {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new AuthError()
  return { id: session.user.id, email: session.user.email }
}

export async function requireMember(): Promise<MemberSession> {
  const token = cookies().get(MEMBER_COOKIE)?.value
  if (!token) throw new AuthError()
  const { data: session } = await db.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) throw new AuthError()
  return session as MemberSession
}
