'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'
import ShopPage from '@/app/u/shop/ShopPage'

const TABS = [
  { key: 'shared',  en: 'Shared',  ar: 'مشتركة', emoji: '🌐', color: '#3b82f6',
    titleEn: 'Access Premium Shared Tools', titleAr: 'الوصول إلى الأدوات المشتركة',
    subEn: 'Browse and activate shared premium tools instantly.', subAr: 'تصفح وفعّل الأدوات المميزة المشتركة فوراً.' },
  { key: 'bundle',  en: 'Bundle',  ar: 'حزم',    emoji: '📦', color: '#f59e0b',
    titleEn: 'Best Value Tool Bundles', titleAr: 'أفضل قيمة في حزم الأدوات',
    subEn: 'Curated bundles of top tools at unbeatable prices.', subAr: 'حزم مجمّعة من أفضل الأدوات بأسعار لا تُقارن.' },
  { key: 'private', en: 'Private', ar: 'خاصة',   emoji: '🔒', color: '#8b5cf6',
    titleEn: 'Exclusive Private Accounts', titleAr: 'حسابات خاصة حصرية',
    subEn: 'Private accounts and licenses just for you.', subAr: 'حسابات وتراخيص خاصة حصرية لك.' },
] as const

type Tab = typeof TABS[number]['key']

const BANNER_KEYS: Record<Tab, { arr: string; single: string }> = {
  shared:  { arr: 'shared_store_banners',  single: 'shared_store_banner_url'  },
  bundle:  { arr: 'bundle_store_banners',  single: 'bundle_store_banner_url'  },
  private: { arr: 'private_store_banners', single: 'private_store_banner_url' },
}

function StoreInner() {
  const { lang, dir } = useLang()
  const router  = useRouter()
  const params  = useSearchParams()
  const tab     = (params.get('tab') as Tab) || 'shared'
  const catId   = params.get('cat') || undefined
  const isRtl   = lang === 'ar'

  const [banners, setBanners] = useState<BannerSlide[] | null>(null)

  useEffect(() => {
    setBanners(null)
    fetch('/api/admin/ui-settings').then(r => r.json()).then(d => {
      const ui  = d.settings as Record<string, string>
      const bk  = BANNER_KEYS[tab]
      let slides: BannerSlide[] = []
      try {
        const arr = JSON.parse(ui?.[bk.arr] || '[]')
        if (arr.length) slides = arr.map((s: any) => typeof s === 'string' ? { url: s } : s)
      } catch {}
      if (!slides.length && ui?.[bk.single]) slides = [{ url: ui[bk.single] }]
      setBanners(slides)
    }).catch(() => setBanners([]))
  }, [tab])

  const setTab = (t: Tab) => router.push(`/u/store?tab=${t}`)

  const activeMeta = TABS.find(t => t.key === tab)!

  return (
    <div dir={dir}>
      {/* Banner — always shown above tabs */}
      <div className="mx-3 md:mx-6 mt-3 md:mt-6 rounded-2xl overflow-hidden mb-0">
        {banners === null ? (
          <div className="h-24 rounded-2xl animate-pulse bg-gray-100 dark:bg-gray-800"/>
        ) : banners.length > 0 ? (
          <BannerSlider slides={banners} isRtl={isRtl} maxHeight={220}/>
        ) : (
          <div className="rounded-2xl p-5 md:p-7 relative overflow-hidden"
            style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
            <div className="absolute inset-0 pointer-events-none"
              style={{backgroundImage:`radial-gradient(ellipse at 20% 50%,${activeMeta.color}30,transparent 55%)`}}/>
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
                  style={{border:`1px solid ${activeMeta.color}50`,background:`${activeMeta.color}18`}}>
                  <span className="text-sm">{activeMeta.emoji}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{color:activeMeta.color}}>
                    {isRtl ? activeMeta.ar : activeMeta.en}
                  </span>
                </div>
                <h1 className="text-lg md:text-xl font-bold text-white mb-1">
                  {isRtl ? activeMeta.titleAr : activeMeta.titleEn}
                </h1>
                <p className="text-sm text-gray-300">{isRtl ? activeMeta.subAr : activeMeta.subEn}</p>
              </div>
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
              <span>{t.emoji}</span>
              <span>{isRtl ? t.ar : t.en}</span>
            </button>
          )
        })}
      </div>

      {/* Content — ShopPage for all tabs, banner suppressed inside, compact top padding */}
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
