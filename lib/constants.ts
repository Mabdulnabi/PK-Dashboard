export const MEMBER_COOKIE    = 'pk_member_token'
export const COOKIE_MAX_AGE   = 60 * 60 * 24 * 30   // 30 days in seconds
export const SESSION_TTL_MS   = 5 * 60 * 1000        // 5 min in ms
export const SESSION_TTL_S    = 5 * 60               // 5 min in seconds

export const TIER_ORDER = ['basic', 'vip', 'private'] as const
export type Tier = typeof TIER_ORDER[number]

export const SESSION_STATUS = {
  ACTIVE:    'active',
  EXPIRED:   'expired',
  CANCELLED: 'cancelled',
} as const

export const AUDIT_ACTIONS = {
  CONNECT:       'connect',
  DISCONNECT:    'disconnect',
  KEEPALIVE:     'keepalive',
  SESSION_REUSE: 'session_reuse',
} as const
