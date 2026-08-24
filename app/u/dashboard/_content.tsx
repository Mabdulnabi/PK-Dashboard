'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ────────────────────────────────────────────────────────────────────
type Lang = 'ar' | 'en'
interface S { [k: string]: string }
interface ToolLogo { id: string; url: string; name: string }
interface Feature  { id: string; icon: string; title_ar: string; title_en: string; desc_ar: string; desc_en: string }
interface Stat     { id: string; number: string; suffix: string; label_ar: string; label_en: string }
interface FaqItem  { id: string; q_ar: string; q_en: string; a_ar: string; a_en: string }
interface Review   { id: string; name: string; location: string; photo: string; stars: number; text_ar: string; text_en: string }

function parse<T>(v: string | undefined, fb: T): T {
  if (!v) return fb
  try { return JSON.parse(v) as T } catch { return fb }
}

// ─── Scroll-triggered counter ─────────────────────────────────────────────────
function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const ran = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || ran.current) return
      ran.current = true
      const dur = 1800; let start = 0; const step = target / (dur / 16)
      const t = setInterval(() => {
        start += step
        if (start >= target) { setN(target); clearInterval(t) }
        else setN(Math.floor(start))
      }, 16)
    }, { threshold: 0.4 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>
}

// ─── Auth Modal Component ─────────────────────────────────────────────────────
interface AuthModalProps {
  authModal: 'login'|'signup'|'forgot'
  lang: Lang
  logo: string
  siteName: string
  amEmail: string; setAmEmail: (v:string)=>void
  amPass: string;  setAmPass:  (v:string)=>void
  amConf: string;  setAmConf:  (v:string)=>void
  amName: string;  setAmName:  (v:string)=>void
  amWA: string;    setAmWA:    (v:string)=>void
  amAgree: boolean; setAmAgree: (v:boolean)=>void
  amLoading: boolean; setAmLoading: (v:boolean)=>void
  amError: string;    setAmError:   (v:string)=>void
  amOk: string;       setAmOk:      (v:string)=>void
  amForgotEmail: string; setAmForgotEmail: (v:string)=>void
  pwState: {length:boolean;upper:boolean;lower:boolean;number:boolean;special:boolean}
  evalPw: (v:string)=>void
  isPwStrong: (v:string)=>boolean
  setAuthModal: (v:'login'|'signup'|'forgot'|null)=>void
  closeAuth: ()=>void
}

