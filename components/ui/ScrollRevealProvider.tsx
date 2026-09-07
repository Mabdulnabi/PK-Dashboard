'use client'
import { useEffect } from 'react'
import './scroll-reveal.css'

export function ScrollRevealProvider() {
  useEffect(() => {
    // Each scroll container needs its own observer (layout uses absolute positioned scroll divs)
    const observers: IntersectionObserver[] = []

    const makeObs = (root: Element | null) => {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('revealed')
              obs.unobserve(entry.target)
            }
          })
        },
        { root, threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
      )
      observers.push(obs)
      return obs
    }

    const scan = () => {
      // Get all active scroll containers
      const containers = Array.from(document.querySelectorAll('[data-scroll-container="1"]'))

      document.querySelectorAll('[data-reveal]:not(.revealed), [data-reveal-stagger]:not(.revealed)').forEach((el) => {
        // Find which scroll container this element lives in
        const container = containers.find(c => c.contains(el)) || null
        // Reuse or create an observer for this root
        let obs = observers.find(o => {
          const ro = (o as any).root
          return ro === container
        })
        if (!obs) obs = makeObs(container)
        obs.observe(el)
      })
    }

    scan()

    const mutObs = new MutationObserver(scan)
    mutObs.observe(document.body, { childList: true, subtree: true })

    return () => {
      observers.forEach(o => o.disconnect())
      mutObs.disconnect()
    }
  }, [])

  return null
}
