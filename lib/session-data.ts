export interface CookieRecord {
  name:            string
  value:           string
  domain?:         string
  path?:           string
  secure?:         boolean
  httpOnly?:       boolean
  sameSite?:       string
  expirationDate?: number
  hostOnly?:       boolean
}

export interface SessionEnvelope {
  cookies:      CookieRecord[]
  localStorage: Record<string, unknown>
  indexedDB:    unknown[]
}

export function normalizeSessionData(raw: string | null): SessionEnvelope | null {
  if (!raw) return null
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return null }
  if (Array.isArray(parsed))
    return { cookies: parsed as CookieRecord[], localStorage: {}, indexedDB: [] }
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).cookies))
    return parsed as SessionEnvelope
  return null
}
