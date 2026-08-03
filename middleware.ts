import { NextRequest, NextResponse } from 'next/server'

// Project ref extracted from NEXT_PUBLIC_SUPABASE_URL
// e.g. https://mluqxggjbumtmyfldaon.supabase.co → mluqxggjbumtmyfldaon
const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace('https://', '')
  .split('.')[0]

export function middleware(req: NextRequest) {
  // Check for Supabase auth cookie (may be chunked: .0, .1, ...)
  const cookieName = `sb-${PROJECT_REF}-auth-token`
  const all = req.cookies.getAll()

  const hasSession = all.some(
    c => (c.name === cookieName || c.name.startsWith(`${cookieName}.`)) && c.value
  )

  if (!hasSession) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
