// lib/lang-context.tsx
'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang     = 'en' | 'ar'
type Currency = 'egp' | 'usd'

interface LangCtx {
  lang:        Lang
  currency:    Currency
  setLang:     (l: Lang) => void
  setCurrency: (c: Currency) => void
  t:           (en: string, ar: string) => string
  dir:         'ltr' | 'rtl'
  formatPrice: (egp: number, usdRate?: number) => string
}

const Ctx = createContext<LangCtx>({
  lang: 'en', currency: 'egp',
  setLang: ()=>{}, setCurrency: ()=>{},
  t: (en) => en, dir: 'ltr',
  formatPrice: (egp) => `${egp} EGP`
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang,     setLangState]     = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pk_lang') || 'en') as Lang
    }
    return 'en'
  })
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pk_currency') || 'egp') as Currency
    }
    return 'egp'
  })

  useEffect(() => {
    applyDir(lang)
    applyFont(lang)
  }, [lang])

  function applyDir(l: Lang) {
    document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }

  function applyFont(l: Lang) {
    if (l === 'ar') {
      // Load Cairo font if not already loaded
      if (!document.getElementById('cairo-font')) {
        const link = document.createElement('link')
        link.id   = 'cairo-font'
        link.rel  = 'stylesheet'
        link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap'
        document.head.appendChild(link)
      }
      document.documentElement.style.fontFamily = "'Cairo', sans-serif"
    } else {
      document.documentElement.style.fontFamily = "'Inter', system-ui, sans-serif"
    }
  }

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('pk_lang', l)
    applyDir(l)
    applyFont(l)
    // Dispatch so pages without context also update
    window.dispatchEvent(new CustomEvent('pk_lang_change', { detail: l }))
  }

  const setCurrency = (c: Currency) => {
    setCurrencyState(c)
    localStorage.setItem('pk_currency', c)
    window.dispatchEvent(new Event('pk_currency_change'))
  }

  const t = (en: string, ar: string) => lang === 'ar' ? ar : en

  // Format price based on lang + currency
  // AR+EGP → "200 جنيه مصري"
  // AR+USD → "4 دولار"
  // EN+EGP → "200 EGP"
  // EN+USD → "$4"
  const formatPrice = (egp: number, usdRate = 50) => {
    const usd = Math.round(egp / usdRate * 100) / 100
    if (lang === 'ar') {
      if (currency === 'egp') return `${egp.toLocaleString('en-US')} جنيه مصري`
      return `${Number(usd.toFixed(0)).toLocaleString('en-US')} دولار`
    }
    if (currency === 'egp') return `${egp.toLocaleString()} EGP`
    return `$${usd.toFixed(0)}`
  }

  return (
    <Ctx.Provider value={{ lang, currency, setLang, setCurrency, t, dir: lang === 'ar' ? 'rtl' : 'ltr', formatPrice }}>
      {children}
    </Ctx.Provider>
  )
}

export const useLang = () => useContext(Ctx)
