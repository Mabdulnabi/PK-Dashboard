'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AUTH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
  #amOverlay{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:16px;}
  #amCard{width:100%;max-width:460px;max-height:min(640px,92vh);background:#fff;border-radius:18px;box-shadow:0 25px 70px rgba(0,0,0,.22);overflow:hidden;display:flex;flex-direction:column;animation:amSlideIn .22s ease;}
  @keyframes amSlideIn{from{transform:translateY(14px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
  .am-hdr{flex-shrink:0;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(217,148,1,.08),rgba(217,148,1,.03));border-bottom:1px solid #EDD98A;}
  .am-body{padding:20px 24px;overflow-y:auto;flex:1;min-height:0;}
  .am-title{text-align:center;margin-bottom:14px;}
  .am-title h2{font-size:19px;font-weight:800;color:#1B2556;margin-bottom:3px;font-family:'Cairo',sans-serif;}
  .am-title p{font-size:12px;color:#6B7494;font-weight:500;font-family:'Cairo',sans-serif;}
  .am-tabs{display:flex;border-bottom:2px solid #EDD98A;margin-bottom:14px;}
  .am-tab{flex:1;padding:9px 6px;background:none;border:none;cursor:pointer;font-size:12.5px;font-weight:700;color:#6B7494;border-bottom:2px solid transparent;font-family:'Cairo',sans-serif;transition:color .15s;}
  .am-tab.on{color:#d99401;border-bottom-color:#d99401;}
  .am-grp{margin-bottom:10px;}
  .am-grp label{display:block;font-size:12px;font-weight:700;color:#1B2556;margin-bottom:4px;font-family:'Cairo',sans-serif;}
  .am-grp input{width:100%;padding:9px 12px;border:1px solid #DCE4F1;border-radius:8px;font-size:13.5px;font-family:'Cairo',sans-serif;box-sizing:border-box;outline:none;transition:border-color .15s;}
  .am-grp input:focus{border-color:#d99401;box-shadow:0 0 0 3px rgba(217,148,1,.12);}
  .am-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .am-err{padding:8px 11px;border-radius:7px;margin-bottom:10px;font-size:12px;font-weight:600;background:#FEE2E2;color:#991B1B;border-inline-start:3px solid #EF4444;font-family:'Cairo',sans-serif;}
  .am-ok{padding:8px 11px;border-radius:7px;margin-bottom:10px;font-size:12px;font-weight:600;background:#DCFCE7;color:#166534;border-inline-start:3px solid #22C55E;font-family:'Cairo',sans-serif;}
  .am-btn{width:100%;padding:11px;border:none;border-radius:9px;font-size:13px;font-weight:800;font-family:'Cairo',sans-serif;cursor:pointer;background:linear-gradient(135deg,#d99401,#b87e00);color:#fff;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:6px;transition:box-shadow .2s;}
  .am-btn:hover{box-shadow:0 6px 16px rgba(217,148,1,.4);}
  .am-btn:disabled{opacity:.6;cursor:not-allowed;}
  .am-div{display:flex;align-items:center;text-align:center;margin:13px 0;font-size:12px;color:#94A3B8;gap:0;}
  .am-div::before,.am-div::after{content:'';flex:1;border-bottom:1px solid #EDD98A;}
  .am-div span{padding:0 10px;}
  .am-google{width:100%;padding:9px;border:1.5px solid #DCE4F1;border-radius:9px;background:#fff;color:#1B2556;font-size:13px;font-weight:700;font-family:'Cairo',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:background .15s;}
  .am-google:hover{background:#F9F6EE;}
  .am-footer{text-align:center;margin-top:12px;font-size:12px;color:#6B7494;font-weight:500;font-family:'Cairo',sans-serif;}
  .am-footer button{color:#d99401;font-weight:700;background:none;border:none;cursor:pointer;font-family:'Cairo',sans-serif;font-size:12px;}
  .am-forgot-link{font-size:12px;color:#EF4444;font-weight:700;background:none;border:none;cursor:pointer;font-family:'Cairo',sans-serif;float:inline-end;margin-top:3px;}
  .am-rules{list-style:none;padding:0;margin:0 0 10px;font-size:11px;font-family:'Cairo',sans-serif;}
  .am-rules li{margin-bottom:3px;transition:color .2s;}
  .am-spin{width:12px;height:12px;border:2px solid rgba(255,255,255,.35);border-top:2px solid #fff;border-radius:50%;animation:amSpin .6s linear infinite;display:inline-block;}
  @keyframes amSpin{to{transform:rotate(360deg)}}
  .am-check{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:12px;color:#6B7494;cursor:pointer;font-family:'Cairo',sans-serif;}
  .am-check input{width:14px;height:14px;accent-color:#d99401;}
  .am-forgot-icon{width:48px;height:48px;margin:0 auto 12px;background:#FBF2D8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;}
  @media(max-width:500px){.am-row{grid-template-columns:1fr;}.am-body{padding:16px 16px;}}
`

const GoogleSVG = () => (
  <svg viewBox="0 0 48 48" style={{ width:17, height:17, flexShrink:0 }}>
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
)

interface Props {
  initialTab?: 'login' | 'signup'
  onClose: () => void
  lang?: 'ar' | 'en'
  logo?: string
  siteName?: string
}

export default function AuthModal({ initialTab = 'login', onClose, lang = 'ar', logo = '', siteName = 'Pro Keys' }: Props) {
  const [tab,   setTab]   = useState<'login'|'signup'|'forgot'>(initialTab)
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [conf,  setConf]  = useState('')
  const [name,  setName]  = useState('')
  const [wa,    setWa]    = useState('')
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [ok,      setOk]      = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [pw, setPw] = useState({ length:false, upper:false, lower:false, number:false, special:false })

  const evalPw = (v: string) => setPw({
    length: v.length >= 8,
    upper:  /[A-Z]/.test(v),
    lower:  /[a-z]/.test(v),
    number: /[0-9]/.test(v),
    special:/[!@#$%^&*]/.test(v),
  })
  const isPwStrong = (v: string) => v.length>=8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v) && /[!@#$%^&*]/.test(v)

  const switchTo = (f: 'login'|'signup'|'forgot') => { setError(''); setOk(''); setTab(f) }

  const isAr = lang === 'ar'
  const t = (ar: string, en: string) => isAr ? ar : en

  const L = {
    loginTitle: t('دخول مستخدم','Welcome back'),
    loginSub:   t('أدخل بيانات حسابك للمتابعة','Enter your details to continue'),
    signupTitle:t('إنشاء حساب جديد','Create your account'),
    signupSub:  t('انضم لـ Pro Keys في أقل من دقيقة','Join Pro Keys in under a minute'),
    forgotTitle:t('استعادة كلمة المرور','Reset your password'),
    forgotSub:  t('هنبعتلك لينك على إيميلك',"We'll email you a reset link"),
    email: t('البريد الإلكتروني','Email address'),
    pass:  t('كلمة المرور','Password'),
    conf:  t('تأكيد','Confirm'),
    name:  t('الاسم الكامل','Full name'),
    wa:    t('رقم الواتساب','WhatsApp number'),
    forgot:     t('هل نسيت كلمة المرور؟','Forgot password?'),
    loginBtn:   t('دخول','Sign In'),
    signupBtn:  t('إنشاء حساب','Create account'),
    sendLink:   t('إرسال الرابط','Send link'),
    googleLogin:  t('الدخول بحساب Google','Sign in with Google'),
    googleSignup: t('التسجيل بحساب Google','Sign up with Google'),
    noAccount:    t('ليس لديك حساب؟',"Don't have an account?"),
    makeAccount:  t('إنشاء حساب جديد','Create one now'),
    haveAccount:  t('لديك حساب؟','Already have an account?'),
    doLogin:      t('تسجيل دخول','Sign in'),
    backLogin:    t('← رجوع لتسجيل الدخول','← Back to sign in'),
    terms:        t('أوافق على شروط الخدمة','I agree to the Terms of Service'),
    fill:         t('من فضلك املأ كل الحقول','Please fill in all fields'),
    pwWeak:       t('كلمة المرور لازم تحقق كل الشروط','Password must meet all requirements'),
    mismatch:     t('كلمتا المرور غير متطابقتين','Passwords do not match'),
    termsErr:     t('من فضلك وافق على شروط الخدمة','Please agree to the Terms of Service'),
    redirecting:  t('جاري تحويلك...','Redirecting...'),
    created:      t('تم إنشاء الحساب بنجاح!','Account created!'),
    sent:         t('اتبعت! تحقق من صندوق الوارد.','Sent! Check your inbox.'),
    ruleLen:  t('8 أحرف على الأقل','At least 8 characters'),
    ruleUp:   t('حرف كبير واحد على الأقل (A-Z)','At least one uppercase (A-Z)'),
    ruleLo:   t('حرف صغير واحد على الأقل (a-z)','At least one lowercase (a-z)'),
    ruleNum:  t('رقم واحد على الأقل (0-9)','At least one number (0-9)'),
    ruleSpec: t('رمز خاص واحد على الأقل (!@#$%^&*)','At least one special char (!@#$%^&*)'),
    or: t('أو','or'),
    login:  t('دخول','Sign In'),
    signup: t('إنشاء حساب','Sign Up'),
  }

  const rules = [
    { key:'length',  label:L.ruleLen,  ok:pw.length },
    { key:'upper',   label:L.ruleUp,   ok:pw.upper },
    { key:'lower',   label:L.ruleLo,   ok:pw.lower },
    { key:'number',  label:L.ruleNum,  ok:pw.number },
    { key:'special', label:L.ruleSpec, ok:pw.special },
  ]

  const doLogin = async () => {
    if (!email || !pass) { setError(L.fill); return }
    setLoading(true); setError(''); setOk('')
    const res = await fetch('/api/auth/member-login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password: pass }),
    })
    const d = await res.json()
    if (!res.ok) {
      const msgs: Record<string,string> = {
        invalid_credentials:  t('بيانات غير صحيحة','Invalid credentials'),
        subscription_expired: t('الاشتراك منتهي','Subscription expired'),
        member_inactive:      t('الحساب موقوف','Account suspended'),
        too_many_attempts:    t('محاولات كثيرة، حاول لاحقاً','Too many attempts, try later'),
        device_locked:        t('الحساب مسجل على جهاز آخر','Account logged in on another device'),
      }
      setError(msgs[d.error] || d.error || t('فشل تسجيل الدخول','Login failed'))
      setLoading(false); return
    }
    setOk(L.redirecting)
    setTimeout(() => { window.location.href = '/u/dashboard' }, 900)
  }

  const doSignup = async () => {
    if (!name || !email || !wa || !pass || !conf) { setError(L.fill); return }
    if (!isPwStrong(pass)) { setError(L.pwWeak); return }
    if (pass !== conf) { setError(L.mismatch); return }
    if (!agree) { setError(L.termsErr); return }
    setLoading(true); setError(''); setOk('')
    const res = await fetch('/api/auth/member-signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password: pass, full_name: name, whatsapp: wa }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) {
      const msgs: Record<string,string> = {
        email_taken: t('البريد مستخدم بالفعل','Email already registered'),
      }
      setError(msgs[d.error] || d.error || t('فشل إنشاء الحساب','Signup failed')); return
    }
    setOk(L.created)
    setTimeout(() => { window.location.href = '/u/dashboard' }, 900)
  }

  const doForgot = async () => {
    if (!forgotEmail) { setError(L.fill); return }
    setLoading(true); setError(''); setOk('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + '/u/dashboard',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setOk(L.sent)
  }

  const doGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  const Spinner = () => <span className="am-spin"/>

  const titleMap = { login:L.loginTitle, signup:L.signupTitle, forgot:L.forgotTitle }
  const subMap   = { login:L.loginSub,   signup:L.signupSub,   forgot:L.forgotSub }

  return (
    <>
      <style>{AUTH_CSS}</style>
      <div id="amOverlay" dir={isAr ? 'rtl' : 'ltr'}
        style={{ fontFamily:"'Cairo',sans-serif" }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div id="amCard">
          {/* Header */}
          <div className="am-hdr">
            {logo
              ? <img src={logo} alt={siteName} style={{ height:36, width:'auto' }}/>
              : <span style={{ fontWeight:900, fontSize:18, color:'#d99401' }}>{siteName}</span>}
            <button onClick={onClose} style={{ border:'none', background:'#F9F6EE', width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:14, color:'#3D4A6B', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          </div>

          {/* Body */}
          <div className="am-body">
            <div className="am-title">
              <h2>{titleMap[tab]}</h2>
              <p>{subMap[tab]}</p>
            </div>

            {(tab === 'login' || tab === 'signup') && (
              <div className="am-tabs">
                <button className={`am-tab${tab==='login'?' on':''}`} onClick={()=>switchTo('login')}>{L.login}</button>
                <button className={`am-tab${tab==='signup'?' on':''}`} onClick={()=>switchTo('signup')}>{L.signup}</button>
              </div>
            )}

            {error && <div className="am-err">{error}</div>}
            {ok    && <div className="am-ok">{ok}</div>}

            {/* LOGIN */}
            {tab === 'login' && (
              <>
                <div className="am-grp"><label>{L.email}</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder="your@email.com" dir="ltr"/></div>
                <div className="am-grp">
                  <label>{L.pass}</label>
                  <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} placeholder="••••••••" dir="ltr"/>
                  <button className="am-forgot-link" onClick={()=>switchTo('forgot')}>{L.forgot}</button>
                </div>
                <button className="am-btn" onClick={doLogin} disabled={loading}>
                  {loading ? <Spinner/> : <span>{L.loginBtn}</span>}
                </button>
                <div className="am-div"><span>{L.or}</span></div>
                <button className="am-google" onClick={doGoogle} disabled={loading}><GoogleSVG/><span>{L.googleLogin}</span></button>
                <div className="am-footer">
                  <span>{L.noAccount} </span>
                  <button onClick={()=>switchTo('signup')}>{L.makeAccount}</button>
                </div>
              </>
            )}

            {/* SIGNUP */}
            {tab === 'signup' && (
              <>
                <div className="am-grp"><label>{L.name}</label><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={isAr?'محمد علي':'John Smith'}/></div>
                <div className="am-grp"><label>{L.email}</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" dir="ltr"/></div>
                <div className="am-grp"><label>{L.wa}</label><input type="text" value={wa} onChange={e=>setWa(e.target.value)} placeholder="+20 10 000 0000" dir="ltr"/></div>
                <div className="am-row">
                  <div className="am-grp"><label>{L.pass}</label><input type="password" value={pass} onChange={e=>{setPass(e.target.value);evalPw(e.target.value)}} placeholder="••••••••" dir="ltr"/></div>
                  <div className="am-grp"><label>{L.conf}</label><input type="password" value={conf} onChange={e=>setConf(e.target.value)} placeholder="••••••••" dir="ltr"/></div>
                </div>
                <ul className="am-rules">
                  {rules.map(r=>(
                    <li key={r.key} style={{ color: r.ok ? '#0E9F6E' : '#94A3B8' }}>{r.ok ? '✓' : '○'} {r.label}</li>
                  ))}
                </ul>
                <label className="am-check">
                  <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/>
                  {L.terms}
                </label>
                <button className="am-btn" onClick={doSignup} disabled={loading}>
                  {loading ? <Spinner/> : <span>{L.signupBtn}</span>}
                </button>
                <div className="am-div"><span>{L.or}</span></div>
                <button className="am-google" onClick={doGoogle} disabled={loading}><GoogleSVG/><span>{L.googleSignup}</span></button>
                <div className="am-footer">
                  <span>{L.haveAccount} </span>
                  <button onClick={()=>switchTo('login')}>{L.doLogin}</button>
                </div>
              </>
            )}

            {/* FORGOT */}
            {tab === 'forgot' && (
              <>
                <div className="am-forgot-icon">🔑</div>
                <div className="am-grp"><label>{L.email}</label><input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="your@email.com" dir="ltr"/></div>
                <button className="am-btn" onClick={doForgot} disabled={loading}>
                  {loading ? <Spinner/> : <span>{L.sendLink}</span>}
                </button>
                <div className="am-footer">
                  <button onClick={()=>switchTo('login')}>{L.backLogin}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
