'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'
import { Play, Link as LinkIcon, Star } from 'lucide-react'

export default function TutorialsPage() {
  const settings = useSiteSettings()
  const { t, lang, dir } = useLang()
  const [videos,  setVideos]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<string|null>(null)

  useEffect(()=>{
    fetch('/api/member/shop').then(r=>r.json()).then(d=>{
      setVideos(d.videos||[])
      setLoading(false)
    })
  },[])

  const badgeColor:any={'MUST WATCH':'#EF4444','BEST SELLER':'#10B981','PRO SELECTION':'#8B5CF6'}

  return (
    <div className="p-6" dir={dir}>
      {/* Banner */}
      <div className="rounded-2xl mb-6 p-8" style={{background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'}}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"/>
          <span className="text-sm font-semibold text-red-400 uppercase tracking-wide">{t('Learning Hub','مركز التعلم')}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white mb-2">
              {t('Guide Videos & ','فيديوهات وأدلة ')}<span className="text-red-400">{t('User Manuals','الاستخدام')}</span>
            </h1>
            <p className="text-sm text-gray-300 max-w-lg">
              {t('Watch our step-by-step video guides to safely access your premium accounts.','شاهد أدلة الفيديو خطوة بخطوة للوصول الآمن لحساباتك المميزة.')}
            </p>
          </div>
          <a href={`https://wa.me/${settings.whatsapp_number?.replace(/\D/g,'')}`} target="_blank"
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-right flex-shrink-0 hover:bg-white/20 transition-colors">
            <p className="text-xs text-gray-400">{t('Facing issues? Message on WhatsApp','واجه مشكلة؟ راسلنا على واتساب')}</p>
            <p className="text-sm font-bold text-white" dir="ltr">{settings.whatsapp_number||'+20 100 000 0000'}</p>
          </a>
        </div>
      </div>

      {loading&&<div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/></div>}

      <div className="grid grid-cols-3 gap-6">
        {videos.map(v=>(
          <div key={v.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 cursor-pointer group" onClick={()=>setPlaying(v.id)}>
              {v.thumbnail_url
                ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center bg-gray-800"><Play size={32} className="text-gray-400"/></div>
              }
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                  <Play size={13} className="text-white ml-1"/>
                </div>
              </div>
              {v.duration&&<span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">{v.duration}</span>}
              {v.badge&&<span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{background:badgeColor[v.badge]||'#6B7280'}}>● {v.badge}</span>}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">{v.title}</h3>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{v.description}</p>
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map(i=>(
                  <Star key={i} size={12} fill={i<=Math.round(v.rating)?'#F59E0B':'none'} stroke={i<=Math.round(v.rating)?'#F59E0B':'#D1D5DB'}/>
                ))}
                <span className="text-xs text-gray-400 ml-1">{v.rating} ({v.review_count>=1000?`${(v.review_count/1000).toFixed(1)}k+`:v.review_count})</span>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setPlaying(v.id)}
                  className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-1">
                  <Play size={12}/>▶ {t('Play Video','تشغيل')}
                </button>
                {v.video_url&&(
                  <button onClick={()=>navigator.clipboard.writeText(v.video_url)}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 transition-colors text-sm font-semibold flex items-center gap-1">
                    <LinkIcon size={12}/>{t('Copy Link','نسخ')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading&&videos.length===0&&(
          <div className="col-span-3 text-center py-16 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl">
            <Play size={24} className="text-gray-200 mx-auto mb-3"/>
            <p className="text-sm text-gray-400">{t('No tutorial videos yet','لا توجد فيديوهات بعد')}</p>
          </div>
        )}
      </div>

      {/* Video modal */}
      {playing&&(()=>{
        const v=videos.find(x=>x.id===playing)
        if(!v) return null
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={()=>setPlaying(null)}>
            <div className="w-full max-w-3xl" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">{v.title}</h3>
                <button onClick={()=>setPlaying(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                <iframe src={v.video_url?.replace('watch?v=','embed/')+'?autoplay=1'}
                  className="w-full h-full" allowFullScreen frameBorder="0" allow="autoplay"/>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
