'use client'
import { useEffect, useState } from 'react'

const KEY = 'pk_admin_theme'

export function useAdminTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(KEY)
    const isDark = saved === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem(KEY, next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return { dark, toggle }
}
