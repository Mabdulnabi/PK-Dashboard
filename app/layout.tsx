import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProKeys Dashboard',
  description: 'Subscription Manager',
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
