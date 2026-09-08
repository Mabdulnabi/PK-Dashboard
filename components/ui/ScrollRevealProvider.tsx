'use client'
import { useEffect } from 'react'
import './scroll-reveal.css'

export function ScrollRevealProvider() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let io: IntersectionObserver | null = null

    function observe(root: Element | Document = document) {
      const selector = '[data-reveal]:not(.revealed), [data-reveal-stagger]:not(.revealed)'
      root.querySelectorAll<HTMLElement>(selector).forEach(el => io?.observe(el))
    }

    function buildIO() {
      if (io) io.disconnect()
      io = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('revealed')
              io?.unobserve(e.target)
            }
          })
        },
        { threshold: 0.08 }
      )
      observe()
    }

    buildIO()

    // Re-observe when new DOM nodes appear (async data loads)
    const mo = new MutationObserver(() => observe())
    mo.observe(document.body, { childList: true, subtree: true })

    // Tab switch: reset + re-reveal
    const onTabChange = () => {
      setTimeout(() => {
        document.querySelectorAll<HTMLElement>('[data-reveal].revealed, [data-reveal-stagger].revealed')
          .forEach(el => el.classList.remove('revealed'))
        buildIO()
      }, 360)
    }
    window.addEventListener('pk-tab-change', onTabChange)

    return () => {
      io?.disconnect()
      mo.disconnect()
      window.removeEventListener('pk-tab-change', onTabChange)
    }
  }, [])

  return null
}
