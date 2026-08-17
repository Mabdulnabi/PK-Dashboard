'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import ToolLandingPage from '@/app/u/shop/ToolLandingPage'

export default function ToolSlugPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const { lang } = useLang()
  const isRtl = lang === 'ar'
  const [tool, setTool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/member/tool/${params.slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.tool) setTool(d.tool)
        else setNotFound(true)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [params.slug])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#d99401', borderTopColor: 'transparent' }}/>
    </div>
  )

  if (notFound) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-500">
      <p className="text-lg font-bold">{isRtl ? 'المنتج غير موجود' : 'Product not found'}</p>
      <button onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">
        {isRtl ? <ArrowRight size={14}/> : <ArrowLeft size={14}/>}
        {isRtl ? 'رجوع' : 'Go back'}
      </button>
    </div>
  )

  return <ToolLandingPage tool={tool} onBack={() => router.back()}/>
}
