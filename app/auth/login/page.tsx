'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Key, Mail, Lock, Eye, EyeOff, ShieldCheck, Zap } from 'lucide-react'
import { useUISettings } from '@/lib/use-ui-settings'

export default function LoginPage() {
  const router = useRouter()
  const ui     = useUISettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily:'Inter,sans-serif' }}>
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-10 relative overflow-hidden" style={{ background:'#111827' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage:'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize:'32px 32px' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            {(ui.admin_login_logo_url) ? (
              <img src={ui.admin_login_logo_url} alt="Logo" style={{ width:`${ui.admin_logo_width}px`, height:`${ui.admin_logo_height}px`, objectFit:'contain' }}/>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Key size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">Pro<span className="text-red-400">Keys</span></div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest">Subscription Manager</div>
                </div>
              </>
            )}
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background:'#1F2937', border:'1px solid #374151' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-400">Verified Premium Portal</span>
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">Strict & Secure<br />Premium Portal.</h1>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xs mb-8">Access is strictly restricted to licensed premium members.</p>
          <div className="flex flex-col gap-3">
            {[['ShieldCheck','Unauthorized Access Safeguards'],['Key','Redeem-to-Unlock Protection'],['Zap','Real-time Subscription Tracking']].map(([,text]) => (
              <div key={text} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={11} className="text-red-400" />
                </div>
                <span className="text-xs text-gray-400">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative p-4 rounded-xl" style={{ background:'#1F2937', border:'1px solid #374151' }}>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={12} className="text-emerald-400" />
            <span className="text-xs font-semibold text-gray-200">Pro Keys Channel</span>
          </div>
          <p className="text-[10px] text-gray-500">Get exclusive alerts, server status, and official admin support.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In Dashboard</h2>
            <p className="text-sm text-gray-400">Enter your credentials to access your premium workspace.</p>
          </div>
          {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 flex items-center gap-2"><ShieldCheck size={12}/>{error}</div>}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">Username or E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="prokeys@email.com"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"/>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Password</label>
                <span className="text-[10px] text-red-500 cursor-pointer hover:underline">Forgot Password?</span>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} placeholder="••••••••••"
                  className="w-full pl-9 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10 transition-all"/>
                <button onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass?<EyeOff size={14}/>:<Eye size={14}/>}
                </button>
              </div>
            </div>
            <button onClick={login} disabled={loading}
              className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors shadow-lg shadow-red-500/25 disabled:opacity-60 flex items-center justify-center gap-2 mt-1">
              {loading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:'Sign In →'}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">Don&apos;t have access? <span className="text-red-500 cursor-pointer font-semibold">Contact Admin</span></p>
        </div>
      </div>
    </div>
  )
}
