import { cookies } from 'next/headers'
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

export async function requireMember(): Promise<MemberSession> {
  const token = cookies().get(MEMBER_COOKIE)?.value
  if (!token) throw new AuthError()
  const { data: session } = await db.rpc('verify_member_session', { p_token: token })
  if (!session?.valid) throw new AuthError()
  return session as MemberSession
}
