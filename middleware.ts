import { NextRequest, NextResponse } from 'next/server'

const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace('https://', '')
  .split('.')[0]

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export async function middleware(req: NextRequest) {
  const cookieName = `sb-${PROJECT_REF}-auth-token`
  const all = req.cookies.getAll()

  // Collect all chunks (cookie may be split into .0 .1 .2 …)
  const chunks = all
    .filter(c => c.name === cookieName || c.name.startsWith(`${cookieName}.`))
    .sort((a, b) => {
      const idx = (n: string) => n === cookieName ? 0 : parseInt(n.split('.').pop()!, 10) + 1
      return idx(a.name) - idx(b.name)
    })
    .map(c => c.value)

  if (chunks.length === 0) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const raw = chunks.join('')
    const session = JSON.parse(raw)
    const accessToken: string = session?.access_token
    if (!accessToken) throw new Error('no token')

    const payloadB64 = accessToken.split('.')[1]
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'))
    const userId: string = payload?.sub
    if (!userId) throw new Error('no sub')

    // Fast-path: check app_metadata.role claim first (set by Supabase Auth admin)
    const isAdminClaim = payload?.app_metadata?.role === 'admin'

    if (!isAdminClaim) {
      // Fallback: verify user exists in admin_profiles table (single PK lookup)
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_profiles?id=eq.${userId}&select=id&limit=1`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          // Keep-alive so subsequent requests reuse the connection
          // @ts-ignore
          keepalive: true,
        }
      )
      const rows = await res.json()
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
    }

    const headers = new Headers(req.headers)
    headers.set('x-admin-user-id', userId)
    return NextResponse.next({ request: { headers } })
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
