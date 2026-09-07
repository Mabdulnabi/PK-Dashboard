'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/lib/lang-context'
import { Copy, Check, Users, Gift, Clock, Share2 } from 'lucide-react'

interface ReferralData {
  referral_code: string
  total_referred: number
  earned_egp: number
  paid_egp: number
  pending_egp: number
  referred: { id: string; full_name: string; created_at: string }[]
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl p-5 border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`${color}18`}}>
          <Icon size={16} style={{color}}/>
        </div>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-black" style={{color}}>{value}</div>
    </div>
  )
}

export default function ReferralsPage() {
  const { lang } = useLang()
  const isRtl = lang === 'ar'
  const [data,    setData]    = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)

  useEffect(() => {
    fetch('/api/member/referrals').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  const referralLink = data ? `${typeof window !== 'undefined' ? window.location.origin : ''}/u/login?ref=${data.referral_code}` : ''

  const copy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: 'Pro Keys', text: isRtl ? 'سجّل معي في Pro Keys واستمتع بأفضل أسعار الاشتراكات!' : 'Join me on Pro Keys for the best subscription deals!', url: referralLink })
    } else {
      copy()
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{borderColor:'#d99401',borderTopColor:'transparent'}}/>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{background:'rgba(217,148,1,0.12)'}}>
          <Gift size={30} style={{color:'#d99401'}}/>
        </div>
        <h1 className="text-2xl font-black mb-2">{isRtl ? 'برنامج الإحالة' : 'Referral Program'}</h1>
        <p className="text-sm text-gray-400 max-w-sm mx-auto">
          {isRtl
            ? 'ادعُ أصدقاءك واحصل على 20 جنيه مكافأة عند أول عملية شراء لكل صديق'
            : 'Invite friends and earn 20 EGP for every friend who makes their first purchase'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={Users} label={isRtl ? 'إجمالي الإحالات' : 'Total Referred'} value={String(data?.total_referred || 0)} color="#3b82f6"/>
        <StatCard icon={Gift}  label={isRtl ? 'إجمالي المكافآت' : 'Total Earned'}   value={`${data?.earned_egp || 0} ج`}       color="#d99401"/>
        <StatCard icon={Clock} label={isRtl ? 'قيد الانتظار' : 'Pending'}           value={`${data?.pending_egp || 0} ج`}       color="#f59e0b"/>
      </div>

      {/* Referral link */}
      <div className="rounded-2xl p-5 border border-[var(--border)] bg-[var(--card)] mb-6">
        <div className="text-xs font-bold text-gray-400 mb-3">{isRtl ? 'رابط الإحالة الخاص بك' : 'Your Referral Link'}</div>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-mono truncate"
            style={{background:'var(--bg)', border:'1px solid var(--border)'}}>
            <span className="truncate text-gray-300">{referralLink}</span>
          </div>
          <button onClick={copy}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{background: copied ? '#22c55e' : '#d99401', color: '#fff'}}>
            {copied ? <Check size={13}/> : <Copy size={13}/>}
            {copied ? (isRtl ? 'تم!' : 'Copied!') : (isRtl ? 'نسخ' : 'Copy')}
          </button>
          <button onClick={share}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors border border-[var(--border)] hover:bg-[var(--bg)]">
            <Share2 size={13}/>
            {isRtl ? 'مشاركة' : 'Share'}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{isRtl ? 'كودك:' : 'Your code:'}</span>
          <span className="text-xs font-black font-mono tracking-widest" style={{color:'#d99401'}}>{data?.referral_code}</span>
        </div>
      </div>

      {/* Referred members */}
      {(data?.referred || []).length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)]" style={{background:'var(--card)'}}>
            <span className="text-xs font-bold text-gray-400">{isRtl ? 'الأصدقاء المسجلون' : 'Referred Friends'}</span>
          </div>
          {data!.referred.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{background:'rgba(217,148,1,0.12)',color:'#d99401'}}>
                {m.full_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{m.full_name}</div>
                <div className="text-[10px] text-gray-400">{new Date(m.created_at).toLocaleDateString(isRtl?'ar-EG':'en-US')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
