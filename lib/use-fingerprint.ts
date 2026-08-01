'use client'
import { useEffect, useState } from 'react'
import type { Agent } from '@fingerprintjs/fingerprintjs'

let cached: string | null = null
let agentPromise: Promise<Agent> | null = null

async function loadAgent(): Promise<Agent> {
  if (!agentPromise) {
    const FP = await import('@fingerprintjs/fingerprintjs')
    agentPromise = FP.load()
  }
  return agentPromise
}

export function useFingerprint() {
  const [fp, setFp] = useState<string | null>(cached)

  useEffect(() => {
    if (cached) { setFp(cached); return }
    loadAgent()
      .then(agent => agent.get())
      .then(result => { cached = result.visitorId; setFp(result.visitorId) })
      .catch(() => {})
  }, [])

  return fp
}

/** One-shot async getter — use outside React (e.g. in fetch calls) */
export async function getFingerprint(): Promise<string> {
  if (cached) return cached
  const agent  = await loadAgent()
  const result = await agent.get()
  cached = result.visitorId
  return cached
}
