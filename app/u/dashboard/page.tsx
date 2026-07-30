'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/lang-context'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { useSiteSettings } from '@/lib/use-site-settings'
import { Crown, ChevronRight, Clock, CheckCircle, Package } from 'lucide-react'

interface Purchase {
  id:string; tool_name:string; tool_image?:string
  tool_video?:string; duration_label:string
  expires_at?:string; payment_method:string; amount_egp:number
}
interface FreeTool { id:string; name:string; image_url?:string; access_url:string }

function daysLeft(expiresAt?:string) {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime()-Date.now())/86400000)
}

function StatusBadge({ days, t }:{ days:number|null; t:any }) {
  if (days===null) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">{t('Lifetime','مدى الحياة')}</span>
  if (days<=3) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-500/10 text-red-600 animate-pulse">⚠ {days} {t('d','ي')}</span>
  if (days<=7) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600">{days} {t('days','أيام')}</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><CheckCircle size={9}/> {days} {t('days','أيام')}</span>
}

export default function UserDashboard() {
  const router = useRouter()
  const settings = useSiteSettings()
  const { t, lang, dir } = useLang()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [free,      setFree]      = useState<FreeTool[]>([])
  const [loading,   setLoading]   = useState(true)

  const fetchPurchases = () => {
    fetch('/api/member/purchases').then(r=>r.ok?r.json():{purchases:[]}).then(d=>setPurchases(d.purchases||[]))
  }

  useEffect(()=>{
    Promise.all([
      fetch('/api/member/purchases').then(r=>r.ok?r.json():{purchases:[]}),
      fetch('/api/member/shop').then(r=>r.ok?r.json():{free:[]}),
    ]).then(([pData,sData])=>{
      setPurchases(pData.purchases||[])
      setFree(sData.free||[])
      setLoading(false)
    }).catch(()=>setLoading(false))

    // ── Realtime: re-fetch purchases on any change ──
    const channel = supabase
      .channel('dashboard-purchases')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tool_purchases',
      }, () => { fetchPurchases() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },[])

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-6" dir={dir}>

      {/* Active Subscriptions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            {t('My Active Subscriptions','اشتراكاتي النشطة')}
          </h2>
          {purchases.length>0 && (
            <span className="text-xs text-gray-400">{purchases.length} {t('subscription','اشتراك')}</span>
          )}
        </div>

        {purchases.length===0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Crown size={24} className="text-red-400"/>
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('Start Using Your Tools','ابدأ استخدام أدواتك الآن')}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {t('You have no active subscriptions.','ما عندكش اشتراكات نشطة حالياً.')}
            </p>
            <a href="/u/shop/shared"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
              {t('Browse Shop →','تصفح المتجر →')}
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchases.map(p=>{
              const days = daysLeft(p.expires_at)
              return (
                <div key={p.id}
                  className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-lg hover:border-red-200 dark:hover:border-red-500/30 transition-all duration-200 cursor-pointer"
                  onClick={()=>router.push(`/u/subscription/${p.id}`)}>
                  <div className="h-1 w-full bg-gradient-to-r from-red-400 to-red-600"/>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.tool_image
                          ? <img src={p.tool_image} alt={p.tool_name} className="w-9 h-9 object-contain"/>
                          : <Package size={20} className="text-gray-300"/>
                        }
                      </div>
                      <StatusBadge days={days} t={t}/>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-tight">{p.tool_name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                      <Clock size={11}/>
                      <span>
                        {p.expires_at
                          ? `${t('Expires','ينتهي')} ${new Date(p.expires_at).toLocaleDateString(lang==='ar'?'ar-EG':'en-GB')}`
                          : t('Lifetime','مدى الحياة')
                        }
                      </span>
                    </div>
                    <button className="w-full py-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:bg-red-500 group-hover:text-white group-hover:border-red-500 transition-all flex items-center justify-center gap-1.5">
                      {t('View Details','عرض التفاصيل')} <ChevronRight size={13} className={lang==='ar'?'rotate-180':''}/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Free Tools */}
      {free.length>0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-4">
            {t('Free Tools','أدوات مجانية')}
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {free.map(tool=>(
                <a key={tool.id} href={tool.access_url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all group">
                  {tool.image_url
                    ? <img src={tool.image_url} alt={tool.name} className="h-10 w-auto object-contain"/>
                    : <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">{tool.name.slice(0,2).toUpperCase()}</div>
                  }
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight">{tool.name}</span>
                  <span className="text-[10px] text-red-500 font-bold group-hover:underline">{t('Free Access →','دخول مجاني →')}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
