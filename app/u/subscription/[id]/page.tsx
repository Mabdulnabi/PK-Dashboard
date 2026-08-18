'use client'
// app/u/subscription/[id]/page.tsx

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Monitor, Smartphone, ExternalLink, Zap, Wifi, WifiOff, Loader2, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff, Copy, Check as CheckIcon, MessageCircle, Lock, AlertTriangle, Star, X } from 'lucide-react'
import { useLang } from '@/lib/lang-context'
import { useSiteSettings } from '@/lib/use-site-settings'

interface Purchase {
  id: string
  tool_id?: string
  tool_name: string
  tool_image?: string
  tool_video?: string
  duration_label: string
  category_slug?: string
  expires_at?: string
  payment_method: string
  amount_egp: number
}

interface Delivery {
  delivery_type: 'account'|'key'
  email?: string
  password?: string
  key?: string
  notes?: string
  delivered_at: string
  source: 'manual'|'stock'
}

interface ServerInfo {
  id: string
  tool_name: string
  server_label: string
  tier_required: string
  max_concurrent_users: number
  current_active_users: number
  proxy_host: string | null
  status: string
  is_full: boolean
}

interface Settings {
  extension_url_1: string
  extension_url_2: string
  extension_pc_guide: string
  extension_mobile_guide: string
  whatsapp_number: string
}

// Tool name → domain mapping
const TOOL_DOMAINS: Record<string, string> = {
  'QuillBot':   'quillbot.com',
  'Grammarly':  'grammarly.com',
  'Canva Pro':  'canva.com',
  'Canva':      'canva.com',
  'Turnitin':   'turnitin.com',
  'Perplexity': 'perplexity.ai',
  'SciSpace':   'scispace.com',
  'Gamma Pro':  'gamma.app',
  'Semrush':    'semrush.com',
  'Ahrefs':     'ahrefs.com',
  'Envato':     'eu.studio.envato.com',
}

function daysLeft(expiresAt?: string) {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}

