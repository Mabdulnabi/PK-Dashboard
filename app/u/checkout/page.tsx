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

interface Tool { id:string; name:string; description:string; price_egp:number; price_usd?:number; duration_label:string; duration_days:number; image_url?:string }
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

function CheckoutInner() {
  const { t, lang, formatPrice, dir } = useLang()
  const siteSettings = useSiteSettings()
  const params  = useSearchParams()
  const router  = useRouter()
  const toolId  = params.get('tool_id')

  const [tool,         setTool]         = useState<Tool|null>(null)
  const [settings,     setSettings]     = useState<Settings>({ whatsapp_number:'', usd_to_egp_rate:'50' })
  const [gateways,     setGateways]     = useState<Gateway[]>([])
  const [loading,      setLoading]      = useState(true)
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
  const pollRef = useRef<NodeJS.Timeout|null>(null)

  const fetchGateways = () =>
    fetch('/api/member/gateways').then(r=>r.json()).then(d=>{
      const gws: Gateway[] = d.gateways || []
      setGateways(gws)
      if (gws.length > 0) setMethod(prev => prev || gws[0].id)
    })

  useEffect(()=>{
    if (!toolId) return

    Promise.all([
      fetch('/api/member/shop').then(r=>r.json()),
      fetch('/api/member/gateways').then(r=>r.json()),
    ]).then(([shopData, gwData])=>{
      const t = shopData.tools?.find((x:any)=>x.id===toolId)
      if (t) setTool(t)
      const s:any={}
      shopData.settings && Object.entries(shopData.settings).forEach(([k,v]:any)=>{ s[k]=v })
      setSettings(s)
      const gws: Gateway[] = gwData.gateways || []
      setGateways(gws)
      if (gws.length > 0) setMethod(gws[0].id)
      setLoading(false)
    }).catch(()=>setLoading(false))

    // ── Realtime: re-fetch gateways on any change ──
    const channel = supabase
      .channel('checkout-gateways')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payment_gateways',
      }, ()=>{ fetchGateways() })
      .subscribe()

    return ()=>{
      supabase.removeChannel(channel)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  },[toolId])

  const cfg          = gateways.find(g=>g.id===method)
  const isEgp        = cfg?.currency==='EGP'
  const exchangeRate = parseFloat(settings.usd_to_egp_rate||'50')

  const finalPriceEgp = ()=>{
    if (!tool) return 0
    let p = tool.price_egp
    if (couponResult?.valid && couponResult.type==='discount') p=p*(1-couponResult.value/100)
    return Math.round(p)
  }
  const amountForGateway = ()=> isEgp ? finalPriceEgp() : Math.round(finalPriceEgp()/exchangeRate*100)/100
  const displayTotal = ()=> isEgp ? `${finalPriceEgp().toLocaleString()} EGP` : `$${amountForGateway().toFixed(2)} USDT`

  const applyCoupon = async()=>{
    if (!coupon.trim()) return
    const res  = await fetch('/api/member/coupon',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ code:coupon, tool_id: toolId }) })
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
        if (data.verified){ clearInterval(pollRef.current!); setPolling(false); setStep('done') }
      }catch{}
    }, 5000)
    setTimeout(()=>{ clearInterval(pollRef.current!); setPolling(false) }, 600000)
  }

  const verify = async()=>{
    if (!tool||!cfg) return
    setVerifying(true); setError('')
    try{
      const createRes = await fetch('/api/member/payment/create',{
        method:'POST',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ gateway:method, amount:amountForGateway(), currency:cfg.currency, credits:tool.price_egp, tool_id:toolId })
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error||t('Failed to create payment','فشل إنشاء الدفع'))
      const pid = createData.payment_id

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

      if (verData.verified){ setStep('done') } else {
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

  if (loading) return <div className="flex justify-center items-center py-32" ><div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>
  if (!tool)   return <div className="text-center py-32 text-gray-400 text-lg">{t('Tool not found','الأداة غير موجودة')}</div>

  return (
    <div dir={dir} style={{fontFamily:lang==='ar'?"'Cairo', sans-serif":"'Inter', system-ui, sans-serif"}} className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {(['details','payment','done'] as const).map((s,i)=>{
          const labels=[t('Order Details','تفاصيل الطلب'),t('Payment','الدفع'),t('Done','تم')]
          const done  = ['details','payment','done'].indexOf(step)>i
          const active= step===s
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${done?'bg-emerald-500 text-white':active?'bg-red-500 text-white':'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'}`}>
                {done?<Check size={15}/>:<span className="w-5 text-center">{i+1}</span>}
                <span>{labels[i]}</span>
              </div>
              {i<2 && <div className={`flex-1 h-0.5 rounded ${done?'bg-emerald-400':'bg-gray-200 dark:bg-gray-700'}`}/>}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Step 1: Details */}
          {step==='details' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">{t('Order Details','تفاصيل الطلب')}</h2>
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-5">
                <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {tool.image_url?<img src={tool.image_url} alt={tool.name} className="w-full h-full object-contain"/>:<span className="text-lg font-bold text-gray-400">{tool.name.slice(0,2).toUpperCase()}</span>}
                </div>
                <div className="flex-1">
                  <div className="text-base font-bold text-gray-900 dark:text-white">{tool.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tool.duration_label}</div>
                </div>
                <div className="text-lg font-bold text-red-500">{tool.price_egp.toLocaleString()} EGP</div>
              </div>
              <div className="flex flex-col gap-2 mb-5">
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>{t('Original Price','السعر الأصلي')}</span><span dir="ltr">{formatPrice(tool.price_egp, exchangeRate)}</span></div>
                {couponResult?.valid && <div className="flex justify-between text-sm text-emerald-500"><span>{t('Discount','خصم')} ({couponResult.value}%)</span><span dir="ltr">-{formatPrice(tool.price_egp*couponResult.value/100, exchangeRate)}</span></div>}
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>{t('Total','الإجمالي')}</span><span className="text-red-500" dir="ltr">{formatPrice(finalPriceEgp(), exchangeRate)}</span>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <input value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())} placeholder={t('Coupon code (optional)','كود الخصم (اختياري)')}
                  className="flex-1 px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-red-500"/>
                <button onClick={applyCoupon} className="px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors">{t('Apply','تطبيق')}</button>
              </div>
              {couponResult?.error && <p className="text-sm text-red-400 mt-1 mb-3">{couponResult.error}</p>}
              {couponResult?.valid && <p className="text-sm text-emerald-500 mt-1 mb-3">{t(`✓ Coupon applied — ${couponResult.value}% off`,`✓ تم تطبيق الكود — خصم ${couponResult.value}%`)}</p>}
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
              }} disabled={verifying} className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-base font-bold transition-colors mt-4 flex items-center justify-center gap-2">
                {verifying ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>{t('Activating...','جاري التفعيل...')}</> : t('Continue to Payment →','متابعة للدفع ←')}
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step==='payment' && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">{t('Choose Payment Method','اختر وسيلة الدفع')}</h2>

              {gateways.length===0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">{t('No payment methods available','لا توجد وسائل دفع متاحة حالياً')}</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {gateways.map(gw=>(
                    <button key={gw.id} onClick={()=>{ setMethod(gw.id); setTxRef(''); setError('') }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${method===gw.id?'border-red-500 bg-red-50 dark:bg-red-900/20':'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white">
                        {gw.logo_url?<img src={gw.logo_url} alt={gw.name_ar} className="w-full h-full object-contain"/>:<span className="text-2xl">{FALLBACK_ICONS[gw.id]||'💳'}</span>}
                      </div>
                      <span className={`text-sm font-bold ${method===gw.id?'text-red-500':'text-gray-700 dark:text-gray-200'}`}>{lang==='ar'?gw.name_ar:gw.name_en}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${gw.currency==='EGP'?'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400':'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'}`}>{gw.currency}</span>
                      {method===gw.id && <Check size={14} className="text-red-500"/>}
                    </button>
                  ))}
                </div>
              )}

              {cfg && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 mb-5 border border-gray-200 dark:border-gray-700">
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4" dir="rtl">{lang==='ar'?cfg.instructions_ar:cfg.instructions_en}</p>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('Amount Due','المبلغ المطلوب')}</span>
                    <span className="text-xl font-bold text-red-500">{displayTotal()}</span>
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
                  {easykashUrl && <a href={easykashUrl} target="_blank" className="mr-auto text-xs text-blue-500 underline flex-shrink-0">{t('Open link again','فتح الرابط مرة أخرى')}</a>}
                </div>
              )}

              {cfg && !cfg.is_dynamic && (
                <div className="mb-5">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">{lang==='ar'?(cfg.input_label_ar||'رقم العملية'):(cfg.input_label_en||'Transaction ID (Order ID)')}</label>
                  <input value={txRef} onChange={e=>setTxRef(e.target.value)}
                    placeholder={lang==='ar'?(cfg.input_placeholder_ar||'الصق رقم العملية هنا...'):(cfg.input_placeholder_en||'Paste transaction ID here...')}
                    dir="ltr"
                    className="w-full px-4 py-4 text-base rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-red-500 transition-colors"/>
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
                    className="flex-[2] py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                    {verifying?<Loader2 size={16} className="animate-spin"/>:<>💳 {t('Pay Now','ادفع الآن')}</>}
                  </button>
                ) : cfg?.is_dynamic && polling ? (
                  <button disabled className="flex-[2] py-4 rounded-xl bg-blue-500 text-white text-base font-bold opacity-70 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin"/> {t('Verifying...','جاري التحقق...')}
                  </button>
                ) : (
                  <button onClick={verify} disabled={verifying||(!cfg?.is_dynamic&&!txRef.trim())}
                    className="flex-[2] py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-base font-bold disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('Payment Confirmed! 🎉','تم تأكيد الدفع! 🎉')}</h2>
              <p className="text-base text-gray-500 dark:text-gray-400 mb-2">{t('Subscription added to your account.','تم إضافة الاشتراك لحسابك بنجاح.')}</p>
              <p className="text-sm text-gray-400 mb-8">{t('You can start using it now from the dashboard.','تقدر تبدأ الاستخدام فوراً من لوحة التحكم.')}</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <a href={wa} target="_blank" className="flex items-center justify-center gap-2 py-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-base font-bold transition-colors">
                  <MessageCircle size={18}/>{t('Contact on WhatsApp','تواصل على WhatsApp')}
                </a>
                <button onClick={()=>router.push('/u/dashboard')} className="py-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {t('Back to Dashboard','الرجوع للوحة التحكم')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 sticky top-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">{t('Order Summary','ملخص الطلب')}</h3>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {tool.image_url?<img src={tool.image_url} alt={tool.name} className="w-full h-full object-contain"/>:<span className="text-sm font-bold text-gray-400">{tool.name.slice(0,2).toUpperCase()}</span>}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white" dir="ltr">{tool.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{lang==='ar'?tool.duration_label.replace('Days','يوم').replace('Day','يوم').replace('Month','شهر').replace('Months','شهر'):tool.duration_label}</div>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>{t('Price','السعر')}</span><span dir="ltr">{formatPrice(tool.price_egp, exchangeRate)}</span></div>
              {couponResult?.valid && <div className="flex justify-between text-sm text-emerald-500"><span>{t('Discount','خصم')}</span><span dir="ltr">-{formatPrice(tool.price_egp*couponResult.value/100, exchangeRate)}</span></div>}
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white mt-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                <span>{t('Total','الإجمالي')}</span><span className="text-red-500" dir="ltr">{formatPrice(finalPriceEgp(), exchangeRate)}</span>
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
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-32" ><div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}>
      <CheckoutInner/>
    </Suspense>
  )
}
