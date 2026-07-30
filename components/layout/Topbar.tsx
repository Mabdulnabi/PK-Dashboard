'use client'
import { Search, Bell, Settings, Sun, Moon, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Topbar({ title, subtitle, onAdd, addLabel = 'New Subscription' }: {
  title: string; subtitle?: string; onAdd?: () => void; addLabel?: string
}) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') { document.documentElement.classList.add('dark'); setDark(true) }
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <header className="h-14 flex items-center justify-between px-5 flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-theme">
      <div>
        <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{title}</h1>
        {subtitle && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Search size={14} />
        </button>
        <button className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        <button onClick={toggle} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          {dark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        {onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-sm shadow-red-500/30">
            <Plus size={13} />{addLabel}
          </button>
        )}
      </div>
    </header>
  )
}
