'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ToolLandingPage from '@/app/u/shop/ToolLandingPage'
import { LangProvider } from '@/lib/lang-context'
import { CartProvider } from '@/lib/cart-context'

export default function PreviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const [tool, setTool] = useState<any>(null)
  const [previewBlocks, setPreviewBlocks] = useState<any[] | null>(null)

  useEffect(() => {
    fetch(`/api/member/tool/${slug}`)
      .then(r => r.json())
      .then(d => setTool(d.tool || null))
      .catch(() => {})
  }, [slug])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PK_LANDING_PREVIEW') setPreviewBlocks(e.data.blocks)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!tool) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d99401', borderTopColor: 'transparent' }}/>
    </div>
  )

  const displayTool = previewBlocks !== null ? { ...tool, landing_blocks: previewBlocks } : tool

  return (
    <LangProvider>
      <CartProvider>
        <ToolLandingPage tool={displayTool} onBack={() => {}}/>
      </CartProvider>
    </LangProvider>
  )
}
