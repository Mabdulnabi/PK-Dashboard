'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Heart, Trash, Plus, Minus, ShoppingBag, ArrowRight, Check, X, Package, Users, LockKey } from '@phosphor-icons/react'
import { useCart } from '@/lib/cart-context'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'

const GOLD = '#d99401'

const TYPE_META: Record<string, { label: string; labelAr: string; color: string; Icon: any }> = {
  shared:  { label: 'Shared Tools',  labelAr: 'أدوات مشتركة',  color: '#3b82f6', Icon: Users },
  bundle:  { label: 'Bundle Tools',  labelAr: 'حزم الأدوات',   color: '#f59e0b', Icon: Package },
  private: { label: 'Private Store', labelAr: 'المتجر الشخصي', color: '#8b5cf6', Icon: LockKey },
}

function TypeBadge({ slug, lang }: { slug: string; lang: string }) {
  const m = TYPE_META[slug] || TYPE_META.shared
  const Icon = m.Icon
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: m.color + '18', color: m.color }}>
      <Icon size={10} weight="duotone"/>{lang === 'ar' ? m.labelAr : m.label}
    </span>
  )
}

function SectionHeader({ slug, count, lang }: { slug: string; count: number; lang: string }) {
  const m = TYPE_META[slug] || TYPE_META.shared
  const Icon = m.Icon
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: m.color + '20' }}>
        <Icon size={13} weight="duotone" style={{ color: m.color }}/>
      </div>
      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: m.color }}>
        {lang === 'ar' ? m.labelAr : m.label}
      </span>
      <span className="text-xs text-gray-400">({count})</span>
      <div className="flex-1 h-px" style={{ background: m.color + '30' }}/>
    </div>
  )
}

