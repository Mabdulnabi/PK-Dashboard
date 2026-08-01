'use client'
import { useEffect, useState } from 'react'

const KEY = 'pk_admin_theme'

const EVENT = 'pk-theme-change'

export function useAdminTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(KEY)
    const isDark = saved === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)

    const handler = (e: Event) => setDark((e as CustomEvent<{dark:boolean}>).detail.dark)
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem(KEY, next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { dark: next } }))
  }

  return { dark, toggle }
}
