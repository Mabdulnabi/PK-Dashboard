'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export interface CartTool {
  id: string; name: string; description: string; image_url?: string
  price_egp: number; price_usd?: number; duration_label: string
  category_slug: string; is_out_of_stock: boolean
}

export interface CartItem {
  id: string; tool_id: string; quantity: number; shop_tools: CartTool
}

export interface FavoriteItem {
  id: string; tool_id: string; shop_tools: CartTool
}

interface CartCtx {
  cart:       CartItem[]
  favorites:  FavoriteItem[]
  loading:    boolean
  cartCount:  number
  addToCart:  (tool_id: string, quantity?: number) => Promise<void>
  removeFromCart: (tool_id: string) => Promise<void>
  updateQty:  (tool_id: string, quantity: number) => Promise<void>
  clearCart:  () => Promise<void>
  inCart:     (tool_id: string) => boolean
  getQty:     (tool_id: string) => number
  toggleFav:  (tool_id: string) => Promise<void>
  isFav:      (tool_id: string) => boolean
  refresh:    () => Promise<void>
}

const Ctx = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart,      setCart]      = useState<CartItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const pendingRef  = useRef<Set<string>>(new Set())

  const fetchAll = useCallback(async () => {
    try {
      const [cr, fr] = await Promise.all([
        fetch('/api/member/cart'),
        fetch('/api/member/favorites'),
      ])
      if (cr.ok) { const d = await cr.json(); setCart(d.items || []) }
      if (fr.ok) { const d = await fr.json(); setFavorites(d.favorites || []) }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const inCart = (tool_id: string) => cart.some(i => i.tool_id === tool_id)
  const getQty = (tool_id: string) => cart.find(i => i.tool_id === tool_id)?.quantity ?? 1
  const isFav  = (tool_id: string) => favorites.some(f => f.tool_id === tool_id)

  const addToCart = async (tool_id: string, quantity = 1) => {
    const key = `add:${tool_id}`
    if (pendingRef.current.has(key)) return
    pendingRef.current.add(key)

    // Optimistic update — works for both new and existing items
    const existing = cart.find(i => i.tool_id === tool_id)
    if (existing) {
      setCart(prev => prev.map(i => i.tool_id === tool_id ? { ...i, quantity } : i))
    } else {
      setCart(prev => [...prev, { id: `tmp-${tool_id}`, tool_id, quantity, shop_tools: {} as CartTool }])
    }

    try {
      const res = await fetch('/api/member/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id, quantity }),
      })
      if (res.ok) {
        await fetchAll()
      } else {
        // Rollback optimistic add on error
        if (!existing) setCart(prev => prev.filter(i => i.id !== `tmp-${tool_id}`))
      }
    } finally {
      pendingRef.current.delete(key)
    }
  }

  const removeFromCart = async (tool_id: string) => {
    setCart(prev => prev.filter(i => i.tool_id !== tool_id))
    await fetch('/api/member/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id }),
    })
  }

  const updateQty = async (tool_id: string, quantity: number) => {
    if (quantity < 1) return
    setCart(prev => prev.map(i => i.tool_id === tool_id ? { ...i, quantity } : i))
    await fetch('/api/member/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id, quantity }),
    })
  }

  const clearCart = async () => {
    setCart([])
    await fetch('/api/member/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: true }),
    })
  }

  const toggleFav = async (tool_id: string) => {
    const wasFav = isFav(tool_id)
    setFavorites(prev =>
      wasFav
        ? prev.filter(f => f.tool_id !== tool_id)
        : [...prev, { id: 'tmp', tool_id, shop_tools: cart.find(i=>i.tool_id===tool_id)?.shop_tools || ({} as CartTool) }]
    )
    const res = await fetch('/api/member/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_id }),
    })
    if (res.ok) await fetchAll()
  }

  return (
    <Ctx.Provider value={{ cart, favorites, loading, cartCount, addToCart, removeFromCart, updateQty, clearCart, inCart, getQty, toggleFav, isFav, refresh: fetchAll }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
