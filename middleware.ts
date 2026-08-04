import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  // getSession reads from the cookie — no network call, always works offline
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const headers = new Headers(req.headers)
  headers.set('x-admin-user-id', session.user.id)

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