function AuthModal({ authModal, lang, logo, siteName, amEmail, setAmEmail, amPass, setAmPass, amConf, setAmConf, amName, setAmName, amWA, setAmWA, amAgree, setAmAgree, amLoading, setAmLoading, amError, setAmError, amOk, setAmOk, amForgotEmail, setAmForgotEmail, pwState, evalPw, isPwStrong, setAuthModal, closeAuth }: AuthModalProps) {
  const mode = authModal
  const t = (ar: string, en: string) => lang === 'ar' ? ar : en
  const L = {
    ar: {
      login:'دخول', signup:'إنشاء حساب',
      loginTitle:'دخول مستخدم', loginSub:'أدخل بيانات حسابك للمتابعة',
      signupTitle:'إنشاء حساب جديد', signupSub:'انضم لـ Pro Keys في أقل من دقيقة',
      forgotTitle:'استعادة كلمة المرور', forgotSub:'هنبعتلك لينك على إيميلك',
      email:'البريد الإلكتروني', pass:'كلمة المرور', conf:'تأكيد', name:'الاسم الكامل', wa:'رقم الواتساب',
      forgot:'هل نسيت كلمة المرور؟', loginBtn:'دخول', signupBtn:'إنشاء حساب', sendLink:'إرسال الرابط',
      googleLogin:'الدخول بحساب Google', googleSignup:'التسجيل بحساب Google',
      noAccount:'ليس لديك حساب؟', makeAccount:'إنشاء حساب جديد',
      haveAccount:'لديك حساب؟', doLogin:'تسجيل دخول',
      backLogin:'← رجوع لتسجيل الدخول',
      terms:'أوافق على شروط الخدمة',
      fill:'من فضلك املأ كل الحقول', pwWeak:'كلمة المرور لازم تحقق كل الشروط', mismatch:'كلمتا المرور غير متطابقتين', termsErr:'من فضلك وافق على شروط الخدمة',
      redirecting:'جاري تحويلك...', created:'تم إنشاء الحساب بنجاح!',
      confirmEmail:'تحقق من إيميلك عشان تفعّل حسابك.',
      sent:'اتبعت! تحقق من صندوق الوارد.',
      ruleLen:'8 أحرف على الأقل', ruleUp:'حرف كبير واحد على الأقل (A-Z)', ruleLo:'حرف صغير واحد على الأقل (a-z)', ruleNum:'رقم واحد على الأقل (0-9)', ruleSpec:'رمز خاص واحد على الأقل (!@#$%^&*)',
    },
    en: {
      login:'Sign In', signup:'Sign Up',
      loginTitle:'Welcome back', loginSub:'Enter your details to continue',
      signupTitle:'Create your account', signupSub:'Join Pro Keys in under a minute',
      forgotTitle:'Reset your password', forgotSub:"We'll email you a reset link",
      email:'Email address', pass:'Password', conf:'Confirm', name:'Full name', wa:'WhatsApp number',
      forgot:'Forgot password?', loginBtn:'Sign In', signupBtn:'Create account', sendLink:'Send link',
      googleLogin:'Sign in with Google', googleSignup:'Sign up with Google',
      noAccount:"Don't have an account?", makeAccount:'Create one now',
      haveAccount:'Already have an account?', doLogin:'Sign in',
      backLogin:'← Back to sign in',
      terms:'I agree to the Terms of Service',
      fill:'Please fill in all fields', pwWeak:'Password must meet all requirements', mismatch:'Passwords do not match', termsErr:'Please agree to the Terms of Service',
      redirecting:'Redirecting...', created:'Account created!',
      confirmEmail:'Check your email to confirm your account.',
      sent:'Sent! Check your inbox.',
      ruleLen:'At least 8 characters', ruleUp:'At least one uppercase (A-Z)', ruleLo:'At least one lowercase (a-z)', ruleNum:'At least one number (0-9)', ruleSpec:'At least one special char (!@#$%^&*)',
    },
  }[lang]

  const Spinner = () => <span className="am-spin"/>
  const GoogleSVG = () => (
    <svg viewBox="0 0 48 48" style={{ width:17, height:17, flexShrink:0 }}>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  )

  const doLogin = async () => {
    if (!amEmail || !amPass) { setAmError(L.fill); return }
    setAmLoading(true); setAmError(''); setAmOk('')
    const res = await fetch('/api/auth/member-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: amEmail, password: amPass }),
    })
    const d = await res.json()
    if (!res.ok) {
      const msg: Record<string,string> = {
        invalid_credentials: lang==='ar' ? 'بيانات غير صحيحة' : 'Invalid credentials',
        subscription_expired: lang==='ar' ? 'الاشتراك منتهي' : 'Subscription expired',
      }
      setAmError(msg[d.error] || d.error || (lang==='ar' ? 'فشل تسجيل الدخول' : 'Login failed'))
      setAmLoading(false); return
    }
    setAmOk(L.redirecting)
    setTimeout(() => { window.location.href = '/u/dashboard' }, 900)
  }

  const doSignup = async () => {
    if (!amName || !amEmail || !amWA || !amPass || !amConf) { setAmError(L.fill); return }
    if (!isPwStrong(amPass)) { setAmError(L.pwWeak); return }
    if (amPass !== amConf) { setAmError(L.mismatch); return }
    if (!amAgree) { setAmError(L.termsErr); return }
    setAmLoading(true); setAmError(''); setAmOk('')
    const res = await fetch('/api/auth/member-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: amEmail, password: amPass, full_name: amName, whatsapp: amWA }),
    })
    const d = await res.json()
    setAmLoading(false)
    if (!res.ok) {
      const msg: Record<string,string> = {
        email_taken: lang==='ar' ? 'البريد مستخدم بالفعل' : 'Email already registered',
      }
      setAmError(msg[d.error] || d.error || (lang==='ar' ? 'فشل إنشاء الحساب' : 'Signup failed')); return
    }
    setAmOk(L.created); setTimeout(() => { window.location.href = '/u/dashboard' }, 900)
  }

  const doForgot = async () => {
    if (!amForgotEmail) { setAmError(L.fill); return }
    setAmLoading(true); setAmError(''); setAmOk('')
    const { error } = await supabase.auth.resetPasswordForEmail(amForgotEmail, {
      redirectTo: window.location.origin + '/u/dashboard',
    })
    setAmLoading(false)
    if (error) { setAmError(lang==='ar' ? 'حدث خطأ، حاول مجدداً' : error.message); return }
    setAmOk(L.sent)
  }

  const doGoogle = async () => {
    setAmLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  const switchTo = (f: 'login'|'signup'|'forgot') => {
    setAmError(''); setAmOk(''); setAuthModal(f)
  }

  const rules = [
    { key: 'length',  label: L.ruleLen,  ok: pwState.length },
    { key: 'upper',   label: L.ruleUp,   ok: pwState.upper },
    { key: 'lower',   label: L.ruleLo,   ok: pwState.lower },
    { key: 'number',  label: L.ruleNum,  ok: pwState.number },
    { key: 'special', label: L.ruleSpec, ok: pwState.special },
  ]

  const titleMap = { login: L.loginTitle, signup: L.signupTitle, forgot: L.forgotTitle }
  const subMap   = { login: L.loginSub,   signup: L.signupSub,   forgot: L.forgotSub }

  return (
    <div id="lpAmOverlay" className="am-vis" style={{ fontFamily:"'Cairo',sans-serif", direction: lang==='ar'?'rtl':'ltr' }}
      onClick={e => { if (e.target === e.currentTarget) closeAuth() }}>
      <div id="lpAmCard">
        <div className="am-hdr">
          {logo
            ? <img src={logo} alt={siteName} style={{ height:36, width:'auto' }}/>
            : <span style={{ fontWeight:900, fontSize:18, color:'#d99401' }}>{siteName}</span>}
          <button onClick={closeAuth} style={{ border:'none', background:'#F9F6EE', width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:14, color:'#3D4A6B', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        <div className="am-body">
          <div className="am-title">
            <h2>{titleMap[mode]}</h2>
            <p>{subMap[mode]}</p>
          </div>
          {(mode === 'login' || mode === 'signup') && (
            <div className="am-tabs">
              <button className={`am-tab${mode==='login'?' on':''}`} onClick={() => switchTo('login')}>{L.login}</button>
              <button className={`am-tab${mode==='signup'?' on':''}`} onClick={() => switchTo('signup')}>{L.signup}</button>
            </div>
          )}
          {amError && <div className="am-err">{amError}</div>}
          {amOk    && <div className="am-ok">{amOk}</div>}
          {mode === 'login' && (
            <>
              <div className="am-grp"><label>{L.email}</label><input type="email" value={amEmail} onChange={e=>setAmEmail(e.target.value)} placeholder="your@email.com" dir="ltr"/></div>
              <div className="am-grp">
                <label>{L.pass}</label>
                <input type="password" value={amPass} onChange={e=>setAmPass(e.target.value)} placeholder="••••••••" dir="ltr"/>
                <button className="am-forgot-link" onClick={() => switchTo('forgot')}>{L.forgot}</button>
              </div>
              <button className="am-btn" onClick={doLogin} disabled={amLoading}>{amLoading ? <Spinner/> : <span>{L.loginBtn}</span>}</button>
              <div className="am-div"><span>{t('أو','or')}</span></div>
              <button className="am-google" onClick={doGoogle} disabled={amLoading}><GoogleSVG/><span>{L.googleLogin}</span></button>
              <div className="am-footer"><span>{L.noAccount} </span><button onClick={() => switchTo('signup')}>{L.makeAccount}</button></div>
            </>
          )}
          {mode === 'signup' && (
            <>
              <div className="am-grp"><label>{L.name}</label><input type="text" value={amName} onChange={e=>setAmName(e.target.value)} placeholder={lang==='ar'?'محمد علي':'John Smith'}/></div>
              <div className="am-grp"><label>{L.email}</label><input type="email" value={amEmail} onChange={e=>setAmEmail(e.target.value)} placeholder="your@email.com" dir="ltr"/></div>
              <div className="am-grp"><label>{L.wa}</label><input type="text" value={amWA} onChange={e=>setAmWA(e.target.value)} placeholder="+20 10 000 0000" dir="ltr"/></div>
              <div className="am-row">
                <div className="am-grp"><label>{L.pass}</label><input type="password" value={amPass} onChange={e=>{setAmPass(e.target.value);evalPw(e.target.value)}} placeholder="••••••••" dir="ltr"/></div>
                <div className="am-grp"><label>{L.conf}</label><input type="password" value={amConf} onChange={e=>setAmConf(e.target.value)} placeholder="••••••••" dir="ltr"/></div>
              </div>
              <ul className="am-rules">{rules.map(r => (<li key={r.key} style={{ color: r.ok ? '#0E9F6E' : '#94A3B8' }}>{r.ok ? '✓' : '○'} {r.label}</li>))}</ul>
              <label className="am-check"><input type="checkbox" checked={amAgree} onChange={e=>setAmAgree(e.target.checked)}/>{L.terms}</label>
              <button className="am-btn" onClick={doSignup} disabled={amLoading}>{amLoading ? <Spinner/> : <span>{L.signupBtn}</span>}</button>
              <div className="am-div"><span>{t('أو','or')}</span></div>
              <button className="am-google" onClick={doGoogle} disabled={amLoading}><GoogleSVG/><span>{L.googleSignup}</span></button>
              <div className="am-footer"><span>{L.haveAccount} </span><button onClick={() => switchTo('login')}>{L.doLogin}</button></div>
            </>
          )}
          {mode === 'forgot' && (
            <>
              <div className="am-forgot-icon">🔑</div>
              <div className="am-grp"><label>{L.email}</label><input type="email" value={amForgotEmail} onChange={e=>setAmForgotEmail(e.target.value)} placeholder="your@email.com" dir="ltr"/></div>
              <button className="am-btn" onClick={doForgot} disabled={amLoading}>{amLoading ? <Spinner/> : <span>{L.sendLink}</span>}</button>
              <div className="am-footer"><button onClick={() => switchTo('login')}>{L.backLogin}</button></div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LandingInner({ embedded = false, memberActive = false }: { embedded?: boolean; memberActive?: boolean }) {

  const [lang,    setLang]    = useState<Lang>('ar')
  const [s,       setS]       = useState<S>({})
  const [ready,   setReady]   = useState(false)
  const [preHide, setPreHide] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq,  setOpenFaq]  = useState<number | null>(null)

  const [revIdx,  setRevIdx]  = useState(0)
  const revTimer = useRef<ReturnType<typeof setTimeout>>()

  const [nlName,  setNlName]  = useState('')
  const [nlEmail, setNlEmail] = useState('')
  const [nlSent,  setNlSent]  = useState(false)

  const [authModal, setAuthModal] = useState<null|'login'|'signup'|'forgot'>(null)
  const [amEmail,   setAmEmail]   = useState('')
  const [amPass,    setAmPass]    = useState('')
  const [amConf,    setAmConf]    = useState('')
  const [amName,    setAmName]    = useState('')
  const [amWA,      setAmWA]      = useState('')
  const [amAgree,   setAmAgree]   = useState(false)
  const [amLoading, setAmLoading] = useState(false)
  const [amError,   setAmError]   = useState('')
  const [amOk,      setAmOk]      = useState('')
  const [amForgotEmail, setAmForgotEmail] = useState('')
  const [pwState, setPwState] = useState({ length:false, upper:false, lower:false, number:false, special:false })

  const evalPw = (v: string) => setPwState({
    length: v.length >= 8, upper: /[A-Z]/.test(v), lower: /[a-z]/.test(v),
    number: /[0-9]/.test(v), special: /[^A-Za-z0-9]/.test(v),
  })
  const isPwStrong = (v: string) => { const s = { length: v.length >= 8, upper: /[A-Z]/.test(v), lower: /[a-z]/.test(v), number: /[0-9]/.test(v), special: /[^A-Za-z0-9]/.test(v) }; return Object.values(s).every(Boolean) }

  const openAuth = (f: 'login'|'signup') => {
    setAmError(''); setAmOk(''); setAmEmail(''); setAmPass(''); setAmConf('')
    setAmName(''); setAmWA(''); setAmAgree(false); setAmForgotEmail('')
    setPwState({ length:false, upper:false, lower:false, number:false, special:false })
    setAuthModal(f)
  }
  const closeAuth = () => setAuthModal(null)

  const [scrollPct, setScrollPct] = useState(0)
  const [showTop,   setShowTop]   = useState(false)

  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const t   = (ar: string, en: string) => lang === 'ar' ? ar : en
  const g   = (ar: string, en: string) => t(s[`lp_${ar}`] || '', s[`lp_${en}`] || '')

  useEffect(() => {
    fetch('/api/landing').then(r => r.json()).then(d => {
      setS(d.settings || {})
      setReady(true)
      setTimeout(() => setPreHide(true), 200)
    })
  }, [])

  const scrollElRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
    const getScrollEl = (): { target: EventTarget; el: HTMLElement } => {
      if (!embedded) return { target: window, el: document.documentElement }
      const c = document.querySelector('[data-scroll-container="1"]') as HTMLElement | null
      if (c) return { target: c, el: c }
      return { target: window, el: document.documentElement }
    }
    const { target, el } = getScrollEl()
    scrollElRef.current = el
    const h = () => {
      const pct = el.scrollTop / ((el.scrollHeight - el.clientHeight) || 1)
      setScrollPct(pct)
      setShowTop(el.scrollTop > 500)
    }
    target.addEventListener('scroll', h, { passive: true })
    return () => target.removeEventListener('scroll', h)
  }, [embedded])

  const reviews: Review[] = parse(s.lp_reviews, [])
  useEffect(() => {
    if (reviews.length < 2) return
    revTimer.current = setTimeout(() => setRevIdx(i => (i + 1) % reviews.length), 4500)
    return () => clearTimeout(revTimer.current)
  }, [revIdx, reviews.length])

  const toolLogos: ToolLogo[] = parse(s.lp_tool_logos, [])
  const logoSize = Number(s.lp_logo_size) || 44
  const features:  Feature[]  = parse(s.lp_features,   [])
  const stats:     Stat[]     = parse(s.lp_stats,      [])
  const faq:       FaqItem[]  = parse(s.lp_faq,        [])

  const logo     = s.lp_header_logo || s.logo_url || ''
  const siteName = s.lp_site_name   || 'Pro Keys'
  const signIn   = s.lp_signin_url  || '/u/login'

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  const marquee = [...toolLogos, ...toolLogos]

  useEffect(() => {
    document.body.style.overflow = authModal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [authModal])

  const R = 18; const C = 2 * Math.PI * R
  const ringOffset = C * (1 - scrollPct)

  if (!ready) return embedded ? (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:300}}>
      <div style={{display:'flex',gap:8}}>
        {[0,1,2].map(i=><span key={i} style={{width:9,height:9,borderRadius:'50%',background:'#d99401',display:'block',animation:`pkdot 1.1s ${i*0.18}s infinite cubic-bezier(0.45,0,0.55,1)`}}/>)}
      </div>
      <style>{`@keyframes pkdot{0%,80%,100%{opacity:.2;transform:translateY(0)}40%{opacity:1;transform:translateY(-7px)}}`}</style>
    </div>
  ) : (
    <div style={{ position:'fixed', inset:0, background:'linear-gradient(135deg,#0B5FC9,#1B2556)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ textAlign:'center', animation:'pkZoomIn .55s cubic-bezier(0.22,1,0.36,1) both' }}>
        {logo && <img src={logo} alt={siteName} style={{ height:120, marginBottom:20, display:'block', margin:'0 auto 20px' }}/>}
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          {[0,1,2].map(i => <span key={i} style={{ width:9, height:9, borderRadius:'50%', background:'rgba(255,255,255,0.9)', display:'block', animation:`pkdot 1.1s ${i*0.18}s infinite cubic-bezier(0.45,0,0.55,1)` }}/>)}
        </div>
      </div>
      <style>{`
        @keyframes pkZoomIn{0%{opacity:0;transform:scale(.82) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes pkdot{0%,80%,100%{opacity:.2;transform:translateY(0)}40%{opacity:1;transform:translateY(-7px)}}
      `}</style>
    </div>
  )

  return (
    <div dir={dir} style={{ fontFamily:"'Cairo',sans-serif", color:'#16213D', background:'#fff', overflowX:'hidden' }}>

      <div style={{ position:'fixed', top:0, left:0, height:3, width:`${scrollPct*100}%`, background:'#d99401', zIndex:999999, opacity:.9, transition:'width .1s' }}/>

      {!embedded && <header style={{ position:'sticky', top:0, zIndex:1000, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(10px)', borderBottom:'1px solid #EDD98A' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64, gap:16 }}>
          <a href="/" style={{ flexShrink:0 }}>
            {logo ? <img src={logo} alt={siteName} style={{ height:42, width:'auto' }}/> : <span style={{ fontWeight:900, fontSize:20, color:'#d99401' }}>{siteName}</span>}
          </a>
          <nav style={{ display:'flex', alignItems:'center', gap:24, fontSize:13.5, fontWeight:700, color:'#3D4A6B' }} className="lp-desk-nav">
            {features.length > 0 && <span onClick={() => scrollTo('features')} style={{ cursor:'pointer', whiteSpace:'nowrap' }} onMouseEnter={e=>(e.currentTarget.style.color='#d99401')} onMouseLeave={e=>(e.currentTarget.style.color='#3D4A6B')}>{t('المميزات','Features')}</span>}
            {stats.length    > 0 && <span onClick={() => scrollTo('stats')}    style={{ cursor:'pointer', whiteSpace:'nowrap' }} onMouseEnter={e=>(e.currentTarget.style.color='#d99401')} onMouseLeave={e=>(e.currentTarget.style.color='#3D4A6B')}>{t('أرقامنا','Numbers')}</span>}
            {faq.length      > 0 && <span onClick={() => scrollTo('faq')}      style={{ cursor:'pointer', whiteSpace:'nowrap' }} onMouseEnter={e=>(e.currentTarget.style.color='#d99401')} onMouseLeave={e=>(e.currentTarget.style.color='#3D4A6B')}>{t('الأسئلة الشائعة','FAQ')}</span>}
            {reviews.length  > 0 && <span onClick={() => scrollTo('reviews')}  style={{ cursor:'pointer', whiteSpace:'nowrap' }} onMouseEnter={e=>(e.currentTarget.style.color='#d99401')} onMouseLeave={e=>(e.currentTarget.style.color='#3D4A6B')}>{t('التقييمات','Reviews')}</span>}
          </nav>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} style={{ background:'#fff', border:'1.5px solid #EDD98A', color:'#1B2556', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:13, padding:'9px 14px', borderRadius:10, cursor:'pointer', whiteSpace:'nowrap' }}>{lang === 'ar' ? '🇬🇧 EN' : '🇪🇬 AR'}</button>
            <button onClick={() => openAuth('login')} style={{ background:'#1B2556', color:'#fff', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:14, padding:'10px 22px', borderRadius:10, border:'none', cursor:'pointer', whiteSpace:'nowrap' }}>{t('تسجيل الدخول','Sign In')}</button>
            <button onClick={() => setMenuOpen(v => !v)} className="lp-ham" style={{ display:'none', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:9, border:'1.5px solid #EDD98A', background:'#fff', cursor:'pointer', color:'#1B2556' }}>
              <svg viewBox="0 0 24 24" style={{ width:20, height:20, stroke:'currentColor', fill:'none', strokeWidth:2, strokeLinecap:'round' }}>
                {menuOpen ? <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></> : <><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div style={{ borderTop:'1px solid #EDD98A', background:'#fff', padding:'8px 0 16px' }}>
            {[
              features.length > 0 && { id:'features', ar:'المميزات',      en:'Features' },
              stats.length    > 0 && { id:'stats',    ar:'أرقامنا',        en:'Numbers' },
              faq.length      > 0 && { id:'faq',      ar:'الأسئلة الشائعة',en:'FAQ' },
              reviews.length  > 0 && { id:'reviews',  ar:'التقييمات',      en:'Reviews' },
            ].filter(Boolean).map((item: any) => (
              <button key={item.id} onClick={() => scrollTo(item.id)} style={{ display:'block', width:'100%', padding:'13px 20px', textAlign: lang==='ar' ? 'right' : 'left', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:14, color:'#1B2556', background:'none', border:'none', borderBottom:'1px solid #EDD98A', cursor:'pointer' }}>{t(item.ar, item.en)}</button>
            ))}
            <div style={{ display:'flex', gap:8, padding:'10px 20px' }}>
              <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')} style={{ background:'#fff', border:'1.5px solid #EDD98A', color:'#1B2556', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:13, padding:'9px 14px', borderRadius:10, cursor:'pointer' }}>{lang === 'ar' ? '🇬🇧 EN' : '🇪🇬 AR'}</button>
              <button onClick={() => openAuth('login')} style={{ flex:1, background:'#1B2556', color:'#fff', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:14, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer', textAlign:'center' }}>{t('تسجيل الدخول','Sign In')}</button>
            </div>
          </div>
        )}
      </header>}

      <section style={{ position:'relative', padding:'80px 0 60px', background:'radial-gradient(1200px 500px at 85% -10%, #FBF2D8, transparent 60%)' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }} className="lp-hero-grid">
          <div>
            {(s.lp_hero_badge || s.lp_hero_badge_ar || s.lp_hero_badge_en) && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:13, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:20, border:'1px solid #EDD98A' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>
                {lang === 'ar' ? (s.lp_hero_badge_ar || s.lp_hero_badge || s.lp_hero_badge_en) : (s.lp_hero_badge_en || s.lp_hero_badge || s.lp_hero_badge_ar)}
              </span>
            )}
            <h1 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:800, lineHeight:1.32, color:'#1B2556', marginBottom:18, whiteSpace:'pre-line' }}>
              {(t(s.lp_hero_title_ar || '', s.lp_hero_title_en || '')).split('\n').map((line, i) => (
                <span key={i} style={{ display:'block' }}>
                  {i === 0 ? line : <span style={{ background:'linear-gradient(90deg,#d99401,#b87e00)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{line}</span>}
                </span>
              ))}
            </h1>
            {(s.lp_hero_sub_ar || s.lp_hero_sub_en) && <p style={{ fontSize:15.5, color:'#6B7494', maxWidth:500, marginBottom:28, lineHeight:1.8 }}>{t(s.lp_hero_sub_ar || '', s.lp_hero_sub_en || '')}</p>}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <a href={s.lp_hero_cta_url || signIn} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#d99401', color:'#fff', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:15, padding:'14px 32px', borderRadius:10, textDecoration:'none', boxShadow:'0 8px 22px rgba(217,148,1,.35)' }}>
                🛒 {t(s.lp_hero_cta_ar || 'تسوق الآن', s.lp_hero_cta_en || 'Shop Now')}
              </a>
              {(s.lp_hero_cta2_ar || s.lp_hero_cta2_en) && (
                <button onClick={() => openAuth('signup')} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#fff', color:'#1B2556', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:15, padding:'14px 28px', borderRadius:10, border:'1.5px solid #DCE4F1', cursor:'pointer' }}>
                  👤 {t(s.lp_hero_cta2_ar || '', s.lp_hero_cta2_en || '')}
                </button>
              )}
            </div>
          </div>
          {s.lp_hero_image ? (
            <div style={{ borderRadius:20, overflow:'hidden', border:'1.5px solid #EDD98A', boxShadow:'0 20px 48px -16px rgba(27,37,86,.12)' }}>
              <img src={s.lp_hero_image} alt="hero" style={{ width:'100%', display:'block' }}/>
            </div>
          ) : (
            <div style={{ borderRadius:20, border:'1.5px dashed #EDD98A', minHeight:260, display:'flex', alignItems:'center', justifyContent:'center', background:'#FFFDF5', color:'#EDD98A', fontSize:48 }}>🔑</div>
          )}
        </div>
        {toolLogos.length > 0 && (
          <div style={{ marginTop:60, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:'0 0 0 auto', left:0, top:0, bottom:0, width:96, background:'linear-gradient(to right,#fff,transparent)', zIndex:2, pointerEvents:'none' }}/>
            <div style={{ position:'absolute', right:0, top:0, bottom:0, width:96, background:'linear-gradient(to left,#fff,transparent)', zIndex:2, pointerEvents:'none' }}/>
            <p style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'#6B7494', letterSpacing:2, textTransform:'uppercase', marginBottom:20 }}>{t('الأدوات والمنتجات المتاحة','Available Tools & Products')}</p>
            <div className="lp-marquee-track">
              {marquee.map((logo, i) => (
                <div key={i} className="lp-marquee-item" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {logo.url ? <img src={logo.url} alt={logo.name} style={{ height:logoSize, maxWidth: logoSize * 2.5, objectFit:'contain', display:'block' }}/> : <span style={{ fontSize:12, color:'#6B7494', whiteSpace:'nowrap' }}>{logo.name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {features.length > 0 && (
        <section id="features" style={{ padding:'80px 0', background:'#F9F6EE' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px' }}>
            <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 52px' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:12.5, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:16, border:'1px solid #EDD98A' }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>{t('ليه تختارنا','WHY CHOOSE US')}</span>
              <h2 style={{ fontSize:30, fontWeight:800, color:'#1B2556', marginBottom:8 }}>{t(s.lp_feat_title_ar || 'ليه تختار Pro Keys؟', s.lp_feat_title_en || 'Why Choose Pro Keys?').split(' ').map((word, i, arr) => i === arr.length - 1 ? <span key={i} style={{ background:'linear-gradient(90deg,#d99401,#b87e00)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}> {word}</span> : <span key={i}>{i === 0 ? word : ' ' + word}</span>)}</h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:28 }} className="lp-feat-grid">
              {features.map((f, i) => (
                <div key={f.id || i} className="lp-card" style={{ background:'#fff', border:'1px solid #DCE4F1', borderRadius:20, padding:'40px 36px', transition:'all .2s' }}>
                  <div style={{ fontSize:48, marginBottom:22, lineHeight:1 }}>{f.icon}</div>
                  <h3 style={{ fontSize:20, fontWeight:800, color:'#1B2556', marginBottom:12 }}>{t(f.title_ar, f.title_en)}</h3>
                  <p style={{ fontSize:15, color:'#6B7494', lineHeight:1.85 }}>{t(f.desc_ar, f.desc_en)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {stats.length > 0 && (
        <section id="stats" style={{ padding:'80px 0', background:'linear-gradient(135deg,#1B2556,#2A3A78)' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', textAlign:'center' }}>
            <h2 style={{ fontSize:30, fontWeight:800, color:'#fff', marginBottom:8 }}>{t(s.lp_stats_title_ar || 'أرقامنا', s.lp_stats_title_en || 'Our Numbers')}</h2>
            {(s.lp_stats_sub_ar || s.lp_stats_sub_en) && <p style={{ color:'rgba(255,255,255,.65)', fontSize:14.5, marginBottom:48 }}>{t(s.lp_stats_sub_ar || '', s.lp_stats_sub_en || '')}</p>}
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${stats.length},1fr)`, gap:32, marginTop:40 }} className="lp-stats-grid">
              {stats.map((st, i) => (
                <div key={st.id || i} style={{ padding:'32px 24px', borderRadius:16, background:'rgba(255,255,255,.07)', border:'1px solid rgba(217,148,1,.3)' }}>
                  <div style={{ fontSize:'clamp(36px,5vw,52px)', fontWeight:900, color:'#d99401', fontVariantNumeric:'tabular-nums', lineHeight:1, marginBottom:10 }}><Counter target={parseInt(st.number) || 0} suffix={st.suffix}/></div>
                  <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:2 }}>{t(st.label_ar, st.label_en)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(s.lp_map_image || s.lp_map_title_ar || s.lp_map_title_en) && (
        <section style={{ padding:'80px 0' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', textAlign:'center' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:12.5, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:16, border:'1px solid #EDD98A' }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>{t('عملاؤنا حول العالم','Our Clients Worldwide')}</span>
            <h2 style={{ fontSize:30, fontWeight:800, color:'#1B2556', marginBottom:8 }}>{t(s.lp_map_title_ar || '', s.lp_map_title_en || '')}</h2>
            {(s.lp_map_sub_ar || s.lp_map_sub_en) && <p style={{ color:'#6B7494', fontSize:15, maxWidth:640, margin:'0 auto 36px', lineHeight:1.8 }}>{t(s.lp_map_sub_ar || '', s.lp_map_sub_en || '')}</p>}
            {s.lp_map_image && <div style={{ borderRadius:20, overflow:'hidden', border:'1.5px solid #EDD98A', boxShadow:'0 20px 48px -16px rgba(27,37,86,.12)', marginTop:16 }}><img src={s.lp_map_image} alt="clients map" style={{ width:'100%', display:'block' }}/></div>}
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section id="faq" style={{ padding:'80px 0', background:'#F9F6EE' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px' }}>
            <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 52px' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:12.5, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:16, border:'1px solid #EDD98A' }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>{t('أسئلة شائعة','FAQ')}</span>
              <h2 style={{ fontSize:30, fontWeight:800, color:'#1B2556', marginBottom:8 }}>{t(s.lp_faq_title_ar || 'الأسئلة الشائعة', s.lp_faq_title_en || 'Frequently Asked Questions')}</h2>
              {(s.lp_faq_sub_ar || s.lp_faq_sub_en) && <p style={{ color:'#6B7494', fontSize:15 }}>{t(s.lp_faq_sub_ar || '', s.lp_faq_sub_en || '')}</p>}
            </div>
            <div style={{ maxWidth:860, margin:'0 auto' }}>
              {faq.map((item, i) => (
                <div key={item.id || i} style={{ border:'1px solid #DCE4F1', borderRadius:12, marginBottom:12, overflow:'hidden' }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 26px', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:15, color:'#1B2556', background:'#fff', border:'none', cursor:'pointer', gap:14, textAlign: lang==='ar' ? 'right' : 'left' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ flexShrink:0, width:26, height:26, borderRadius:8, background:'#FBF2D8', color:'#b87e00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800 }}>؟</span>
                      <span>{t(item.q_ar, item.q_en)}</span>
                    </div>
                    <span style={{ color:'#6B7494', fontSize:12, flexShrink:0, transition:'transform .2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>
                  {openFaq === i && <div style={{ background:'#F9F6EE', borderTop:'1px solid #DCE4F1', padding:'18px 26px 24px', fontSize:14, color:'#6B7494', lineHeight:1.9 }}>{t(item.a_ar, item.a_en)}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section id="reviews" style={{ padding:'80px 0' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px' }}>
            <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 52px' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:12.5, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:16, border:'1px solid #EDD98A' }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>{t('آراء العملاء','Customer Reviews')}</span>
              <h2 style={{ fontSize:30, fontWeight:800, color:'#1B2556', marginBottom:8 }}>{t(s.lp_rev_title_ar || 'ماذا يقول عملاؤنا', s.lp_rev_title_en || 'What Our Clients Say')}</h2>
            </div>
            <div style={{ maxWidth:720, margin:'0 auto' }}>
              {(() => {
                const rev = reviews[revIdx]
                return (
                  <div style={{ background:'#FFFDF5', border:'1.5px solid #EDD98A', borderRadius:20, padding:'40px 48px', textAlign:'center', boxShadow:'0 16px 40px -16px rgba(27,37,86,.10)' }}>
                    <div style={{ display:'flex', justifyContent:'center', gap:4, marginBottom:20 }}>
                      {[1,2,3,4,5].map(n => (<svg key={n} viewBox="0 0 24 24" style={{ width:20, height:20, fill: n <= rev.stars ? '#d99401' : '#DCE4F1', stroke:'none' }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>))}
                    </div>
                    <p style={{ fontSize:15.5, color:'#3D4A6B', lineHeight:2, marginBottom:28 }}>"{t(rev.text_ar, rev.text_en)}"</p>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
                      {rev.photo ? <img src={rev.photo} alt={rev.name} style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', border:'2px solid #d99401' }}/> : <div style={{ width:52, height:52, borderRadius:'50%', background:'#FBF2D8', border:'2px solid #d99401', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#d99401' }}>{rev.name.charAt(0)}</div>}
                      <div style={{ textAlign: lang==='ar' ? 'right' : 'left' }}>
                        <div style={{ fontWeight:800, fontSize:15, color:'#1B2556' }}>{rev.name}</div>
                        {rev.location && <div style={{ fontSize:12.5, color:'#6B7494', marginTop:2 }}>{rev.location}</div>}
                      </div>
                    </div>
                  </div>
                )
              })()}
              {reviews.length > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:24 }}>
                  <button onClick={() => { clearTimeout(revTimer.current); setRevIdx(i => (i - 1 + reviews.length) % reviews.length) }} style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid #DCE4F1', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#1B2556' }}>{lang === 'ar' ? '›' : '‹'}</button>
                  <div style={{ display:'flex', gap:6 }}>{reviews.map((_, i) => (<button key={i} onClick={() => { clearTimeout(revTimer.current); setRevIdx(i) }} style={{ borderRadius:999, border:'none', cursor:'pointer', transition:'all .3s', background: i === revIdx ? '#d99401' : '#DCE4F1', width: i === revIdx ? 22 : 8, height:8 }}/>))}</div>
                  <button onClick={() => { clearTimeout(revTimer.current); setRevIdx(i => (i + 1) % reviews.length) }} style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid #DCE4F1', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#1B2556' }}>{lang === 'ar' ? '‹' : '›'}</button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {(s.lp_nl_title_ar || s.lp_nl_title_en) && (
        <section style={{ padding:'80px 24px' }}>
          <div style={{ maxWidth:1132, margin:'0 auto', background:'linear-gradient(135deg,#1B2556,#2A3A78)', borderRadius:24, padding:'56px 40px', textAlign:'center', color:'#fff' }}>
            <h2 style={{ fontSize:28, fontWeight:800, marginBottom:12 }}>{t(s.lp_nl_title_ar || 'فاتك عرض ميتفوتش؟', s.lp_nl_title_en || 'Missed a deal?')}</h2>
            {(s.lp_nl_sub_ar || s.lp_nl_sub_en) && <p style={{ color:'rgba(255,255,255,.7)', marginBottom:32, fontSize:14.5, maxWidth:480, margin:'0 auto 32px' }}>{t(s.lp_nl_sub_ar || '', s.lp_nl_sub_en || '')}</p>}
            {nlSent
              ? <div style={{ background:'rgba(14,159,110,.15)', border:'1px solid rgba(14,159,110,.4)', borderRadius:12, padding:'18px 32px', display:'inline-block', color:'#6EE7B7', fontWeight:700 }}>{t('✅ تم الاشتراك بنجاح! شكراً ليك 🎉', '✅ Subscribed successfully! Thank you 🎉')}</div>
              : <form onSubmit={e => { e.preventDefault(); if (nlEmail) setNlSent(true) }} style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:420, margin:'0 auto' }}>
                  <input value={nlName} onChange={e => setNlName(e.target.value)} placeholder={t(s.lp_nl_name_ar || 'الاسم', s.lp_nl_name_en || 'Name')} style={{ padding:'13px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'#fff', fontFamily:"'Cairo',sans-serif", fontSize:14, outline:'none' }}/>
                  <input type="email" required value={nlEmail} onChange={e => setNlEmail(e.target.value)} placeholder={t(s.lp_nl_email_ar || 'البريد الإلكتروني', s.lp_nl_email_en || 'Email address')} style={{ padding:'13px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'#fff', fontFamily:"'Cairo',sans-serif", fontSize:14, outline:'none' }}/>
                  <button type="submit" style={{ padding:'14px', borderRadius:10, border:'none', background:'#d99401', color:'#fff', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:15, cursor:'pointer', boxShadow:'0 8px 22px rgba(217,148,1,.4)' }}>{t(s.lp_nl_btn_ar || 'اشترك في نشرتنا الإخبارية', s.lp_nl_btn_en || 'Subscribe')}</button>
                </form>}
          </div>
        </section>
      )}

      <footer style={{ padding:'36px 0', borderTop:'1px solid #DCE4F1', background:'#fff' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px' }}>
          {s.lp_footer_html ? <div dangerouslySetInnerHTML={{ __html: s.lp_footer_html }} style={{ fontSize:12.5, color:'#6B7494' }}/> : <p style={{ textAlign:'center', fontSize:12.5, color:'#6B7494' }}><strong>{siteName}</strong> © {new Date().getFullYear()}</p>}
        </div>
      </footer>

      {!embedded && (
        <button onClick={() => window.scrollTo({top:0,behavior:'smooth'})} aria-label="Back to top"
          style={{ position:'fixed', bottom:20, right: lang==='ar' ? 'auto' : 20, left: lang==='ar' ? 20 : 'auto', top:'auto', zIndex:999999, width:46, height:46, borderRadius:'50%', border:'none', background:'#1B2556', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 22px rgba(27,37,86,.28)', opacity: showTop ? 1 : 0, pointerEvents: showTop ? 'auto' : 'none', transform: showTop ? 'translateY(0)' : 'translateY(10px)', transition:'all .25s' }}>
          <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
            <circle cx="23" cy="23" r={R} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3"/>
            <circle cx="23" cy="23" r={R} fill="none" stroke="#d99401" strokeWidth="3" strokeLinecap="round" transform="rotate(-90 23 23)" strokeDasharray={C} strokeDashoffset={ringOffset}/>
            <path d="M17 26L23 20L29 26" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{overflow-x:hidden;}
        a{text-decoration:none;color:inherit;}
        input::placeholder{color:rgba(255,255,255,.4);}
        .lp-card:hover{transform:translateY(-3px);box-shadow:0 16px 32px -12px rgba(27,37,86,.14);border-color:#EDD98A !important;}
        @keyframes lpmarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .lp-marquee-track{display:flex;width:max-content;animation:lpmarquee 28s linear infinite;}
        .lp-marquee-track:hover{animation-play-state:paused;}
        .lp-marquee-item{flex-shrink:0;margin-inline-end:40px;}
        [dir="rtl"] .lp-marquee-track{animation-direction:reverse;}
        @media(max-width:860px){.lp-hero-grid{grid-template-columns:1fr !important;}.lp-feat-grid{grid-template-columns:1fr !important;}.lp-stats-grid{grid-template-columns:1fr !important;}.lp-desk-nav{display:none !important;}.lp-ham{display:inline-flex !important;}}
        @media(max-width:600px){section{padding:56px 0 !important;}}
        #lpAmOverlay{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .2s ease;}
        #lpAmOverlay.am-vis{opacity:1;}
        #lpAmCard{width:100%;max-width:460px;max-height:min(640px,92vh);background:#fff;border-radius:18px;box-shadow:0 25px 70px rgba(0,0,0,.2);overflow:hidden;display:flex;flex-direction:column;transform:translateY(16px) scale(.97);transition:transform .25s ease;}
        #lpAmOverlay.am-vis #lpAmCard{transform:translateY(0) scale(1);}
        .am-hdr{flex-shrink:0;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(217,148,1,.08),rgba(217,148,1,.03));border-bottom:1px solid #EDD98A;}
        .am-body{padding:20px 24px;overflow-y:auto;flex:1;min-height:0;}
        .am-title{text-align:center;margin-bottom:14px;}
        .am-title h2{font-size:19px;font-weight:800;color:#1B2556;margin-bottom:3px;}
        .am-title p{font-size:12px;color:#6B7494;font-weight:500;}
        .am-tabs{display:flex;border-bottom:2px solid #EDD98A;margin-bottom:14px;}
        .am-tab{flex:1;padding:9px 6px;background:none;border:none;cursor:pointer;font-size:12.5px;font-weight:700;color:#6B7494;border-bottom:2px solid transparent;font-family:'Cairo',sans-serif;transition:color .15s;}
        .am-tab.on{color:#d99401;border-bottom-color:#d99401;}
        .am-grp{margin-bottom:10px;}
        .am-grp label{display:block;font-size:12px;font-weight:700;color:#1B2556;margin-bottom:4px;}
        .am-grp input{width:100%;padding:9px 12px;border:1px solid #DCE4F1;border-radius:8px;font-size:13.5px;font-family:'Cairo',sans-serif;box-sizing:border-box;outline:none;transition:border-color .15s;}
        .am-grp input:focus{border-color:#d99401;box-shadow:0 0 0 3px rgba(217,148,1,.12);}
        .am-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .am-err{padding:8px 11px;border-radius:7px;margin-bottom:10px;font-size:12px;font-weight:600;background:#FEE2E2;color:#991B1B;border-inline-start:3px solid #EF4444;}
        .am-ok{padding:8px 11px;border-radius:7px;margin-bottom:10px;font-size:12px;font-weight:600;background:#DCFCE7;color:#166534;border-inline-start:3px solid #22C55E;}
        .am-btn{width:100%;padding:11px;border:none;border-radius:9px;font-size:13px;font-weight:800;font-family:'Cairo',sans-serif;cursor:pointer;background:linear-gradient(135deg,#d99401,#b87e00);color:#fff;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:6px;transition:box-shadow .2s;}
        .am-btn:hover{box-shadow:0 6px 16px rgba(217,148,1,.4);}
        .am-btn:disabled{opacity:.6;cursor:not-allowed;}
        .am-div{display:flex;align-items:center;text-align:center;margin:13px 0;font-size:12px;color:#94A3B8;gap:0;}
        .am-div::before,.am-div::after{content:'';flex:1;border-bottom:1px solid #EDD98A;}
        .am-div span{padding:0 10px;}
        .am-google{width:100%;padding:9px;border:1.5px solid #DCE4F1;border-radius:9px;background:#fff;color:#1B2556;font-size:13px;font-weight:700;font-family:'Cairo',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:background .15s;}
        .am-google:hover{background:#F9F6EE;}
        .am-footer{text-align:center;margin-top:12px;font-size:12px;color:#6B7494;font-weight:500;}
        .am-footer button{color:#d99401;font-weight:700;background:none;border:none;cursor:pointer;font-family:'Cairo',sans-serif;font-size:12px;}
        .am-forgot-link{font-size:12px;color:#EF4444;font-weight:700;background:none;border:none;cursor:pointer;font-family:'Cairo',sans-serif;float:inline-end;margin-top:3px;}
        .am-rules{list-style:none;padding:0;margin:0 0 10px;font-size:11px;}
        .am-rules li{margin-bottom:3px;transition:color .2s;}
        .am-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,.35);border-top:2px solid #fff;border-radius:50%;animation:amSpin .6s linear infinite;display:inline-block;}
        @keyframes amSpin{to{transform:rotate(360deg)}}
        .am-check{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:12px;color:#6B7494;cursor:pointer;}
        .am-check input{width:14px;height:14px;accent-color:#d99401;}
        .am-forgot-icon{width:48px;height:48px;margin:0 auto 12px;background:#FBF2D8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;}
        @media(max-width:500px){.am-row{grid-template-columns:1fr;}.am-body{padding:16px 16px;}}
      `}</style>

      {mounted && authModal && createPortal(
        <AuthModal
          authModal={authModal} lang={lang} logo={logo} siteName={siteName}
          amEmail={amEmail} setAmEmail={setAmEmail} amPass={amPass} setAmPass={setAmPass}
          amConf={amConf} setAmConf={setAmConf} amName={amName} setAmName={setAmName}
          amWA={amWA} setAmWA={setAmWA} amAgree={amAgree} setAmAgree={setAmAgree}
          amLoading={amLoading} setAmLoading={setAmLoading} amError={amError} setAmError={setAmError}
          amOk={amOk} setAmOk={setAmOk} amForgotEmail={amForgotEmail} setAmForgotEmail={setAmForgotEmail}
          pwState={pwState} evalPw={evalPw} isPwStrong={isPwStrong}
          setAuthModal={setAuthModal} closeAuth={closeAuth}
        />,
        document.body
      )}
    </div>
  )
}
