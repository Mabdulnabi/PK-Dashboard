import { NextRequest, NextResponse } from 'next/server'

const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace('https://', '')
  .split('.')[0]

export function middleware(req: NextRequest) {
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
    // Next.js RequestCookies already URL-decodes values, so join directly
    const raw = chunks.join('')
    const session = JSON.parse(raw)
    const accessToken: string = session?.access_token
    if (!accessToken) throw new Error('no token')

    const payloadB64 = accessToken.split('.')[1]
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'))
    const userId: string = payload?.sub
    if (!userId) throw new Error('no sub')

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
