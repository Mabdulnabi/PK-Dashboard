'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { Check, AlertCircle, Loader2 } from 'lucide-react'

function TapCallbackInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const paymentId = params.get('payment_id')
  const tapId     = params.get('tap_id') // Tap appends this on redirect

  const [status, setStatus] = useState<'loading' | 'ok' | 'fail'>('loading')
  const [msg,    setMsg]    = useState('')

  useEffect(() => {
    if (!paymentId) { setStatus('fail'); setMsg('Missing payment ID'); return }

    fetch('/api/member/payment/tap/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, tap_id: tapId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.verified) {
          setStatus('ok')
          setTimeout(() => router.replace('/u/dashboard'), 2500)
        } else {
          setStatus('fail')
          setMsg(d.error || 'Payment not confirmed')
        }
      })
      .catch(() => { setStatus('fail'); setMsg('Network error') })
  }, [paymentId, tapId, router])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-10 max-w-sm w-full text-center">
        {status === 'loading' && <>
          <Loader2 size={40} className="text-[#d99401] animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Verifying payment…</h2>
        </>}
        {status === 'ok' && <>
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Confirmed! 🎉</h2>
          <p className="text-sm text-gray-400">Redirecting to dashboard…</p>
        </>}
        {status === 'fail' && <>
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Failed</h2>
          <p className="text-sm text-gray-400 mb-6">{msg}</p>
          <button onClick={() => router.back()} className="w-full py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#d99401' }}>
            Try Again
          </button>
        </>}
      </div>
    </div>
  )
}

export default function TapCallbackPage() {
  return <Suspense><TapCallbackInner /></Suspense>
}
