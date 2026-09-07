'use client'
import { useEffect } from 'react'
import './scroll-reveal.css'

function getActiveContainer(): Element | null {
  // The active tab has opacity > 0.5 (framer-motion sets inline style)
  const containers = document.querySelectorAll<HTMLElement>('[data-scroll-container="1"]')
  for (const c of Array.from(containers)) {
    const op = parseFloat(c.style.opacity ?? '1')
    if (isNaN(op) || op > 0.5) return c
  }
  return null
}

function revealInContainer(container: Element | null) {
  const scope = container || document.body
  const els = scope.querySelectorAll<HTMLElement>(
    '[data-reveal]:not(.revealed), [data-reveal-stagger]:not(.revealed)'
  )
  els.forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.bottom > 20 && r.top < window.innerHeight - 20) {
      el.classList.add('revealed')
    }
  })
}

export function ScrollRevealProvider() {
  useEffect(() => {
    let activeContainer: Element | null = null

    const onTabChange = () => {
      // Wait for framer-motion transition (0.32s tween)
      setTimeout(() => {
        activeContainer = getActiveContainer()
        if (!activeContainer) return

        // Reset previously revealed elements in this container so they animate again
        activeContainer.querySelectorAll('.revealed[data-reveal], .revealed[data-reveal-stagger]')
          .forEach(el => el.classList.remove('revealed'))

        // Trigger reveal for elements currently in view
        revealInContainer(activeContainer)
      }, 360)
    }

    const onScroll = () => revealInContainer(activeContainer)

    window.addEventListener('pk-tab-change', onTabChange)
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })

    // Attach scroll listeners to each tab container
    const attachContainerScroll = () => {
      document.querySelectorAll('[data-scroll-container="1"]').forEach(el => {
        el.removeEventListener('scroll', onScroll)
        el.addEventListener('scroll', onScroll, { passive: true })
      })
    }

    // Watch for new containers (lazy-loaded tabs)
    const domObs = new MutationObserver(() => {
      attachContainerScroll()
    })
    domObs.observe(document.body, { childList: true, subtree: true })

    // Initial setup
    setTimeout(() => {
      activeContainer = getActiveContainer()
      attachContainerScroll()
      revealInContainer(activeContainer)
    }, 100)

    return () => {
      window.removeEventListener('pk-tab-change', onTabChange)
      document.removeEventListener('scroll', onScroll, { capture: true })
      domObs.disconnect()
    }
  }, [])

  return null
}
