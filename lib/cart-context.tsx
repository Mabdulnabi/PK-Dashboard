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
  cart:           CartItem[]
  favorites:      FavoriteItem[]
  loading:        boolean
  cartCount:      number
  addToCart:      (tool_id: string, quantity?: number, toolData?: Partial<CartTool>) => Promise<void>
  removeFromCart: (tool_id: string) => Promise<void>
  updateQty:      (tool_id: string, quantity: number) => Promise<void>
  clearCart:      () => Promise<void>
  inCart:         (tool_id: string) => boolean
  getQty:         (tool_id: string) => number
  toggleFav:      (tool_id: string, toolData?: Partial<CartTool>) => Promise<void>
  isFav:          (tool_id: string) => boolean
  refresh:        () => Promise<void>
}

const Ctx = createContext<CartCtx | null>(null)

const CART_KEY = 'pk_cart'
const FAV_KEY  = 'pk_favs'

function readLocal<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function writeLocal(key: string, data: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart,      setCart]      = useState<CartItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const pendingRef  = useRef<Set<string>>(new Set())

  // Load localStorage immediately on mount (instant — no flicker)
  useEffect(() => {
    setCart(readLocal<CartItem>(CART_KEY))
    setFavorites(readLocal<FavoriteItem>(FAV_KEY))
    setLoading(false)
  }, [])

  // Sync from DB (best-effort — never blocks UI)
  const syncFromDB = useCallback(async () => {
    try {
      const [cr, fr] = await Promise.all([
        fetch('/api/member/cart'),
        fetch('/api/member/favorites'),
      ])
      if (cr.ok) {
        const d = await cr.json()
        const items: CartItem[] = d.items || []
        setCart(items)
        writeLocal(CART_KEY, items)
      }
      if (fr.ok) {
        const d = await fr.json()
        const favs: FavoriteItem[] = d.favorites || []
        setFavorites(favs)
        writeLocal(FAV_KEY, favs)
      }
    } catch {}
  }, [])

  useEffect(() => { syncFromDB() }, [syncFromDB])

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const inCart = (tool_id: string) => cart.some(i => i.tool_id === tool_id)
  const getQty = (tool_id: string) => cart.find(i => i.tool_id === tool_id)?.quantity ?? 1
  const isFav  = (tool_id: string) => favorites.some(f => f.tool_id === tool_id)

  const addToCart = async (tool_id: string, quantity = 1, toolData?: Partial<CartTool>) => {
    const key = `add:${tool_id}`
    if (pendingRef.current.has(key)) return
    pendingRef.current.add(key)

    // 1. Update localStorage + state immediately (never rolls back)
    const existing = cart.find(i => i.tool_id === tool_id)
    let newCart: CartItem[]
    if (existing) {
      newCart = cart.map(i => i.tool_id === tool_id ? { ...i, quantity } : i)
    } else {
      const stub: CartTool = {
        id: tool_id, name: toolData?.name || '', description: toolData?.description || '',
        image_url: toolData?.image_url, price_egp: toolData?.price_egp || 0,
        price_usd: toolData?.price_usd, duration_label: toolData?.duration_label || '',
        category_slug: toolData?.category_slug || '', is_out_of_stock: false,
      }
      newCart = [...cart, { id: `local-${tool_id}`, tool_id, quantity, shop_tools: stub }]
    }
    setCart(newCart)
    writeLocal(CART_KEY, newCart)

    // 2. Sync to DB — if it works, refresh to get real IDs
    try {
      const res = await fetch('/api/member/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id, quantity }),
      })
      if (res.ok) await syncFromDB()
    } finally {
      pendingRef.current.delete(key)
    }
  }

  const removeFromCart = async (tool_id: string) => {
    const newCart = cart.filter(i => i.tool_id !== tool_id)
    setCart(newCart)
    writeLocal(CART_KEY, newCart)
    try {
      await fetch('/api/member/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id }),
      })
    } catch {}
  }

  const updateQty = async (tool_id: string, quantity: number) => {
    if (quantity < 1) return
    const newCart = cart.map(i => i.tool_id === tool_id ? { ...i, quantity } : i)
    setCart(newCart)
    writeLocal(CART_KEY, newCart)
    try {
      await fetch('/api/member/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id, quantity }),
      })
    } catch {}
  }

  const clearCart = async () => {
    setCart([])
    writeLocal(CART_KEY, [])
    try {
      await fetch('/api/member/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      })
    } catch {}
  }

  const toggleFav = async (tool_id: string, toolData?: Partial<CartTool>) => {
    const wasFav = isFav(tool_id)
    let newFavs: FavoriteItem[]
    if (wasFav) {
      newFavs = favorites.filter(f => f.tool_id !== tool_id)
    } else {
      const stub: CartTool = {
        id: tool_id, name: toolData?.name || '', description: toolData?.description || '',
        image_url: toolData?.image_url, price_egp: toolData?.price_egp || 0,
        price_usd: toolData?.price_usd, duration_label: toolData?.duration_label || '',
        category_slug: toolData?.category_slug || '', is_out_of_stock: false,
      }
      newFavs = [...favorites, { id: `local-fav-${tool_id}`, tool_id, shop_tools: stub }]
    }
    setFavorites(newFavs)
    writeLocal(FAV_KEY, newFavs)
    try {
      const res = await fetch('/api/member/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id }),
      })
      if (res.ok) await syncFromDB()
    } catch {}
  }

  return (
    <Ctx.Provider value={{
      cart, favorites, loading, cartCount,
      addToCart, removeFromCart, updateQty, clearCart,
      inCart, getQty, toggleFav, isFav, refresh: syncFromDB,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