export default function SubscriptionDetailPage() {
  const { id } = useParams()
  const router  = useRouter()
  const { t, lang, dir, formatPrice } = useLang()
  const settings = useSiteSettings()

  const [purchase,    setPurchase]    = useState<Purchase|null>(null)
  const [servers,     setServers]     = useState<ServerInfo[]>([])
  const [extReady,    setExtReady]    = useState(false)
  const [connecting,  setConnecting]  = useState(false)
  const [connected,   setConnected]   = useState(false)
  const [connError,   setConnError]   = useState('')
  const [activeServer,setActiveServer]= useState<string|null>(null)
  const [loading,     setLoading]     = useState(true)
  const [delivery,       setDelivery]       = useState<Delivery|null>(null)
  const [deliveryLoading,setDeliveryLoading] = useState(false)
  const [showPass,       setShowPass]        = useState(false)
  const [copied,         setCopied]          = useState<'email'|'pass'|null>(null)
  const [memberId,       setMemberId]        = useState<string|null>(null)
  // Report not working
  const [reportOpen,     setReportOpen]      = useState(false)
  const [reportMsg,      setReportMsg]       = useState('')
  const [reportBusy,     setReportBusy]      = useState(false)
  const [reportSent,     setReportSent]      = useState(false)
  // Rate purchase
  const [rateOpen,       setRateOpen]        = useState(false)
  const [rateVal,        setRateVal]         = useState(0)
  const [rateHover,      setRateHover]       = useState(0)
  const [rateTxt,        setRateTxt]         = useState('')
  const [rateBusy,       setRateBusy]        = useState(false)
  const [rateSent,       setRateSent]        = useState(false)
  const extCheckRef     = useRef(false)
  const fetchServersRef = useRef<(() => void) | null>(null)
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const deliveryPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchDelivery = useCallback(() => {
    fetch(`/api/member/delivery?purchase_id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.delivery) {
          setDelivery(d.delivery)
          // Stop polling once we have delivery
          if (deliveryPollRef.current) { clearInterval(deliveryPollRef.current); deliveryPollRef.current = null }
        }
      })
  }, [id])

  const copyText = async (text: string, field: 'email'|'pass') => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(()=>setCopied(null), 2000)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/member/purchases').then(r => r.json()),
      fetch('/api/member/shop').then(r => r.json()),
      fetch('/api/member/verify').then(r => r.json()),
    ]).then(([pData, sData, vData]) => {
      const p = pData.purchases?.find((x: any) => x.id === id)
      if (vData?.member_id) setMemberId(vData.member_id)
      if (p) {
        setPurchase(p)
        if (p.category_slug === 'private') {
          setDeliveryLoading(true)
          fetch(`/api/member/delivery?purchase_id=${id}`)
            .then(r=>r.json())
            .then(d=>{
              setDelivery(d.delivery||null)
              if (!d.delivery) {
                // Poll every 4s while waiting for delivery
                deliveryPollRef.current = setInterval(fetchDelivery, 4000)
              }
            })
            .finally(()=>setDeliveryLoading(false))
        }
      }
      setLoading(false)
    })

    return () => {
      if (deliveryPollRef.current) clearInterval(deliveryPollRef.current)
    }
  // ── Fetch servers when purchase is loaded ──
  }, [id, fetchDelivery])

  // Supabase Realtime: delivery created/updated → refetch credentials
  useEffect(() => {
    if (!memberId) return
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const channel = supabase
      .channel(`delivery-watch-${id}`)
      // Notification trigger (legacy)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'member_notifications',
        filter: `member_id=eq.${memberId}`,
      }, (payload) => {
        const n = payload.new as any
        if (n?.type === 'success' && n?.link === '/u/store') fetchDelivery()
      })
      // Direct delivery insert or update → immediate credential refresh
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'account_deliveries',
        filter: `member_id=eq.${memberId}`,
      }, () => fetchDelivery())
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'account_deliveries',
        filter: `member_id=eq.${memberId}`,
      }, () => fetchDelivery())
      // Purchase status change (pending → delivered)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'tool_purchases',
        filter: `id=eq.${id}`,
      }, () => fetchDelivery())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [memberId, id, fetchDelivery])

  useEffect(() => {
    if (!purchase?.tool_name) return

    const fetchServers = () => {
      const param = purchase.tool_id
        ? `tool_id=${encodeURIComponent(purchase.tool_id)}`
        : `tool=${encodeURIComponent(purchase.tool_name)}`
      return fetch(`/api/member/servers?${param}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => setServers(d.servers || []))
    }

    // Keep ref updated so extension handler can call it directly
    fetchServersRef.current = fetchServers

    fetchServers()

    const poll = setInterval(fetchServers, 30000)
    return () => clearInterval(poll)
  }, [purchase?.id])

  // ── Extension detection ──
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.source !== window) return
      const data = e.data
      if (!data?.type?.startsWith('PK_')) return

      if (data.type === 'PK_EXTENSION_READY') {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
        setExtReady(true)
        fetchServersRef.current?.()
        window.postMessage({ type: 'PK_GET_STATE' }, '*')
      }
      if (data.type === 'PK_STATE') {
        setExtReady(true)
        if (data.state?.active_tool && data.state?.server_id) {
          fetch(`/api/member/servers/session/status?server_id=${data.state.server_id}`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
              if (d.active) { setConnected(true); setActiveServer(data.state.server_id) }
            }).catch(() => {})
        }
      }
      if (data.type === 'PK_INJECT_RESULT') {
        setConnecting(false)
        if (data.success) {
          setConnected(true)
          fetchServersRef.current?.()
        } else {
          setConnError(data.error || t('Connection failed','فشل الاتصال'))
        }
      }
      if (data.type === 'PK_DISCONNECT_RESULT') {
        setConnected(false)
        setActiveServer(null)
      }
    }
    window.addEventListener('message', handler)

    // Clear stale flag — extension must re-set it on this page load
    try { sessionStorage.removeItem('__pk_ext_ready__') } catch {}

    // Primary: poll sessionStorage every 200ms (set by content-script, no postMessage race)
    const poll = setInterval(() => {
      try {
        if (sessionStorage.getItem('__pk_ext_ready__') === '1') {
          clearInterval(poll)
          setExtReady(true)
          fetchServersRef.current?.()
          window.postMessage({ type: 'PK_GET_STATE' }, '*')
        }
      } catch {}
      // Also ping via postMessage as secondary mechanism
      window.postMessage({ type: 'PK_PING' }, '*')
    }, 200)
    pollRef.current = poll

    return () => {
      window.removeEventListener('message', handler)
      clearInterval(poll)
      pollRef.current = null
    }
  }, [])

  async function connectServer(server: ServerInfo) {
    if (!purchase) return
    setConnecting(true)
    setConnError('')
    setActiveServer(server.id)

    // Fetch session data from server (service role on backend)
    const res  = await fetch(`/api/member/servers/session?server_id=${server.id}`, { credentials: 'include' })
    const data = await res.json()

    if (!res.ok || !data.session_data) {
      setConnecting(false)
      setConnError(data.error || t('Failed to fetch session data','فشل جلب بيانات الجلسة'))
      return
    }

    window.postMessage({
      type: 'PK_INJECT_REQUEST',
      toolName:    server.tool_name || purchase.tool_name,
      sessionData: data.session_data,
      serverId:    server.id,
      proxy:       data.proxy || null,
    }, '*')
  }

  const days = daysLeft(purchase?.expires_at)

  if (loading) return (
    <div className="flex justify-center items-center py-32" style={{fontFamily:'Cairo, sans-serif'}}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
    </div>
  )

  if (!purchase) return (
    <div className="text-center py-32 text-gray-400" style={{fontFamily:'Cairo, sans-serif'}}>
      {t('Subscription not found','الاشتراك غير موجود')}
    </div>
  )

  return (
    <div dir={dir} className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
            {dir === 'rtl' ? <ArrowLeft size={16} className="rotate-180"/> : <ArrowLeft size={16}/>}
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {purchase.tool_image && (
              <img src={purchase.tool_image} alt={purchase.tool_name} className="w-9 h-9 object-contain flex-shrink-0"/>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">{purchase.tool_name}</h1>
              <p className="text-xs text-gray-400">
                {days ? t(`Expires in ${days} days`,`ينتهي بعد ${days} يوم`) : t('Lifetime','مدى الحياة')} · {lang==='ar'?purchase.duration_label.replace('Days','يوم').replace('Day','يوم'):purchase.duration_label}
              </p>
            </div>
          </div>
          {extReady && connected && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wifi size={12}/> {t('Connected','متصل')}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {/* ── Servers / Extension — only for shared tools, not private ── */}
        {purchase?.category_slug !== 'private' && (extReady ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Zap size={16} style={{color:'#d99401'}}/>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('Choose a Server & Start','اختر سيرفر وابدأ')}</h2>
              </div>

            </div>

            {connError && (
              <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl" style={{background:'#d9940110',border:'1px solid #d9940130'}}>
                <AlertCircle size={14} className="flex-shrink-0" style={{color:'#d99401'}}/>
                <p className="text-sm" style={{color:'#d99401'}}>{connError}</p>
              </div>
            )}

            <div className="p-6">
              {servers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">{t('No servers available right now','مفيش سيرفرات متاحة دلوقتي')}</p>
                  <p className="text-xs mt-1">{t('Contact support','تواصل مع الدعم')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servers.map(s => {
                    const isActive   = activeServer === s.id && connected
                    const isLoading  = activeServer === s.id && connecting
                    const isFull     = s.is_full && !isActive
                    const load       = Math.round((s.current_active_users / s.max_concurrent_users) * 100)

                    return (
                      <button key={s.id}
                        onClick={() => !isFull && !connecting && connectServer(s)}
                        disabled={isFull || connecting}
                        className={`relative p-4 rounded-2xl border-2 text-end transition-all ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 cursor-default'
                            : isFull
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-[#d9940108] cursor-pointer hover:border-[#d99401]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isActive ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            {isLoading
                              ? <Loader2 size={14} className="animate-spin" style={{color:'#d99401'}}/>
                              : isActive
                              ? <CheckCircle size={14} className="text-white"/>
                              : <Wifi size={14} className="text-gray-400"/>
                            }
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isFull ? 'bg-red-50 dark:bg-red-500/10 text-red-500' :
                            load > 70 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' :
                            'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isFull ? t('Full','ممتلئ') : load > 70 ? t('Busy','مزدحم') : t('Available','متاح')}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">{s.server_label}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{s.current_active_users}/{s.max_concurrent_users} {t('users','مستخدم')}</span>
                          {s.proxy_host && <span>· 🌐 Proxy</span>}
                        </div>
                        {/* Load bar */}
                        <div className="mt-3 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${
                            load > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`} style={{ width: `${Math.min(load, 100)}%` }}/>
                        </div>
                        {isActive && (
                          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{t('✓ Connected — Tool is open','✓ متصل — الأداة مفتوحة')}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Extension not installed — show download section ── */
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <Download size={16} style={{color:'#d99401'}}/>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('Install Extension to Start','ثبّت الإضافة لتبدأ الاستخدام')}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <a href={settings?.extension_url_1 || '#'}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-colors" style={{background:'#d99401'}}>
                  <Download size={15}/> Extension 1
                </a>
                <a href={settings?.extension_url_2 || '#'}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-colors" style={{background:'#d99401'}}>
                  <Download size={15}/> Extension 2
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Monitor size={15} className="text-blue-500"/>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">PC / Laptop</span>
                  </div>
                  <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 mb-4">
                    <li>1. {t('Download both extensions','حمّل الإضافتين')}</li>
                    <li>2. {t('Extract the ZIP','فك الضغط')}</li>
                    <li>3. Chrome → Extensions</li>
                    <li>4. Developer Mode ✓</li>
                    <li>5. Load Unpacked</li>
                  </ol>
                  <a href={settings?.extension_pc_guide || '#'} target="_blank"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-colors">
                    <ExternalLink size={11}/> {t('Full Guide','دليل مفصّل')}
                  </a>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Smartphone size={15} className="text-purple-500"/>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Mobile</span>
                  </div>
                  <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 mb-4">
                    <li>1. {t('Download Lemur Browser','حمّل Lemur Browser')}</li>
                    <li>2. Extensions</li>
                    <li>3. Developer Mode ✓</li>
                    <li>4. {t('Download both extensions','حمّل الإضافتين')}</li>
                    <li>5. {t('Start using','ابدأ الاستخدام')}</li>
                  </ol>
                  <a href={settings?.extension_mobile_guide || '#'} target="_blank"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors">
                    <ExternalLink size={11}/> {t('Full Guide','دليل مفصّل')}
                  </a>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                {t('After installation, reload the page and servers will appear automatically','بعد التثبيت، أعد تحميل الصفحة وستظهر السيرفرات تلقائياً')}
              </p>
            </div>
          </div>
        ))}

        {/* ── Private Account Credentials ── */}
        {purchase.category_slug === 'private' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <Lock size={16} style={{color:'#d99401'}}/>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('Account Credentials','بيانات الدخول')}</h2>
            </div>
            <div className="p-6">
              {deliveryLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/></div>
              ) : delivery ? (
                <div className="space-y-4">
                  {delivery.delivery_type === 'account' ? (
                    <>
                      {/* Email */}
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('Email','البريد الإلكتروني')}</div>
                          <div className="text-sm font-mono text-gray-900 dark:text-white truncate" dir="ltr">{delivery.email}</div>
                        </div>
                        <button onClick={()=>copyText(delivery.email!,'email')}
                          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${copied==='email'?'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600':'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
                          {copied==='email'?<CheckIcon size={14}/>:<Copy size={14}/>}
                        </button>
                      </div>
                      {/* Password */}
                      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('Password','كلمة المرور')}</div>
                          <div className="text-sm font-mono text-gray-900 dark:text-white" dir="ltr">
                            {showPass ? delivery.password : '••••••••••••'}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={()=>setShowPass(s=>!s)}
                            className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                            {showPass?<EyeOff size={14}/>:<Eye size={14}/>}
                          </button>
                          <button onClick={()=>copyText(delivery.password!,'pass')}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${copied==='pass'?'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600':'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
                            {copied==='pass'?<CheckIcon size={14}/>:<Copy size={14}/>}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Key */
                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t('License Key','مفتاح الترخيص')}</div>
                        <div className="text-sm font-mono text-gray-900 dark:text-white" dir="ltr">
                          {showPass ? delivery.key : '••••-••••-••••-••••'}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={()=>setShowPass(s=>!s)}
                          className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                          {showPass?<EyeOff size={14}/>:<Eye size={14}/>}
                        </button>
                        <button onClick={()=>copyText(delivery.key!,'pass')}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${copied==='pass'?'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600':'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
                          {copied==='pass'?<CheckIcon size={14}/>:<Copy size={14}/>}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Notes */}
                  {delivery.notes && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-4 py-3">
                      <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">{t('Notes','ملاحظات')}</div>
                      <p className="text-sm text-amber-800 dark:text-amber-300">{delivery.notes}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 text-center">
                    {t('Delivered','تم التسليم')} {new Date(delivery.delivered_at).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true })}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                    <Lock size={20} className="text-amber-400"/>
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t('Account Being Prepared','جاري تجهيز حسابك')}</p>
                  <p className="text-xs text-gray-400">{t('We will deliver your credentials shortly','سنسلم بيانات الدخول قريباً')}</p>
                  <a href={`https://wa.me/${(settings?.whatsapp_number||'').replace(/\D/g,'')}?text=${encodeURIComponent(`متى سيتم تسليم حساب ${purchase.tool_name}؟`)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors">
                    <MessageCircle size={13}/>{t('Ask on WhatsApp','استفسر على WhatsApp')}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Video Tutorial ── */}
        {purchase.tool_video && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <Zap size={16} className="text-amber-500"/>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('Tutorial Video','فيديو توضيحي')}</h2>
            </div>
            <div className="p-4">
              <div className="rounded-xl overflow-hidden bg-gray-900 aspect-video">
                <iframe
                  src={purchase.tool_video.replace('watch?v=','embed/').replace('youtu.be/','www.youtube.com/embed/')}
                  className="w-full h-full" allowFullScreen frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Private tool action buttons ── */}
        {purchase.category_slug === 'private' && (
          <div className="flex gap-3">
            <button onClick={() => { setReportOpen(true); setReportMsg(''); setReportSent(false) }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 dark:border-red-500/30 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
              <AlertTriangle size={14}/>
              {t('Report Not Working','إبلاغ عن مشكلة')}
            </button>
            <button onClick={() => { setRateOpen(true); setRateVal(0); setRateTxt(''); setRateSent(false) }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-colors hover:opacity-90"
              style={{ background: '#f59e0b' }}>
              <Star size={14}/>
              {t('Rate Purchase','تقييم الاشتراك')}
            </button>
          </div>
        )}

        {/* ── WhatsApp support ── */}
        <a href={`https://wa.me/${(settings?.whatsapp_number||'').replace(/\D/g,'')}?text=${encodeURIComponent(`مساعدة في: ${purchase.tool_name}`)}`}
          target="_blank"
          className="flex items-center gap-4 p-5 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg">💬</span>
          </div>
          <div>
            <div className="text-sm font-bold text-green-700 dark:text-green-400">{t('Need Help?','محتاج مساعدة؟')}</div>
            <div className="text-xs text-green-600 dark:text-green-500">{t('Contact us on WhatsApp','تواصل معنا على WhatsApp فوراً')}</div>
          </div>
        </a>
      </div>

      {/* ── Report Not Working Modal ── */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setReportOpen(false)}>
          <div className="rounded-2xl w-full max-w-sm" style={{background:'rgba(255,255,255,0.92)',backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',border:'1px solid rgba(255,255,255,0.7)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)'}}
            onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500"/>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{t('Report Issue','إبلاغ عن مشكلة')}</p>
              </div>
              <button onClick={() => setReportOpen(false)}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <X size={13}/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {reportSent ? (
                <div className="text-center py-4">
                  <CheckCircle size={36} className="text-emerald-500 mx-auto mb-2"/>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{t('Ticket sent!','تم إرسال التذكرة!')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('Support team will reply soon','فريق الدعم سيرد قريباً')}</p>
                  <button onClick={() => setReportOpen(false)}
                    className="mt-4 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{ background: '#d99401' }}>
                    {t('Close','إغلاق')}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">{t('Describe the issue with','اوصف المشكلة في')} <strong>{purchase.tool_name}</strong></p>
                  <textarea
                    value={reportMsg}
                    onChange={e => setReportMsg(e.target.value)}
                    rows={4}
                    placeholder={t('e.g. Login not working, account suspended...','مثال: تسجيل الدخول لا يعمل، الحساب معلق...')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-red-400 resize-none transition-all"/>
                  <button
                    onClick={async () => {
                      if (!reportMsg.trim()) return
                      setReportBusy(true)
                      const res = await fetch('/api/member/tickets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          subject: lang === 'ar' ? `مشكلة في ${purchase.tool_name}` : `Issue with ${purchase.tool_name}`,
                          message: reportMsg.trim(),
                          priority: 'high',
                          category: 'subscription',
                        })
                      })
                      setReportBusy(false)
                      if (res.ok) {
                        setReportSent(true)
                      } else {
                        const err = await res.json().catch(() => ({}))
                        alert(err.error || t('Failed to send report','فشل إرسال البلاغ'))
                      }
                    }}
                    disabled={!reportMsg.trim() || reportBusy}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: '#ef4444' }}>
                    {reportBusy
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> {t('Sending...','جاري الإرسال...')}</>
                      : <><AlertTriangle size={14}/> {t('Submit Report','إرسال البلاغ')}</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Rate Purchase Modal ── */}
      {rateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setRateOpen(false)}>
          <div className="rounded-2xl w-full max-w-sm" style={{background:'rgba(255,255,255,0.92)',backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',border:'1px solid rgba(255,255,255,0.7)',boxShadow:'0 24px 64px rgba(0,0,0,0.18)'}}
            onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-500"/>
                <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{t(`Rate ${purchase.tool_name}`, `تقييم ${purchase.tool_name}`)}</p>
              </div>
              <button onClick={() => setRateOpen(false)}
                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                <X size={13}/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {rateSent ? (
                <div className="text-center py-4">
                  <Star size={36} className="text-amber-400 mx-auto mb-2" fill="#f59e0b"/>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{t('Thank you! 🎉','شكراً على تقييمك! 🎉')}</p>
                  <button onClick={() => setRateOpen(false)}
                    className="mt-4 px-5 py-2 rounded-xl text-white text-sm font-bold" style={{ background: '#f59e0b' }}>
                    {t('Close','إغلاق')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} type="button"
                        onMouseEnter={() => setRateHover(i)} onMouseLeave={() => setRateHover(0)}
                        onClick={() => setRateVal(i)}>
                        <Star size={32}
                          fill={(rateHover || rateVal) >= i ? '#F59E0B' : 'none'}
                          stroke={(rateHover || rateVal) >= i ? '#F59E0B' : '#9CA3AF'}
                          className="transition-colors"/>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={rateTxt}
                    onChange={e => setRateTxt(e.target.value)}
                    rows={3}
                    placeholder={t('Add a comment (optional)...','أضف تعليقاً (اختياري)...')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-amber-400 resize-none transition-all"/>
                  <button
                    onClick={async () => {
                      if (!rateVal) return
                      setRateBusy(true)
                      if (purchase.tool_id) {
                        await fetch(`/api/tools/${purchase.tool_id}/reviews`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ stars: rateVal, comment: rateTxt })
                        })
                      }
                      setRateBusy(false)
                      setRateSent(true)
                    }}
                    disabled={!rateVal || rateBusy}
                    className="w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: '#f59e0b' }}>
                    {rateBusy
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> {t('Sending...','جاري...')}</>
                      : <><Star size={14}/> {t('Submit Review','إرسال التقييم')}</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
