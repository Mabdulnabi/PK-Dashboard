'use client'
import { useEffect } from 'react'
import './scroll-reveal.css'

export function ScrollRevealProvider() {
  useEffect(() => {
    // Use viewport-based IntersectionObserver (root: null = viewport)
    // Works for elements that are visually on screen even inside absolute containers
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    )

    const observed = new WeakSet<Element>()

    const scan = () => {
      document.querySelectorAll('[data-reveal]:not(.revealed), [data-reveal-stagger]:not(.revealed)').forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el)
          obs.observe(el)
        }
      })
    }

    scan()

    // Re-scan on DOM changes (tab switches, dynamic loads)
    const mutObs = new MutationObserver(() => setTimeout(scan, 60))
    mutObs.observe(document.body, { childList: true, subtree: true })

    // Also re-scan on any scroll (for elements already in DOM but not yet visible)
    const onScroll = () => scan()
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })

    return () => {
      obs.disconnect()
      mutObs.disconnect()
      document.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [])

  return null
}
