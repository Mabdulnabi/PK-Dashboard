'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { Globe, Package, Lock } from 'lucide-react'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'
import ShopPage from '@/app/u/shop/ShopPage'

const TABS = [
  { key: 'shared',  en: 'Shared',  ar: 'مشتركة', color: '#3b82f6', Icon: Globe   },
  { key: 'bundle',  en: 'Bundle',  ar: 'حزم',    color: '#f59e0b', Icon: Package },
  { key: 'private', en: 'Private', ar: 'خاصة',   color: '#8b5cf6', Icon: Lock    },
] as const

type Tab = typeof TABS[number]['key']

function StoreInner() {
  const { lang, dir } = useLang()
  const router  = useRouter()
  const params  = useSearchParams()
  const tab     = (params.get('tab') as Tab) || 'shared'
  const catId   = params.get('cat') || undefined
  const isRtl   = lang === 'ar'

  const [banners, setBanners] = useState<BannerSlide[] | null>(null)

  // Fetch ONCE — unified store banner, not per-tab
  useEffect(() => {
    fetch('/api/admin/ui-settings').then(r => r.json()).then(d => {
      const ui = d.settings as Record<string, string>
      let slides: BannerSlide[] = []
      // Try unified store key first, fall back to shared tab banner
      try {
        const arr = JSON.parse(ui?.store_banners || ui?.shared_store_banners || '[]')
        if (arr.length) slides = arr.map((s: any) => typeof s === 'string' ? { url: s } : s)
      } catch {}
      if (!slides.length) {
        const url = ui?.store_banner_url || ui?.shared_store_banner_url
        if (url) slides = [{ url }]
      }
      setBanners(slides)
    }).catch(() => setBanners([]))
  }, []) // no tab dependency — banner is fixed

  const setTab = (t: Tab) => router.push(`/u/store?tab=${t}`)

  return (
    <div dir={dir}>
      {/* Unified banner — fixed, does not change with tab */}
      <div className="mx-3 md:mx-6 mt-3 md:mt-6 rounded-2xl overflow-hidden mb-0">
        {banners === null ? (
          <div className="h-24 rounded-2xl animate-pulse bg-gray-100 dark:bg-gray-800"/>
        ) : banners.length > 0 ? (
          <BannerSlider slides={banners} isRtl={isRtl} maxHeight={220}/>
        ) : (
          /* Default static store banner */
          <div className="rounded-2xl p-5 md:p-7 relative overflow-hidden"
            style={{background:'linear-gradient(135deg,#1a3a5c 0%,#1e4f8a 50%,#1e3a8a 100%)'}}>
            <div className="absolute inset-0 pointer-events-none"
              style={{backgroundImage:'radial-gradient(ellipse at 20% 50%,#d9940130,transparent 55%),radial-gradient(ellipse at 80% 50%,#3b82f620,transparent 60%)'}}/>
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 border border-[#d9940140] bg-[#d9940115]">
                <Globe size={12} style={{color:'#d99401'}}/>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{color:'#d99401'}}>Pro Keys Store</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-white mb-1">
                {isRtl ? 'أدوات احترافية بأسعار مناسبة' : 'Professional Tools at Great Prices'}
              </h1>
              <p className="text-sm text-blue-200">
                {isRtl ? 'اشتراكات مشتركة — حزم — حسابات خاصة' : 'Shared subscriptions · Bundles · Private accounts'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-2 mx-3 md:mx-6 mt-3 mb-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1.5">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                active ? 'text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              style={active ? { background: t.color } : {}}>
              <t.Icon size={14}/>
              <span>{isRtl ? t.ar : t.en}</span>
            </button>
          )
        })}
      </div>

      {/* Content — ShopPage for all tabs, banner suppressed, compact spacing */}
      <ShopPage category={tab} hideBanner compact defaultCatId={catId}/>
    </div>
  )
}

export default function StorePage() {
  return (
    <Suspense>
      <StoreInner/>
    </Suspense>
  )
}
