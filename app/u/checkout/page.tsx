'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Check, AlertCircle, MessageCircle, Copy, Loader2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Tool { id:string; name:string; description:string; price_egp:number; price_usd?:number; duration_label:string; duration_days:number; image_url?:string; category_slug?:string }
interface BundleTool { id:string; name:string; image_url?:string }
interface Bundle { id:string; name:string; name_ar?:string; price_egp:number; duration_days:number; included_tools:BundleTool[] }
interface Settings { whatsapp_number:string; usd_to_egp_rate:string }
interface Gateway {
  id:string; name_ar:string; name_en:string; currency:string
  logo_url:string|null; qr_url:string|null; uid:string|null
  uid_label_ar:string|null; uid_label_en:string|null
  input_label_ar:string|null; input_label_en:string|null
  input_placeholder_ar:string|null; input_placeholder_en:string|null
  instructions_ar:string|null; instructions_en:string|null
  edge_fn:string|null; payload_key:string|null; is_dynamic:boolean
}

const FALLBACK_ICONS: Record<string,string> = {
  binance:'🟡', bybit:'🔵', bep20:'💎', instapay:'💳', vodafone:'📱', easykash:'💰',
}

interface CartLocalItem { tool_id: string; quantity: number; shop_tools?: Partial<Tool> }

