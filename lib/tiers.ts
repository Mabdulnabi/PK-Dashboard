import { TIER_ORDER, Tier } from './constants'

export function tierIndex(tier: string): number {
  return TIER_ORDER.indexOf(tier as Tier)
}

export function canAccess(memberTier: string | null, requiredTier: string): boolean {
  return tierIndex(memberTier || 'basic') >= tierIndex(requiredTier)
}
