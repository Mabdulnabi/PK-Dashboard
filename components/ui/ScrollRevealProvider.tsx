'use client'
import { useEffect } from 'react'
import { animate, stagger } from 'framer-motion'
import './scroll-reveal.css'

// ── Easing & timing ──────────────────────────────────────────────────────────
const EASE   = [0.22, 1, 0.36, 1] as [number,number,number,number]
const DUR    = 0.62
const STAG   = 0.09

// ── Per-direction initial state ──────────────────────────────────────────────
function initialState(dir: string | null) {
  if (dir === 'left')  return { opacity: 0, x: -36, y: 0,  scale: 1    }
  if (dir === 'right') return { opacity: 0, x:  36, y: 0,  scale: 1    }
  if (dir === 'fade')  return { opacity: 0, x: 0,   y: 0,  scale: 1    }
  if (dir === 'scale') return { opacity: 0, x: 0,   y: 14, scale: 0.93 }
  return                      { opacity: 0, x: 0,   y: 30, scale: 1    } // default: up
}

// ── Animate a single [data-reveal] element ───────────────────────────────────
function revealEl(el: HTMLElement) {
  if (el.dataset.fmRevealed) return
  el.dataset.fmRevealed = '1'
  const dir = el.getAttribute('data-reveal')
  // Snap to initial state instantly, then animate in
  animate(el, initialState(dir), { duration: 0 })
  animate(el, { opacity: 1, x: 0, y: 0, scale: 1 }, {
    duration: DUR,
    ease: EASE,
  })
}

// ── Animate a [data-reveal-stagger] container's children ────────────────────
function revealStagger(el: HTMLElement) {
  if (el.dataset.fmRevealed) return
  el.dataset.fmRevealed = '1'
  const kids = Array.from(el.children) as HTMLElement[]
  animate(kids, { opacity: 0, y: 22 }, { duration: 0 })
  animate(kids, { opacity: 1, y: 0 }, {
    duration: 0.52,
    ease: EASE,
    delay: stagger(STAG, { startDelay: 0.04 }),
  })
}

// ── Check viewport & reveal any in-view elements ────────────────────────────
function revealVisible(scope: Element | null) {
  const root = scope || document.body
  const vh   = window.innerHeight

  root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-fm-revealed])').forEach(el => {
    const { top, bottom } = el.getBoundingClientRect()
    if (bottom > 30 && top < vh - 30) revealEl(el)
  })
  root.querySelectorAll<HTMLElement>('[data-reveal-stagger]:not([data-fm-revealed])').forEach(el => {
    const { top, bottom } = el.getBoundingClientRect()
    if (bottom > 30 && top < vh - 30) revealStagger(el)
  })
}

// ── Reset container & re-animate (for tab switches) ─────────────────────────
function resetAndReveal(container: Element) {
  container.querySelectorAll<HTMLElement>('[data-fm-revealed]').forEach(el => {
    delete el.dataset.fmRevealed
    // Reset opacity so elements aren't visible during transition
    ;(el as HTMLElement).style.opacity = '0'
  })
  revealVisible(container)
}

// ── Active tab container detection ──────────────────────────────────────────
function getActiveContainer(): Element | null {
  for (const c of Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-container="1"]'))) {
    const op = parseFloat(c.style.opacity ?? '1')
    if (isNaN(op) || op > 0.5) return c
  }
  return null
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function ScrollRevealProvider() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let activeContainer: Element | null = null

    const onTabChange = () => {
      // Wait for Framer Motion tab transition (~320ms)
      setTimeout(() => {
        activeContainer = getActiveContainer()
        if (activeContainer) resetAndReveal(activeContainer)
      }, 360)
    }

    const onScroll = () => revealVisible(activeContainer)

    const attachContainerScroll = () => {
      document.querySelectorAll('[data-scroll-container="1"]').forEach(el => {
        el.removeEventListener('scroll', onScroll)
        el.addEventListener('scroll', onScroll, { passive: true })
      })
    }

    const domObs = new MutationObserver(attachContainerScroll)
    domObs.observe(document.body, { childList: true, subtree: true })

    window.addEventListener('pk-tab-change', onTabChange)
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })

    // Initial reveal after first paint
    setTimeout(() => {
      activeContainer = getActiveContainer()
      attachContainerScroll()
      revealVisible(activeContainer)
    }, 100)

    return () => {
      window.removeEventListener('pk-tab-change', onTabChange)
      document.removeEventListener('scroll', onScroll, { capture: true })
      domObs.disconnect()
    }
  }, [])

  return null
}
