'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import BannerSlider, { BannerSlide } from '@/components/ui/BannerSlider'
import ShopPage from '@/app/u/shop/ShopPage'

const TABS = [
  { key: 'shared',  en: 'Shared',  ar: 'مشتركة', emoji: '🌐' },
  { key: 'bundle',  en: 'Bundle',  ar: 'حزم',    emoji: '📦' },
  { key: 'private', en: 'Private', ar: 'خاصة',   emoji: '🔒' },
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

  return (
    <div dir={dir}>
      {/* Banner — with margin, rounded, always above tabs */}
      {banners !== null && banners.length > 0 && (
        <div className="mx-3 md:mx-6 mt-3 md:mt-6 rounded-2xl overflow-hidden mb-0">
          <BannerSlider slides={banners} isRtl={isRtl} maxHeight={220}/>
        </div>
      )}

      {/* Tab pills */}
      <div className="flex items-center gap-2 m-3 md:m-6 mb-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1.5">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                active ? 'text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              style={active ? {
                background: t.key === 'shared' ? '#3b82f6' : t.key === 'bundle' ? '#f59e0b' : '#8b5cf6'
              } : {}}>
              <span>{t.emoji}</span>
              <span>{isRtl ? t.ar : t.en}</span>
            </button>
          )
        })}
      </div>

      {/* Content — ShopPage for all tabs, banner suppressed inside */}
      <ShopPage category={tab} hideBanner defaultCatId={catId}/>
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
