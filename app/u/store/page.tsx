'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useLang } from '@/lib/lang-context'
import ShopPage from '@/app/u/shop/ShopPage'
import PrivateStorePage from '@/app/u/shop/private-store/page'

const TABS = [
  { key: 'shared',  en: 'Shared',  ar: 'مشتركة', emoji: '🌐' },
  { key: 'bundle',  en: 'Bundle',  ar: 'حزم',    emoji: '📦' },
  { key: 'private', en: 'Private', ar: 'خاصة',   emoji: '🔒' },
] as const

type Tab = typeof TABS[number]['key']

function StoreInner() {
  const { lang, dir } = useLang()
  const router = useRouter()
  const params = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'shared'

  const setTab = (t: Tab) => router.push(`/u/store?tab=${t}`)

  return (
    <div dir={dir}>
      {/* Tab pills */}
      <div className="flex items-center gap-2 m-3 md:m-6 mb-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1.5">
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-all ${
                active
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              style={active ? {
                background: t.key === 'shared' ? '#3b82f6' : t.key === 'bundle' ? '#f59e0b' : '#8b5cf6'
              } : {}}>
              <span>{t.emoji}</span>
              <span>{lang === 'ar' ? t.ar : t.en}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="mt-4">
        {tab === 'private' ? (
          <PrivateStorePage />
        ) : (
          <ShopPage category={tab} />
        )}
      </div>
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
