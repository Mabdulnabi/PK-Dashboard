import type { Metadata } from 'next'
import Script from 'next/script'
import { createClient } from '@supabase/supabase-js'
import './globals.css'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl: string | undefined
  try {
    const { data } = await service
      .from('ui_settings')
      .select('value')
      .eq('key', 'favicon_url')
      .single()
    faviconUrl = data?.value || undefined
  } catch {}

  return {
    title: 'ProKeys Dashboard',
    description: 'Subscription Manager',
    icons: faviconUrl ? { icon: faviconUrl, shortcut: faviconUrl } : undefined,
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Script
          src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  )
}