export default function CartPage() {
  const router = useRouter()
  const { t, lang, dir, formatPrice } = useLang()
  const settings = useSiteSettings()
  const { cart, favorites, loading, cartCount, removeFromCart, updateQty, clearCart, toggleFav, isFav, addToCart } = useCart()
  const [tab, setTab] = useState<'cart' | 'favorites'>('cart')
  const [checkingOut, setCheckingOut] = useState(false)
  const [toast, setToast] = useState('')

  const rate = parseFloat(settings.usd_to_egp_rate) || 50
  const fmt  = (egp: number) => formatPrice(egp, rate)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const subtotal = cart.reduce((s, i) => s + (i.shop_tools?.price_egp || 0) * i.quantity, 0)

  // Group by category_slug
  const ORDER = ['private', 'shared', 'bundle']
  const cartGroups = ORDER
    .map(slug => ({ slug, items: cart.filter(i => (i.shop_tools?.category_slug || 'shared') === slug) }))
    .filter(g => g.items.length > 0)
  const favGroups = ORDER
    .map(slug => ({ slug, items: favorites.filter(f => (f.shop_tools?.category_slug || 'shared') === slug) }))
    .filter(g => g.items.length > 0)

  const checkout = async () => {
    if (cart.length === 0) return
    setCheckingOut(true)
    if (cart.length === 1 && cart[0].shop_tools?.id) {
      router.push(`/u/checkout?tool_id=${cart[0].shop_tools.id}`)
    } else {
      router.push('/u/checkout?cart=1')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }}/>
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto" dir={dir}>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white pointer-events-none" style={{ background: GOLD }}>
          <Check size={15}/>{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShoppingCart size={22} weight="duotone" style={{ color: GOLD }}/>
            {t('My Cart', 'سلة التسوق')}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{cartCount} {t('items', 'عناصر')}</p>
        </div>
        <Link href="/u/shop" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ArrowRight size={15} className={dir === 'rtl' ? 'rotate-180' : ''}/>
          {t('Continue Shopping', 'متابعة التسوق')}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit">
        <button onClick={() => setTab('cart')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'cart' ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          <ShoppingCart size={14} weight="duotone"/>
          {t('Cart', 'السلة')}
          {cartCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: GOLD }}>{cartCount}</span>}
        </button>
        <button onClick={() => setTab('favorites')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'favorites' ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          <Heart size={14} weight="duotone"/>
          {t('Favorites', 'المفضلة')}
          {favorites.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-500">{favorites.length}</span>}
        </button>
      </div>

      {/* ── CART TAB ─────────────────────────────── */}
      {tab === 'cart' && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: GOLD + '18' }}>
                  <ShoppingBag size={32} weight="duotone" style={{ color: GOLD }}/>
                </div>
                <div>
                  <p className="font-bold text-gray-700 dark:text-gray-300">{t('Your cart is empty', 'سلتك فارغة')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('Add tools to get started', 'أضف أدوات للبدء')}</p>
                </div>
                <Link href="/u/shop" className="px-5 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: GOLD }}>
                  {t('Browse Tools', 'تصفح الأدوات')}
                </Link>
              </div>
            ) : (
              <>
                {cartGroups.map(group => (
                  <div key={group.slug} className="space-y-2">
                    <SectionHeader slug={group.slug} count={group.items.length} lang={lang}/>
                    {group.items.map(item => {
                      const tool = item.shop_tools
                      const isPrivate = group.slug === 'private'
                      const lineTotal = (tool?.price_egp || 0) * item.quantity
                      const m = TYPE_META[group.slug] || TYPE_META.shared
                      return (
                        <div key={item.id}
                          className="bg-white dark:bg-gray-900 border rounded-2xl p-4 flex items-start gap-4"
                          style={{ borderColor: m.color + '30', borderLeftWidth: dir === 'ltr' ? 3 : 1, borderLeftColor: m.color }}>
                          {/* Image */}
                          <div className="w-14 h-14 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {tool?.image_url
                              ? <img src={tool.image_url} alt={tool.name} className="w-10 h-10 object-contain"/>
                              : <span className="text-lg font-bold text-gray-300">{tool?.name?.slice(0,2).toUpperCase() || '?'}</span>
                            }
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">{tool?.name || '—'}</p>
                                <div className="mt-1"><TypeBadge slug={group.slug} lang={lang}/></div>
                              </div>
                              <div className="text-end flex-shrink-0">
                                <p className="text-base font-bold" style={{ color: GOLD }}>{fmt(lineTotal)}</p>
                                {item.quantity > 1 && <p className="text-[11px] text-gray-400">{fmt(tool?.price_egp || 0)} × {item.quantity}</p>}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                              {isPrivate ? (
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1">
                                  <button onClick={() => updateQty(item.tool_id, item.quantity - 1)} disabled={item.quantity <= 1}
                                    className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                    <Minus size={11}/>
                                  </button>
                                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200 w-5 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQty(item.tool_id, item.quantity + 1)}
                                    className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                    <Plus size={11}/>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">{t('Qty: 1', 'الكمية: 1')}</span>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { toggleFav(item.tool_id, tool); showToast(isFav(item.tool_id) ? t('Removed from favorites','تمت الإزالة من المفضلة') : t('Added to favorites ♥','تمت الإضافة للمفضلة ♥')) }}
                                  className="flex items-center gap-1 text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                  style={{ color: isFav(item.tool_id) ? '#ef4444' : '#9ca3af' }}>
                                  <Heart size={13} weight={isFav(item.tool_id) ? 'fill' : 'regular'}/>{t('Fav','مفضلة')}
                                </button>
                                <button onClick={() => { removeFromCart(item.tool_id); showToast(t('Removed','تمت الإزالة')) }}
                                  className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                  <Trash size={13}/>{t('Remove','إزالة')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}

                <button onClick={() => { clearCart(); showToast(t('Cart cleared','تم تفريغ السلة')) }}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1 mt-1">
                  <Trash size={12}/>{t('Clear cart', 'تفريغ السلة')}
                </button>
              </>
            )}
          </div>

          {/* Order summary */}
          {cart.length > 0 && (
            <div className="lg:w-72 flex-shrink-0">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sticky top-6">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('Order Summary', 'ملخص الطلب')}</h3>
                <div className="space-y-2 mb-4">
                  {cartGroups.map(g => (
                    <div key={g.slug} className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TYPE_META[g.slug]?.color }}/>
                        {lang === 'ar' ? TYPE_META[g.slug]?.labelAr : TYPE_META[g.slug]?.label}
                      </span>
                      <span className="font-medium">{fmt(g.items.reduce((s, i) => s + (i.shop_tools?.price_egp || 0) * i.quantity, 0))}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mb-4 flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-gray-100">{t('Total', 'الإجمالي')}</span>
                  <span className="text-xl font-bold" style={{ color: GOLD }}>{fmt(subtotal)}</span>
                </div>
                <button onClick={checkout} disabled={checkingOut}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: GOLD }}>
                  {checkingOut
                    ? <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"/>
                    : <><ShoppingBag size={16} weight="duotone"/>{t('Checkout', 'إتمام الشراء')}</>
                  }
                </button>
                <p className="text-[11px] text-gray-400 text-center mt-3">{t('Secure checkout', 'دفع آمن')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FAVORITES TAB ───────────────────────── */}
      {tab === 'favorites' && (
        <div className="space-y-5">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                <Heart size={32} weight="duotone" className="text-red-400"/>
              </div>
              <div>
                <p className="font-bold text-gray-700 dark:text-gray-300">{t('No favorites yet', 'لا توجد مفضلات بعد')}</p>
                <p className="text-sm text-gray-400 mt-1">{t('Tap the heart on any tool to save it', 'اضغط على القلب في أي أداة لحفظها')}</p>
              </div>
            </div>
          ) : (
            favGroups.map(group => (
              <div key={group.slug}>
                <SectionHeader slug={group.slug} count={group.items.length} lang={lang}/>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {group.items.map(fav => {
                    const tool = fav.shop_tools
                    const alreadyInCart = cart.some(i => i.tool_id === fav.tool_id)
                    const m = TYPE_META[group.slug] || TYPE_META.shared
                    return (
                      <div key={fav.id}
                        className="bg-white dark:bg-gray-900 border rounded-2xl p-4 flex flex-col"
                        style={{ borderColor: m.color + '30', borderTopWidth: 3, borderTopColor: m.color }}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {tool?.image_url
                              ? <img src={tool.image_url} alt={tool.name} className="w-9 h-9 object-contain"/>
                              : <span className="text-base font-bold text-gray-300">{tool?.name?.slice(0,2).toUpperCase() || '?'}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">{tool?.name || '—'}</p>
                            <div className="mt-1"><TypeBadge slug={group.slug} lang={lang}/></div>
                          </div>
                        </div>
                        <p className="text-base font-bold mb-3" style={{ color: GOLD }}>
                          {tool?.price_egp ? fmt(tool.price_egp) : '—'}
                        </p>
                        <div className="flex gap-2 mt-auto">
                          <button onClick={() => { toggleFav(fav.tool_id, tool); showToast(t('Removed from favorites','تمت الإزالة من المفضلة')) }}
                            className="w-9 h-9 flex-shrink-0 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
                            <Heart size={14} weight="fill"/>
                          </button>
                          <button
                            onClick={async () => {
                              await addToCart(fav.tool_id, 1, tool)
                              showToast(t('Added to cart ✓', 'تمت الإضافة للسلة ✓'))
                            }}
                            disabled={alreadyInCart}
                            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-70"
                            style={alreadyInCart
                              ? { background: '#d9940120', color: GOLD, border: '1.5px solid #d9940150' }
                              : { background: GOLD, color: 'white' }}>
                            {alreadyInCart
                              ? <><Check size={13}/>{t('In Cart', 'في السلة')}</>
                              : <><ShoppingCart size={13} weight="duotone"/>{t('Add to Cart', 'أضف للسلة')}</>
                            }
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
