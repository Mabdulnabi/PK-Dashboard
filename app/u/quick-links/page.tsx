'use client'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { FileText, ChevronRight } from 'lucide-react'

const PAGES = [
  { slug: 'about-us',        en: 'About Us',         ar: 'من نحن',          icon: '🏢' },
  { slug: 'contact-us',      en: 'Contact Us',        ar: 'اتصل بنا',        icon: '📞' },
  { slug: 'privacy-policy',  en: 'Privacy Policy',    ar: 'سياسة الخصوصية',  icon: '🔒' },
  { slug: 'refund-policy',   en: 'Refund Policy',     ar: 'سياسة الاسترداد', icon: '↩️' },
  { slug: 'delivery-policy', en: 'Delivery Policy',   ar: 'سياسة التسليم',   icon: '🚚' },
  { slug: 'terms-of-use',    en: 'Terms of Use',      ar: 'شروط الاستخدام',  icon: '📋' },
]

export default function QuickLinksPage() {
  const { lang } = useLang()
  const ar = lang === 'ar'
  const router = useRouter()

  return (
    <div className="p-3 md:p-6 max-w-2xl mx-auto" dir={ar ? 'rtl' : 'ltr'}>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ar ? 'روابط سريعة' : 'Quick Links'}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ar ? 'الصفحات والسياسات المهمة' : 'Important pages and policies'}</p>
      </div>

      <div className="space-y-2">
        {PAGES.map(p => (
          <button key={p.slug} onClick={() => router.push(`/u/pages/${p.slug}`)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm transition-all text-start group">
            <span className="text-xl">{p.icon}</span>
            <span className="flex-1 font-medium text-gray-800 dark:text-gray-200 text-sm">{ar ? p.ar : p.en}</span>
            <ChevronRight size={15} className={`text-gray-300 dark:text-gray-600 group-hover:text-teal-500 transition-colors ${ar ? 'rotate-180' : ''}`}/>
          </button>
        ))}
      </div>
    </div>
  )
}
