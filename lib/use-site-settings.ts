// lib/use-site-settings.ts
import { useState, useEffect } from 'react'

interface SiteSettings {
  whatsapp_number: string
  usd_to_egp_rate: string
  extension_url_1: string
  extension_url_2: string
  extension_pc_guide: string
  extension_mobile_guide: string
  [key: string]: string
}

const cache: { data: SiteSettings | null; time: number } = { data: null, time: 0 }

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(
    cache.data || {
      whatsapp_number: '+201068488474',
      usd_to_egp_rate: '50',
      extension_url_1: '#',
      extension_url_2: '#',
      extension_pc_guide: '#',
      extension_mobile_guide: '#',
    }
  )

  useEffect(() => {
    // Use cache if fresh (5 min)
    if (cache.data && Date.now() - cache.time < 10 * 1000) {
      setSettings(cache.data)
      return
    }
    fetch('/api/member/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const s = d.settings || {}
        cache.data = s
        cache.time = Date.now()
        setSettings(s)
      })
      .catch(() => {})
  }, [])

  return settings
}
