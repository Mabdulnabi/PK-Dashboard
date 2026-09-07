export const RANK_TIERS = [
  { key: 'regular',  ar: 'عادي',    en: 'Regular',  min: 0,     color: '#5a8098' },
  { key: 'bronze',   ar: 'برونزي',  en: 'Bronze',   min: 1,     color: '#b06030' },
  { key: 'silver',   ar: 'فضي',     en: 'Silver',   min: 2000,  color: '#8888a0' },
  { key: 'gold',     ar: 'ذهبي',    en: 'Gold',     min: 8000,  color: '#d99401' },
  { key: 'platinum', ar: 'بلاتيني', en: 'Platinum', min: 20000, color: '#7898b8' },
  { key: 'emerald',  ar: 'زمردي',   en: 'Emerald',  min: 40000, color: '#18a050' },
  { key: 'diamond',  ar: 'ماسي',    en: 'Diamond',  min: 60000, color: '#3870b8' },
] as const

export type RankKey = typeof RANK_TIERS[number]['key']
export type RankTier = typeof RANK_TIERS[number]

export function getMemberRank(spent = 0): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (spent >= RANK_TIERS[i].min) return RANK_TIERS[i]
  }
  return RANK_TIERS[0]
}

export const BADGE_CFG: Record<RankKey, { g0: string; g1: string; g2: string; ft: string; fur: string; fb: string; fll: string; ib: string }> = {
  regular:  { g0: '#c8dce8', g1: '#6888a0', g2: '#1e3448', ft: '#d8eaf8', fur: '#a0c0d8', fb: '#182838', fll: '#243c50', ib: '#eef4f8' },
  bronze:   { g0: '#ffe090', g1: '#c07820', g2: '#3c1400', ft: '#ffe8a0', fur: '#d89838', fb: '#301000', fll: '#5a2808', ib: '#fef4e4' },
  silver:   { g0: '#ffffff', g1: '#9898a8', g2: '#202028', ft: '#ffffff', fur: '#dcdcec', fb: '#181820', fll: '#323240', ib: '#f0f0f6' },
  gold:     { g0: '#f5d060', g1: '#d99401', g2: '#3a1800', ft: '#f5d878', fur: '#d99401', fb: '#2a1000', fll: '#5c2800', ib: '#fff4e0' },
  platinum: { g0: '#f4f8ff', g1: '#7898c0', g2: '#182840', ft: '#f8fcff', fur: '#ccdcf4', fb: '#101e34', fll: '#203050', ib: '#c8d8ee' },
  emerald:  { g0: '#a8ffcc', g1: '#14b850', g2: '#022c10', ft: '#b8ffd4', fur: '#44ec84', fb: '#011c0a', fll: '#054018', ib: '#edfff4' },
  diamond:  { g0: '#e0f0ff', g1: '#4090d8', g2: '#081428', ft: '#eaf6ff', fur: '#b0d4f8', fb: '#060e20', fll: '#102040', ib: '#eef6ff' },
}