function CheckoutInner() {
  const { t, lang, formatPrice, dir } = useLang()
  const siteSettings = useSiteSettings()
  const params    = useSearchParams()
  const router    = useRouter()
  const toolId    = params.get('tool_id')
  const bundleId  = params.get('bundle_id')
  const cartMode  = params.get('cart') === '1'

  const [tool,             setTool]             = useState<Tool|null>(null)
  const [bundle,           setBundle]           = useState<Bundle|null>(null)
  const [cartItems,        setCartItems]        = useState<CartLocalItem[]>([])
  const [settings,         setSettings]         = useState<Settings>({ whatsapp_number:'', usd_to_egp_rate:'50' })
  const [gateways,         setGateways]         = useState<Gateway[]>([])
  const [loading,          setLoading]          = useState(true)
  const [existingPurchase, setExistingPurchase] = useState<any>(null)
  const [step,         setStep]         = useState<'details'|'payment'|'done'>('details')
  const [method,       setMethod]       = useState('')
  const [txRef,        setTxRef]        = useState('')
  const [coupon,       setCoupon]       = useState('')
  const [couponResult, setCouponResult] = useState<any>(null)
  const [verifying,    setVerifying]    = useState(false)
  const [error,        setError]        = useState('')
  const [copied,       setCopied]       = useState(false)
  const [easykashUrl,  setEasykashUrl]  = useState<string|null>(null)
  const [polling,      setPolling]      = useState(false)
  const pollRef     = useRef<NodeJS.Timeout|null>(null)
  const paymentIdRef = useRef<string|null>(null)

  const fetchGateways = () =>
    fetch('/api/member/gateways').then(r=>r.json()).then(d=>{
      const gws: Gateway[] = d.gateways || []
      setGateways(gws)
      if (gws.length > 0) setMethod(prev => prev || gws[0].id)
    })

  useEffect(()=>{
    if (!toolId && !bundleId && !cartMode) return

    const promises: Promise<any>[] = [
      fetch('/api/member/gateways').then(r=>r.json()),
      fetch('/api/member/shop').then(r=>r.json()),
    ]

    Promise.all(promises).then(([gwData, shopData])=>{
      const gws: Gateway[] = gwData.gateways || []
      setGateways(gws)
      if (gws.length > 0) setMethod(gws[0].id)

      const s:any={}
      shopData.settings && Object.entries(shopData.settings).forEach(([k,v]:any)=>{ s[k]=v })
      setSettings(s)

      if (cartMode) {
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('pk_cart') : null
          const local: CartLocalItem[] = raw ? JSON.parse(raw) : []
          const allTools: Tool[] = shopData.tools || []
          const merged = local.map((item: CartLocalItem) => {
            const found = allTools.find((x:Tool) => x.id === item.tool_id)
            return { ...item, shop_tools: found ? { ...found } : item.shop_tools }
          }).filter((item: CartLocalItem) => item.shop_tools?.id)
          setCartItems(merged)
        } catch {}
      } else if (toolId) {
        const foundTool = shopData.tools?.find((x:any)=>x.id===toolId)
        if (foundTool) setTool(foundTool)
        fetch('/api/member/purchases').then(r=>r.json()).then(pd=>{
          const existing = (pd.purchases||[]).find((p:any)=>p.tool_id===toolId)
          if (existing) setExistingPurchase(existing)
        })
      } else if (bundleId) {
        fetch('/api/member/bundles').then(r=>r.json()).then(bundleData=>{
          const found = (bundleData.bundles||[]).find((b:any)=>b.id===bundleId)
          if (found) setBundle(found)
        })
      }
      setLoading(false)
    }).catch(()=>setLoading(false))

    const channel = supabase
      .channel('checkout-gateways')
      .on('postgres_changes', { event:'*', schema:'public', table:'payment_gateways' }, ()=>{ fetchGateways() })
      .subscribe()

    return ()=>{
      supabase.removeChannel(channel)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  },[toolId, bundleId, cartMode])

  const cfg          = gateways.find(g=>g.id===method)
  const isEgp        = cfg?.currency==='EGP'
  const exchangeRate = parseFloat(settings.usd_to_egp_rate||'50')
  const isBundle     = !!bundleId && !!bundle
  const cartTotal    = cartItems.reduce((s, i) => s + ((i.shop_tools as any)?.price_egp || 0) * (i.quantity || 1), 0)

  const basePrice = ()=> cartMode ? cartTotal : isBundle ? (bundle?.price_egp||0) : (tool?.price_egp||0)
  const finalPriceEgp = ()=>{
    let p = basePrice()
    if (!isBundle && couponResult?.valid && couponResult.type==='discount') p=p*(1-couponResult.value/100)
    return Math.round(p)
  }
  const amountForGateway = ()=> isEgp ? finalPriceEgp() : Math.round(finalPriceEgp()/exchangeRate*100)/100
  const displayTotal = ()=> isEgp ? `${finalPriceEgp().toLocaleString()} EGP` : `$${amountForGateway().toFixed(2)} USDT`

  const applyCoupon = async()=>{
    if (!coupon.trim()) return
    const res  = await fetch('/api/member/coupon',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ code:coupon, tool_id: toolId || null }) })
    const data = await res.json()
    if (!data.valid){ setCouponResult({ error:t('Invalid coupon code','كود خصم غير صالح') }); return }
    setCouponResult(data)
  }

  const copyUid = ()=>{
    if (cfg?.uid){ navigator.clipboard.writeText(cfg.uid); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  }

  const startPolling = (pid:string)=>{
    setPolling(true)
    pollRef.current = setInterval(async()=>{
      try{
        const res  = await fetch('/api/member/payment/verify',{
          method:'POST',
          credentials:'include',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ edge_fn:'verify-easykash', payment_id:pid })
        })
        const data = await res.json()
        if (data.verified){
          clearInterval(pollRef.current!); setPolling(false)
          if (bundleId) {
            await fetch('/api/member/payment/activate-bundle',{
              method:'POST', credentials:'include',
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ payment_id:pid, bundle_id:bundleId })
            })
          }
          setStep('done')
        }
      }catch{}
    }, 5000)
    setTimeout(()=>{ clearInterval(pollRef.current!); setPolling(false) }, 600000)
  }

  const verify = async()=>{
    if (!cfg) return
    if (!isBundle && !tool) return
    setVerifying(true); setError('')
    try{
      const createRes = await fetch('/api/member/payment/create',{
        method:'POST',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          gateway:   method,
          amount:    amountForGateway(),
          currency:  cfg.currency,
          credits:   finalPriceEgp(),
          tool_id:   cartMode ? null : (toolId || null),
          bundle_id: bundleId || null,
        })
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error||t('Failed to create payment','فشل إنشاء الدفع'))
      const pid = createData.payment_id
      paymentIdRef.current = pid

      if (cfg.is_dynamic){
        const linkRes = await fetch('/api/member/payment/verify',{
          method:'POST',
          credentials:'include',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ edge_fn:'create-easykash-link', payment_id:pid, amount:amountForGateway() })
        })
        const linkData = await linkRes.json()
        if (!linkData.success||!linkData.payUrl) throw new Error(linkData.error||t('Failed to create payment link','فشل إنشاء رابط الدفع'))
        setEasykashUrl(linkData.payUrl)
        window.open(linkData.payUrl,'_blank','noopener')
        startPolling(pid)
        setVerifying(false); return
      }

      if (!txRef.trim()){ setError(t('Please enter transaction ID','من فضلك ادخل رقم العملية')); setVerifying(false); return }

      if (!cfg.edge_fn||!cfg.payload_key){
        await fetch('/api/member/payment/manual',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ payment_id:pid, ref:txRef }) })
        setStep('done'); setVerifying(false); return
      }

      const verRes = await fetch('/api/member/payment/verify',{
        method:'POST',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ edge_fn:cfg.edge_fn, payment_id:pid, [cfg.payload_key!]:txRef })
      })
      const verData = await verRes.json()
      if (!verRes.ok||!verData.success) throw new Error(verData.error||t('Verification failed','فشل التحقق'))

      if (verData.verified){
        // Auto-activate bundle tools after payment verified by edge function
        if (isBundle) {
          await fetch('/api/member/payment/activate-bundle',{
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ payment_id:pid, bundle_id:bundleId })
          })
        }
        setStep('done')
      } else {
        const reasons:Record<string,string> = {
          tx_not_found:t('Transaction not found. Check the ID.','لم يتم العثور على العملية، تأكد من الرقم.'),
          wrong_amount:t(`Paid amount (${verData.paid?.toFixed(2)}) is less than required.`,`المبلغ المدفوع (${verData.paid?.toFixed(2)}) أقل من المطلوب.`),
          not_paid:t('Transaction not completed yet, try again.','العملية لم تكتمل بعد، انتظر وحاول مرة أخرى.'),
          not_found:t('Reference not found in our records.','الرقم المرجعي مش موجود في سجلاتنا.'),
          already_used:t('This reference was already used.','الرقم ده اتستخدم قبل كده.'),
        }
        setError(reasons[verData.reason]||t('Verification failed, try again.','التحقق فشل، جرب مرة أخرى.'))
      }
    }catch(e:any){ setError(e.message||t('An error occurred, try again.','حصل خطأ، جرب مرة أخرى.')) }
    setVerifying(false)
  }

  const waNum = (siteSettings.whatsapp_number || settings.whatsapp_number || '+201068488474').replace(/\D/g,'')
  const wa = `https://wa.me/${waNum}?text=${encodeURIComponent(`طلب جديد: ${tool?.name} — وسيلة: ${method} — مرجع: ${txRef||'N/A'}`)}`

  if (loading) return <div className="flex justify-center items-center py-32"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/></div>
  if (!cartMode && !isBundle && !tool) return <div className="text-center py-32 text-gray-400 text-lg">{t('Tool not found','الأداة غير موجودة')}</div>
  if (!cartMode && isBundle && !bundle) return <div className="text-center py-32 text-gray-400 text-lg">{t('Bundle not found','الباقة غير موجودة')}</div>
  if (cartMode && cartItems.length === 0) return <div className="text-center py-32 text-gray-400 text-lg">{t('Your cart is empty','السلة فارغة')}</div>

  // ── Duplicate purchase blocker — skip for private tools (can repurchase freely) ──
  if (existingPurchase && tool?.category_slug !== 'private') {
    const daysLeft = existingPurchase.expires_at
      ? Math.ceil((new Date(existingPurchase.expires_at).getTime()-Date.now())/86400000)
      : null
    return (
      <div dir={dir} className="p-4 md:p-8 max-w-lg mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-8 text-center shadow-sm w-full">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
            {tool?.image_url
              ? <img src={tool.image_url} alt={tool!.name} className="w-10 h-10 object-contain"/>
              : <span className="text-2xl font-bold text-amber-400">{tool?.name.slice(0,2).toUpperCase()}</span>
            }
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {lang==='ar' ? 'لديك اشتراك نشط بالفعل!' : 'You already have an active subscription!'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {lang==='ar' ? `${tool?.name} — ` : `${tool?.name} — `}
            {daysLeft !== null
              ? (lang==='ar' ? `ينتهي بعد ${daysLeft} يوم` : `expires in ${daysLeft} day${daysLeft===1?'':'s'}`)
              : (lang==='ar' ? 'مدى الحياة' : 'Lifetime')
            }
          </p>
          <p className="text-xs text-gray-400 mb-7">
            {lang==='ar'
              ? 'الشراء مرة ثانية لن يمدد اشتراكك. استخدم التمديد بدلاً من ذلك.'
              : 'Buying again won\'t extend your subscription. Use renewal instead.'}
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={()=>router.push(`/u/subscription/${existingPurchase.id}`)}
              className="w-full py-3.5 rounded-xl text-white text-sm font-bold transition-colors" style={{background:'#d99401'}}>
              {lang==='ar' ? 'عرض اشتراكي الحالي ←' : 'View My Subscription ←'}
            </button>
            <button onClick={()=>router.push('/u/store')}
              className="w-full py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {lang==='ar' ? 'تصفح أدوات أخرى' : 'Browse Other Tools'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div dir={dir} style={{fontFamily:lang==='ar'?"'Cairo', sans-serif":"'Inter', system-ui, sans-serif"}} className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">

      {/* Steps header */}
      <div className="px-6 md:px-10 pt-6 pb-0">
      <div className="flex items-center gap-2 mb-8 max-w-5xl">
        {(['details','payment','done'] as const).map((s,i)=>{
          const labels=[t('Order Details','تفاصيل الطلب'),t('Payment','الدفع'),t('Done','تم')]
          const done  = ['details','payment','done'].indexOf(step)>i
          const active= step===s
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 px-2 py-2 md:px-4 rounded-xl text-xs md:text-sm font-bold transition-all ${done?'bg-emerald-500 text-white':active?'text-white':'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`} style={active&&!done?{background:'#d99401'}:{}}>
                {done?<Check size={13}/>:<span className="w-4 text-center text-xs">{i+1}</span>}
                <span className="hidden sm:inline">{labels[i]}</span>
              </div>
              {i<2 && <div className={`flex-1 h-0.5 rounded ${done?'bg-emerald-400':'bg-gray-200 dark:bg-gray-700'}`}/>}
            </div>
          )
        })}
      </div>
      </div>

      {/* Main content — full width, two-col on large screens */}
      <div className="flex-1 px-6 md:px-10 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8 items-start">
        <div className="flex flex-col gap-6">

          {/* Step 1: Details */}
          {step==='details' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">{t('Order Details','تفاصيل الطلب')}</h2>

              {/* Cart mode: multiple tools */}
              {cartMode && (
                <div className="mb-5">
                  <div className="flex flex-col gap-2 mb-4">
                    {cartItems.map(item => {
                      const t2 = item.shop_tools as any
                      return (
                        <div key={item.tool_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {t2?.image_url ? <img src={t2.image_url} alt={t2.name} className="w-full h-full object-contain"/> : <span className="text-xs font-bold text-gray-400">{t2?.name?.slice(0,2).toUpperCase()}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{t2?.name || '—'}</div>
                            <div className="text-xs text-gray-400">{t2?.duration_label}</div>
                          </div>
                          {item.quantity > 1 && <span className="text-xs text-gray-400">×{item.quantity}</span>}
                          <div className="text-sm font-bold" style={{color:'#d99401'}}>{((t2?.price_egp||0)*(item.quantity||1)).toLocaleString()} EGP</div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-col gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {couponResult?.valid && (
                      <div className="flex justify-between text-sm text-emerald-500">
                        <span>{t('Discount','خصم')} ({couponResult.value}%)</span>
                        <span dir="ltr">-{formatPrice(cartTotal*couponResult.value/100, exchangeRate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                      <span>{t('Total','الإجمالي')}</span>
                      <span dir="ltr" style={{color:'#d99401'}}>{formatPrice(finalPriceEgp(), exchangeRate)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 mb-2">
                    <input value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} placeholder={t('Coupon code (optional)','كود الخصم (اختياري)')}
                      className="flex-1 px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#d99401]"/>
                    <button onClick={applyCoupon} className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors">{t('Apply','تطبيق')}</button>
                  </div>
                  {couponResult?.error && <p className="text-sm text-red-400 mt-1">{couponResult.error}</p>}
                  {couponResult?.valid && <p className="text-sm text-emerald-500 mt-1">{t(`✓ ${couponResult.value}% off applied`,`✓ تم تطبيق خصم ${couponResult.value}%`)}</p>}
                </div>
              )}

              {/* Bundle header */}
              {isBundle && bundle && (
                <div className="mb-5">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0 text-black font-bold text-lg">📦</div>
                    <div className="flex-1">
                      <div className="text-base font-bold text-gray-900 dark:text-white">{lang==='ar'&&bundle.name_ar ? bundle.name_ar : bundle.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{bundle.duration_days} {lang==='ar'?'يوم':'days'}</div>
                    </div>
                    <div className="text-lg font-bold" style={{color:'#d99401'}}>{bundle.price_egp.toLocaleString()} EGP</div>
                  </div>
                  {bundle.included_tools?.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-1">
                      {bundle.included_tools.map(tool=>(
                        <div key={tool.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {tool.image_url ? <img src={tool.image_url} className="w-4 h-4 rounded object-contain" alt=""/> : null}
                          {tool.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <span>{t('Total','الإجمالي')}</span>
                    <span dir="ltr" style={{color:'#d99401'}}>{formatPrice(bundle.price_egp, exchangeRate)}</span>
                  </div>
                </div>
              )}

              {/* Single tool header */}
              {!isBundle && tool && (<>
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-5">
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {tool.image_url?<img src={tool.image_url} alt={tool.name} className="w-full h-full object-contain"/>:<span className="text-lg font-bold text-gray-400">{tool.name.slice(0,2).toUpperCase()}</span>}
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold text-gray-900 dark:text-white">{tool.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tool.duration_label}</div>
                </div>
                <div className="text-lg font-bold" style={{color:'#d99401'}}>{tool.price_egp.toLocaleString()} EGP</div>
              </div>
              <div className="flex flex-col gap-2 mb-5">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>{t('Original Price','السعر الأصلي')}</span><span dir="ltr">{formatPrice(tool.price_egp, exchangeRate)}</span></div>
                {couponResult?.valid && <div className="flex justify-between text-sm text-emerald-500"><span>{t('Discount','خصم')} ({couponResult.value}%)</span><span dir="ltr">-{formatPrice(tool.price_egp*couponResult.value/100, exchangeRate)}</span></div>}
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>{t('Total','الإجمالي')}</span><span dir="ltr" style={{color:'#d99401'}}>{formatPrice(finalPriceEgp(), exchangeRate)}</span>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <input value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} placeholder={t('Coupon code (optional)','كود الخصم (اختياري)')}
                  className="flex-1 px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#d99401]"/>
                <button onClick={applyCoupon} className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors">{t('Apply','تطبيق')}</button>
              </div>
              {couponResult?.error && <p className="text-sm text-red-400 mt-1 mb-3">{couponResult.error}</p>}
              {couponResult?.valid && <p className="text-sm text-emerald-500 mt-1 mb-3">{t(`✓ Coupon applied — ${couponResult.value}% off`,`✓ تم تطبيق الكود — خصم ${couponResult.value}%`)}</p>}
              </>)}

              <button onClick={async()=>{
                const isFree = couponResult?.valid && couponResult.type==='discount' && Number(couponResult.value)>=100
                if (isFree) {
                  setVerifying(true); setError('')
                  try {
                    const res = await fetch('/api/member/payment/free',{
                      method:'POST', credentials:'include',
                      headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({ tool_id:toolId, duration_days:tool?.duration_days, coupon_code:coupon })
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error||t('Activation failed','فشل التفعيل'))
                    setStep('done')
                  } catch(e:any){ setError(e.message) }
                  setVerifying(false)
                } else {
                  setStep('payment')
                }
              }} disabled={verifying} className="w-full py-4 rounded-xl disabled:opacity-60 text-white text-base font-bold transition-colors mt-4 flex items-center justify-center gap-2" style={{background:'#d99401'}}>
                {verifying ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>{t('Activating...','جاري التفعيل...')}</> : t('Continue to Payment →','متابعة للدفع ←')}
              </button>
            </div>
          )}


          {/* Step 2: Payment */}
          {step==='payment' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('Choose Payment Method','اختر وسيلة الدفع')}</h2>

              {gateways.length===0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">{t('No payment methods available','لا توجد وسائل دفع متاحة حالياً')}</div>
              ) : (
                {(['USD','EGP'] as const).map(cur => {
                  const group = gateways.filter(gw => gw.currency === cur)
                  if (!group.length) return null
                  return (
                    <div key={cur} className="mb-6">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-3 ${cur==='EGP'?'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400':'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                        {cur==='USD'?'💵':'🇪🇬'} {cur}
                      </div>
                      <div className={`grid gap-4 ${group.length<=3?'grid-cols-3':'grid-cols-4'}`}>
                        {group.map(gw=>(
                          <button key={gw.id} onClick={()=>{ setMethod(gw.id); setTxRef(''); setError('') }}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${method===gw.id?'border-[#d99401] bg-[#d9940108]':'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'}`}>
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-sm">
                              {gw.logo_url?<img src={gw.logo_url} alt={gw.name_ar} className="w-full h-full object-contain"/>:<span className="text-3xl">{FALLBACK_ICONS[gw.id]||'💳'}</span>}
                            </div>
                            <span className={`text-sm font-bold text-center ${method===gw.id?'text-[#d99401]':'text-gray-700 dark:text-gray-200'}`}>{lang==='ar'?gw.name_ar:gw.name_en}</span>
                            {method===gw.id && <Check size={15} style={{color:'#d99401'}}/>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              )}

              {cfg && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                  {cfg.uid && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{lang==='ar'?(cfg.uid_label_ar||'العنوان'):(cfg.uid_label_en||'Address')}</div>
                      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
                        <span className="text-base font-bold text-gray-900 dark:text-white flex-1 break-all" dir="ltr">{cfg.uid}</span>
                        <button onClick={copyUid} className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                          {copied?<Check size={15} className="text-emerald-500"/>:<Copy size={15} className="text-gray-500 dark:text-gray-400"/>}
                        </button>
                      </div>
                    </div>
                  )}
                  {cfg.qr_url && (
                    <div className="flex justify-center mb-4">
                      <div className="bg-white p-2 rounded-xl border border-gray-200">
                        <img src={cfg.qr_url} alt="QR Code" className="w-40 h-40 object-contain"/>
                      </div>
                    </div>
                  )}
                  {cfg.instructions_ar && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4" dir={dir}>{lang==='ar'?cfg.instructions_ar:cfg.instructions_en}</p>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('Amount Due','المبلغ المطلوب')}</span>
                    <span className="text-xl font-bold" style={{color:'#d99401'}}>{displayTotal()}</span>
                  </div>
                </div>
              )}

              {cfg?.is_dynamic && polling && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-4 mb-5 flex items-center gap-3">
                  <Loader2 size={18} className="text-blue-500 animate-spin flex-shrink-0"/>
                  <div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{t('Waiting for payment confirmation...','جاري انتظار تأكيد الدفع...')}</div>
                    <div className="text-xs text-blue-500 mt-0.5">{t('We\'ll confirm automatically after payment on EasyKash','بعد الدفع على صفحة EasyKash هنأكد تلقائياً')}</div>
                  </div>
                  {easykashUrl && <a href={easykashUrl} target="_blank" className="ms-auto text-xs text-blue-500 underline flex-shrink-0">{t('Open link again','فتح الرابط مرة أخرى')}</a>}
                </div>
              )}

              {cfg && !cfg.is_dynamic && (
                <div className="mb-5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">{lang==='ar'?(cfg.input_label_ar||'رقم العملية'):(cfg.input_label_en||'Transaction ID (Order ID)')}</label>
                  <input value={txRef} onChange={e=>setTxRef(e.target.value)}
                    placeholder={lang==='ar'?(cfg.input_placeholder_ar||'الصق رقم العملية هنا...'):(cfg.input_placeholder_en||'Paste transaction ID here...')}
                    dir="ltr"
                    className="w-full px-4 py-4 text-base rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-[#d99401] transition-colors"/>
                  <p className="text-xs text-gray-400 mt-1.5">{t('After transfer, paste the reference or Transaction ID here','بعد التحويل، الصق الرقم المرجعي أو Transaction ID هنا')}</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-4 py-3 mb-5">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5"/>
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-5">
                <span className="text-2xl">💬</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('Need help?','محتاج مساعدة؟')}{' '}<a href={wa} target="_blank" className="text-green-500 font-bold">{t('Contact us on WhatsApp','تواصل معنا على WhatsApp')}</a></p>
              </div>

              <div className="flex gap-3">
                <button onClick={()=>setStep('details')} className="flex-1 py-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{t('← Back','← رجوع')}</button>
                {cfg?.is_dynamic && !polling ? (
                  <button onClick={verify} disabled={verifying}
                    className="flex-[2] py-4 rounded-xl text-white text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors" style={{background:'#d99401'}}>
                    {verifying?<Loader2 size={16} className="animate-spin"/>:<>💳 {t('Pay Now','ادفع الآن')}</>}
                  </button>
                ) : cfg?.is_dynamic && polling ? (
                  <button disabled className="flex-[2] py-4 rounded-xl bg-blue-500 text-white text-base font-bold opacity-70 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin"/> {t('Verifying...','جاري التحقق...')}
                  </button>
                ) : (
                  <button onClick={verify} disabled={verifying||(!cfg?.is_dynamic&&!txRef.trim())}
                    className="flex-[2] py-4 rounded-xl text-white text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors" style={{background:'#d99401'}}>
                    {verifying?<Loader2 size={16} className="animate-spin"/>:<><Check size={16}/>{t('Verify & Complete','تحقق وأكمل')}</>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Done */}
          {step==='done' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center shadow-sm">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <Check size={36} className="text-emerald-500"/>
              </div>
              {cartMode ? (<>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('Order Received! 🛒','تم استلام طلبك! 🛒')}</h2>
                <p className="text-base text-gray-500 dark:text-gray-400 mb-2">{t('Your cart order is pending admin confirmation.','طلبك في انتظار تأكيد الأدمن.')}</p>
                <p className="text-sm text-gray-400 mb-8">{t("You'll receive a notification once your tools are activated.",'هتوصلك إشعار لما الأدوات تتفعل.')}</p>
              </>) : isBundle ? (<>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('Order Received! 📦','تم استلام طلبك! 📦')}</h2>
                <p className="text-base text-gray-500 dark:text-gray-400 mb-2">{t('Your bundle order is pending admin confirmation.','طلب الباقة بانتظار تأكيد الأدمن.')}</p>
                <p className="text-sm text-gray-400 mb-8">{t("You'll receive a notification once your bundle is activated.",'هتوصلك إشعار لما الباقة تتفعل.')}</p>
              </>) : (<>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('Payment Confirmed! 🎉','تم تأكيد الدفع! 🎉')}</h2>
                <p className="text-base text-gray-500 dark:text-gray-400 mb-2">{t('Subscription added to your account.','تم إضافة الاشتراك لحسابك بنجاح.')}</p>
                <p className="text-sm text-gray-400 mb-8">{t('You can start using it now from the dashboard.','تقدر تبدأ الاستخدام فوراً من لوحة التحكم.')}</p>
              </>)}
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button onClick={()=>router.push('/u/dashboard')} className="py-4 rounded-xl text-white text-base font-bold transition-colors" style={{background:'#d99401'}}>
                  {t('Go to Dashboard 🚀','الذهاب للوحة التحكم 🚀')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-6 sticky top-6" style={{
            background:'rgba(255,255,255,0.88)',
            backdropFilter:'blur(24px)',
            WebkitBackdropFilter:'blur(24px)',
            border:'1px solid rgba(255,255,255,0.65)',
            boxShadow:'0 16px 48px rgba(0,0,0,0.1)',
          }}>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">{t('Order Summary','ملخص الطلب')}</h3>

            {/* Cart mode: list all items */}
            {cartMode ? (
              <div className="flex flex-col gap-2 mb-4">
                {cartItems.map(item => {
                  const t2 = item.shop_tools as any
                  return (
                    <div key={item.tool_id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {t2?.image_url ? <img src={t2.image_url} alt={t2.name} className="w-full h-full object-contain"/> : <span className="text-[10px] font-bold text-gray-400">{t2?.name?.slice(0,2).toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{t2?.name || '—'}</div>
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300" dir="ltr">{((t2?.price_egp||0)*(item.quantity||1)).toLocaleString()} EGP</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {isBundle
                    ? <span className="text-xl">📦</span>
                    : tool?.image_url
                      ? <img src={tool.image_url} alt={tool.name} className="w-full h-full object-contain"/>
                      : <span className="text-sm font-bold text-gray-400">{tool?.name.slice(0,2).toUpperCase()}</span>
                  }
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {isBundle ? (lang==='ar'&&bundle?.name_ar ? bundle.name_ar : bundle?.name) : tool?.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {isBundle
                      ? `${bundle?.duration_days} ${lang==='ar'?'يوم':'days'} · ${bundle?.included_tools?.length||0} ${lang==='ar'?'أدوات':'tools'}`
                      : lang==='ar'
                        ? tool?.duration_label.replace('Days','يوم').replace('Day','يوم').replace('Month','شهر').replace('Months','شهر')
                        : tool?.duration_label
                    }
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col gap-2">
              {!cartMode && <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>{t('Price','السعر')}</span><span dir="ltr">{formatPrice(basePrice(), exchangeRate)}</span></div>}
              {!isBundle && couponResult?.valid && <div className="flex justify-between text-sm text-emerald-500"><span>{t('Discount','خصم')} ({couponResult.value}%)</span><span dir="ltr">-{formatPrice(basePrice()*couponResult.value/100, exchangeRate)}</span></div>}
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white mt-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                <span>{t('Total','الإجمالي')}</span><span dir="ltr" style={{color:'#d99401'}}>{formatPrice(finalPriceEgp(), exchangeRate)}</span>
              </div>
              {cfg && (
                <div className="flex justify-between text-sm mt-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400">{t(`Amount (${cfg.currency})`,`المبلغ (${cfg.currency})`)}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{displayTotal()}</span>
                </div>
              )}
            </div>
          </div>
          <a href={wa} target="_blank" className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
            <MessageCircle size={22} className="text-green-500 flex-shrink-0"/>
            <div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400">{t('Need help?','محتاج مساعدة؟')}</div>
              <div className="text-xs text-green-500 mt-0.5">{t('Chat with us on WhatsApp','تكلم معنا على WhatsApp')}</div>
            </div>
          </a>
        </div>
      </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-32" ><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/></div>}>
      <CheckoutInner/>
    </Suspense>
  )
}
