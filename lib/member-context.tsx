'use client'
import { createContext, useContext } from 'react'

interface MemberCtx {
  member: { id?: string; full_name: string; email: string } | null
  requireAuth: () => void
}

export const MemberContext = createContext<MemberCtx>({
  member: null,
  requireAuth: () => {},
})

export function useMember() { return useContext(MemberContext) }
