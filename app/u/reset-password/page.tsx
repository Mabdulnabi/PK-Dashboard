'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'

function ResetForm() {
  const params   = useSearchParams()
  const router   = useRouter()
  const token    = params.get('token') || ''
  const [pass,   setPass]   = useState('')
  const [show,   setShow]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,  setError]  = useState('')
  const [done,   setDone]   = useState(false)

  useEffect(() => { if (!token) setError('رابط غير صالح') }, [token])

  const submit = async () => {
    if (!pass || pass.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/member-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: pass }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      const msgs: Record<string, string> = {
        invalid_token: 'الرابط غير صالح',
        token_already_used: 'تم استخدام هذا الرابط من قبل',
        token_expired: 'انتهت صلاحية الرابط، اطلب رابطاً جديداً',
        password_too_short: 'كلمة المرور قصيرة جداً',
      }
      setError(msgs[data.error] || data.error)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/u/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'rgba(217,148,1,0.12)'}}>
            <Lock size={28} style={{color:'#d99401'}}/>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">إعادة تعيين كلمة المرور</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">أدخل كلمة المرور الجديدة</p>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">تم تغيير كلمة المرور! جاري تحويلك...</p>
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <input
                type={show ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="كلمة المرور الجديدة"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:border-[#d99401] pe-10"
                dir="ltr"
              />
              <button type="button" onClick={() => setShow(s => !s)}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>

            {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}

            <button onClick={submit} disabled={loading || !token}
              className="w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
              style={{background:'#d99401'}}>
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                : 'تغيير كلمة المرور'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>
}
