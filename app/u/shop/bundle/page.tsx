'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { Check, Zap, Package, Crown, MessageCircle } from 'lucide-react'

interface IncludedTool { id: string; name: string; image_url?: string; description?: string; category_slug: string }
interface Bundle {
  id: string; name: string; name_ar?: string; slug: string
  price_egp: number; duration_days: number; description?: string
  features: string[]; badge?: string; highlight?: boolean; image_url?: string
  included_tools: IncludedTool[]
}

export default function BundlePage() {
  const { lang, formatPrice } = useLang()
  const settings = useSiteSettings()
  const isRtl = lang === 'ar'
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    fetch('/api/member/bundles').then(r=>r.json()).then(d=>{
      setBundles(d.bundles || [])
      setLoading(false)
    })
  },[])

  const rate  = parseFloat(settings.usd_to_egp_rate) || 50
  const price = (egp: number) => formatPrice(egp, rate)
  const buy   = (bundle: Bundle) => { window.location.href = `/u/checkout?bundle_id=${bundle.id}` }

  const featured = bundles.find(b => b.highlight)
  const others   = bundles.filter(b => !b.highlight)

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto" dir={isRtl?'rtl':'ltr'}>

      {/* Banner */}
      <div className="rounded-2xl mb-6 p-5 md:p-8" style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
              style={{border:'1px solid #f59e0b50',background:'#f59e0b18'}}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                {isRtl?'حزم مميزة':'Premium Bundles'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              {isRtl?'اختار ':'Choose Your '}<span style={{color:'#d99401'}}>{isRtl?'حزمتك المثالية':'Perfect Bundle'}</span>
            </h1>
            <p className="text-sm text-gray-300">
              {isRtl
                ? 'حزم مجمّعة من أفضل الأدوات المشتركة بسعر أقل من شرائها منفردة'
                : 'Curated bundles of top tools at a fraction of individual prices'}
            </p>
          </div>
          <a href={`https://wa.me/${(settings.whatsapp_number||'').replace(/\D/g,'')}`} target="_blank"
            className="bg-green-500/20 border border-green-500/30 rounded-xl px-5 py-3 flex items-center gap-3 hover:bg-green-500/30 transition-colors flex-shrink-0">
            <MessageCircle size={20} className="text-green-400"/>
            <div className="text-end">
              <p className="text-xs text-gray-400">{isRtl?'دعم واتساب':'WhatsApp Support'}</p>
              <p className="text-sm font-bold text-white" dir="ltr">{settings.whatsapp_number||'+20 100 000 0000'}</p>
            </div>
          </a>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
        </div>
      )}

      {!loading && bundles.length === 0 && (
        <div className="text-center py-24 text-gray-400">
          <Package size={48} className="mx-auto mb-4 opacity-20"/>
          <p className="text-sm">{isRtl?'لا توجد حزم متاحة حالياً':'No bundles available yet'}</p>
        </div>
      )}

      {!loading && bundles.length > 0 && (
        <div className="space-y-8">

          {/* Featured bundle */}
          {featured && (
            <div className="relative rounded-3xl overflow-hidden"
              style={{background:'linear-gradient(135deg,#1a1200 0%,#2a1f00 50%,#111827 100%)',border:'1.5px solid #d9940140'}}>
              <div className="absolute inset-0 pointer-events-none" style={{boxShadow:'inset 0 0 80px #d9940112'}}/>
              <div className="absolute top-4 end-4 z-10">
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-black"
                  style={{background:'linear-gradient(90deg,#d99401,#f59e0b)'}}>
                  ⭐ {featured.badge || (isRtl?'الأكثر شعبية':'Most Popular')}
                </span>
              </div>
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 bg-white/5 flex items-center justify-center">
                      {featured.image_url
                        ? <img src={featured.image_url} className="w-full h-full object-cover" alt=""/>
                        : <Package size={22} className="text-yellow-400"/>}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white leading-tight">
                        {isRtl && featured.name_ar ? featured.name_ar : featured.name}
                      </h2>
                      {featured.description && <p className="text-sm text-gray-400 mt-0.5">{featured.description}</p>}
                    </div>
                  </div>
                  {featured.features?.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                      {featured.features.map((f,i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{background:'#d9940125',color:'#d99401'}}>
                            <Check size={10} strokeWidth={3}/>
                          </span>{f}
                        </div>
                      ))}
                    </div>
                  )}
                  {featured.included_tools?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2.5">
                        {isRtl?'الأدوات المضمّنة':'Included Tools'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {featured.included_tools.map(tool => (
                          <div key={tool.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                            style={{background:'#ffffff0d',border:'1px solid #ffffff15',color:'#e5e7eb'}}>
                            {tool.image_url
                              ? <img src={tool.image_url} className="w-4 h-4 rounded object-contain" alt=""/>
                              : <span className="text-[10px] font-bold opacity-40">{tool.name.slice(0,2)}</span>}
                            {tool.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center gap-4 md:min-w-[200px] md:border-s md:border-white/10 md:ps-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-0.5">{price(featured.price_egp)}</div>
                    <div className="text-sm text-gray-400">/ {featured.duration_days} {isRtl?'يوم':'days'}</div>
                  </div>
                  <button onClick={()=>buy(featured)}
                    className="w-full md:w-auto px-8 py-3.5 rounded-2xl text-black font-bold text-sm hover:opacity-90 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    style={{background:'linear-gradient(90deg,#d99401,#f59e0b)',boxShadow:'0 8px 24px #d9940135'}}>
                    <Zap size={15} fill="black"/>{isRtl?'اشتري الآن':'Buy Now'}
                  </button>
                  <p className="text-[11px] text-gray-600 text-center">
                    {isRtl?'تفعيل فوري · دعم 24/7':'Instant activation · 24/7 support'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Other bundles */}
          {others.length > 0 && (
            <div className={`grid gap-5 ${others.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {others.map(bundle => (
                <div key={bundle.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-200 relative">
                  {bundle.badge && (
                    <div className="absolute top-3 end-3 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{background:'#d9940120',color:'#d99401',border:'1px solid #d9940140'}}>
                        {bundle.badge}
                      </span>
                    </div>
                  )}
                  <div className="h-1" style={{background:'linear-gradient(90deg,#d99401,#f59e0b)'}}/>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        {bundle.image_url
                          ? <img src={bundle.image_url} className="w-full h-full object-cover" alt=""/>
                          : <Package size={20} className="text-gray-300"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight pe-8">
                          {isRtl && bundle.name_ar ? bundle.name_ar : bundle.name}
                        </h3>
                        {bundle.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{bundle.description}</p>}
                      </div>
                    </div>
                    {bundle.included_tools?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                          {isRtl?'يشمل':'Includes'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {bundle.included_tools.map(tool => (
                            <div key={tool.id}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                              {tool.image_url
                                ? <img src={tool.image_url} className="w-3.5 h-3.5 rounded object-contain" alt=""/>
                                : <span className="text-[9px] font-bold text-gray-300">{tool.name.slice(0,2)}</span>}
                              {tool.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {bundle.features?.length > 0 && (
                      <div className="space-y-1.5 mb-4 flex-1">
                        {bundle.features.map((f,i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Check size={12} className="flex-shrink-0 mt-0.5" style={{color:'#d99401'}}/>
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{price(bundle.price_egp)}</span>
                          <span className="text-xs text-gray-400 ms-1.5">/ {bundle.duration_days} {isRtl?'يوم':'days'}</span>
                        </div>
                      </div>
                      <button onClick={()=>buy(bundle)}
                        className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                        style={{background:'#d99401',boxShadow:'0 4px 14px #d9940130'}}>
                        <Zap size={14} fill="white"/>{isRtl?'اشتري الحزمة':'Get Bundle'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
