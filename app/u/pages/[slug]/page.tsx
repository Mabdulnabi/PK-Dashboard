'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { ChevronLeft, FileText } from 'lucide-react'

const PAGE_TITLES: Record<string, { en: string; ar: string }> = {
  'about-us':        { en: 'About Us',          ar: 'من نحن' },
  'contact-us':      { en: 'Contact Us',         ar: 'اتصل بنا' },
  'privacy-policy':  { en: 'Privacy Policy',     ar: 'سياسة الخصوصية' },
  'refund-policy':   { en: 'Refund Policy',      ar: 'سياسة الاسترداد' },
  'delivery-policy': { en: 'Delivery Policy',    ar: 'سياسة التسليم' },
  'terms-of-use':    { en: 'Terms of Use',       ar: 'شروط الاستخدام' },
}

export default function StaticPageView({ params }: { params: { slug: string } }) {
  const { lang } = useLang()
  const ar = lang === 'ar'
  const router = useRouter()
  const [html, setHtml]       = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const pageKey = `page_${params.slug}_${ar ? 'ar' : 'en'}`
  const fallbackKey = `page_${params.slug}_${ar ? 'en' : 'ar'}`
  const titles = PAGE_TITLES[params.slug]

  useEffect(() => {
    fetch('/api/admin/ui-settings')
      .then(r => r.json())
      .then((d: { settings?: Record<string,string> } | Record<string,string>) => {
        const ui = (d as any).settings || d as Record<string,string>
        setHtml(ui[pageKey] || ui[fallbackKey] || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [pageKey, fallbackKey])

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto" dir={ar ? 'rtl' : 'ltr'}>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600 mb-5">
        <ChevronLeft size={16} className={ar ? 'rotate-180' : ''}/>
        {ar ? 'رجوع' : 'Back'}
      </button>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-5">
        {titles ? (ar ? titles.ar : titles.en) : params.slug}
      </h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"/>)}
        </div>
      ) : html ? (
        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}/>
      ) : (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3"/>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{ar ? 'هذه الصفحة فارغة حتى الآن.' : 'This page has no content yet.'}</p>
        </div>
      )}
    </div>
  )
}
