'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ToolLandingPage from '@/app/u/shop/ToolLandingPage'

export default function ToolDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const router   = useRouter()
  const [tool,         setTool]         = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [previewBlocks, setPreviewBlocks] = useState<any[] | null>(null)

  useEffect(() => {
    fetch(`/api/member/tool/${slug}`)
      .then(r => r.json())
      .then(d => { setTool(d.tool || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  // Listen for live preview blocks from admin editor
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PK_LANDING_PREVIEW') {
        setPreviewBlocks(e.data.blocks)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
    </div>
  )

  if (!tool) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
      <p className="text-sm">Tool not found</p>
      <button onClick={() => router.back()} className="text-xs text-[#d99401] hover:underline">← Go back</button>
    </div>
  )

  const displayTool = previewBlocks !== null
    ? { ...tool, landing_blocks: previewBlocks }
    : tool

  return <ToolLandingPage tool={displayTool} onBack={() => router.back()}/>
}
