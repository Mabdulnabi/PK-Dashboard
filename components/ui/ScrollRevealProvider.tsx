'use client'
import { useEffect } from 'react'
import './scroll-reveal.css'

export function ScrollRevealProvider() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )

    const scan = () => {
      document.querySelectorAll('[data-reveal]:not(.revealed), [data-reveal-stagger]:not(.revealed)').forEach((el) => {
        obs.observe(el)
      })
    }

    scan()

    // Re-scan when new elements are added (tab switches, dynamic content)
    const mutObs = new MutationObserver(scan)
    mutObs.observe(document.body, { childList: true, subtree: true })

    return () => {
      obs.disconnect()
      mutObs.disconnect()
    }
  }, [])

  return null
}
