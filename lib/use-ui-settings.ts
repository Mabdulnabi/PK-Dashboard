// lib/use-ui-settings.ts
import { useState, useEffect } from 'react'

interface UISettings {
  logo_url: string
  logo_width: string
  logo_height: string
  logo_light_url: string
  logo_dark_url: string
  member_login_logo_url: string
  admin_logo_dark_url: string
  admin_logo_light_url: string
  admin_login_logo_url: string
  admin_logo_width: string
  admin_logo_height: string
  [key: string]: string
}

const DEFAULTS: UISettings = {
  logo_url: '', logo_width: '40', logo_height: '40',
  logo_light_url: '', logo_dark_url: '', member_login_logo_url: '',
  admin_logo_dark_url: '', admin_logo_light_url: '', admin_login_logo_url: '',
  admin_logo_width: '36', admin_logo_height: '36',
  live_chat_fab_icon: '',
}
const cache: { data: UISettings | null; time: number } = { data: null, time: 0 }

export function useUISettings(): UISettings {
  const [settings, setSettings] = useState<UISettings>(cache.data || DEFAULTS)

  useEffect(() => {
    if (cache.data && Date.now() - cache.time < 10 * 1000) {
      setSettings(cache.data)
      return
    }
    fetch('/api/ui-settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const s = { ...DEFAULTS, ...(d.settings || {}) }
        cache.data = s
        cache.time = Date.now()
        setSettings(s)
      })
      .catch(() => {})
  }, [])

  return settings
}
