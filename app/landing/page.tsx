'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Landing() {
  const [lang,    setLang]    = useState<Lang>('ar')
  const [s,       setS]       = useState<S>({})
  const [ready,   setReady]   = useState(false)
  const [preHide, setPreHide] = useState(false)

  // header
  const [menuOpen, setMenuOpen] = useState(false)

  // faq
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // reviews slider
  const [revIdx, setRevIdx] = useState(0)
  const revTimer = useRef<ReturnType<typeof setTimeout>>()

  // newsletter
  const [nlName,  setNlName]  = useState('')
  const [nlEmail, setNlEmail] = useState('')
  const [nlSent,  setNlSent]  = useState(false)

  // scroll progress + back-to-top
  const [scrollPct, setScrollPct] = useState(0)
  const [showTop,   setShowTop]   = useState(false)

  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const t   = (ar: string, en: string) => lang === 'ar' ? ar : en
  const g   = (ar: string, en: string) => t(s[`lp_${ar}`] || '', s[`lp_${en}`] || '') // generic getter

  // ── Fetch settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/landing').then(r => r.json()).then(d => {
      setS(d.settings || {})
      setReady(true)
      setTimeout(() => setPreHide(true), 200)
    })
  }, [])

  // ── Scroll listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = () => {
      const el = document.documentElement
      const pct = el.scrollTop / ((el.scrollHeight - el.clientHeight) || 1)
      setScrollPct(pct)
      setShowTop(el.scrollTop > 500)
    }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // ── Auto-advance reviews ─────────────────────────────────────────────────────
  const reviews: Review[] = parse(s.lp_reviews, [])
  useEffect(() => {
    if (reviews.length < 2) return
    revTimer.current = setTimeout(() => setRevIdx(i => (i + 1) % reviews.length), 4500)
    return () => clearTimeout(revTimer.current)
  }, [revIdx, reviews.length])

  const toolLogos: ToolLogo[] = parse(s.lp_tool_logos, [])
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

  // marquee: duplicate for seamless loop
  const marquee = [...toolLogos, ...toolLogos]

  // ── CSS ring for back-to-top ──────────────────────────────────────────────
  const R = 18; const C = 2 * Math.PI * R
  const ringOffset = C * (1 - scrollPct)

  if (!ready) return (
    <div style={{ position:'fixed', inset:0, background:'linear-gradient(135deg,#0B5FC9,#1B2556)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ textAlign:'center' }}>
        {logo && <img src={logo} alt={siteName} style={{ height:120, marginBottom:16 }}/>}
        <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
          {[0,1,2].map(i => <span key={i} style={{ width:10, height:10, borderRadius:'50%', background:'#fff', display:'block', animation:`pkdot 1.4s ${i*0.2}s infinite ease-in-out` }}/>)}
        </div>
      </div>
      <style>{`@keyframes pkdot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-6px)}}`}</style>
    </div>
  )

  return (
    <div dir={dir} style={{ fontFamily:"'Cairo',sans-serif", color:'#16213D', background:'#fff', overflowX:'hidden' }}>

      {/* ── Scroll progress bar ── */}
      <div style={{ position:'fixed', top:0, left:0, height:3, width:`${scrollPct*100}%`, background:'#d99401', zIndex:999999, opacity:.9, transition:'width .1s' }}/>

      {/* ── Sticky Header ── */}
      <header style={{ position:'sticky', top:0, zIndex:1000, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(10px)', borderBottom:'1px solid #EDD98A' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64, gap:16 }}>

          {/* Logo */}
          <a href="/" style={{ flexShrink:0 }}>
            {logo
              ? <img src={logo} alt={siteName} style={{ height:42, width:'auto' }}/>
              : <span style={{ fontWeight:900, fontSize:20, color:'#d99401' }}>{siteName}</span>}
          </a>

          {/* Desktop nav */}
          <nav style={{ display:'flex', alignItems:'center', gap:24, fontSize:13.5, fontWeight:700, color:'#3D4A6B' }} className="lp-desk-nav">
            {features.length > 0 && <span onClick={() => scrollTo('features')} style={{ cursor:'pointer', whiteSpace:'nowrap' }} onMouseEnter={e=>(e.currentTarget.style.color='#d99401')} onMouseLeave={e=>(e.currentTarget.style.color='#3D4A6B')}>{t('المميزات','Features')}</span>}
            {stats.length    > 0 && <span onClick={() => scrollTo('stats')}    style={{ cursor:'pointer', whiteSpace:'nowrap' }} onMouseEnter={e=>(e.currentTarget.style.color='#d99401')} onMouseLeave={e=>(e.currentTarget.style.color='#3D4A6B')}>{t('أرقامنا','Numbers')}</span>}
            {faq.length      > 0 && <span onClick={() => scrollTo('faq')}      style={{ cursor:'pointer', whiteSpace:'nowrap' }} onMouseEnter={e=>(e.currentTarget.style.color='#d99401')} onMouseLeave={e=>(e.currentTarget.style.color='#3D4A6B')}>{t('الأسئلة الشائعة','FAQ')}</span>}
            {reviews.length  > 0 && <span onClick={() => scrollTo('reviews')}  style={{ cursor:'pointer', whiteSpace:'nowrap' }} onMouseEnter={e=>(e.currentTarget.style.color='#d99401')} onMouseLeave={e=>(e.currentTarget.style.color='#3D4A6B')}>{t('التقييمات','Reviews')}</span>}
          </nav>

          {/* Actions */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              style={{ background:'#fff', border:'1.5px solid #EDD98A', color:'#1B2556', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:13, padding:'9px 14px', borderRadius:10, cursor:'pointer', whiteSpace:'nowrap' }}>
              {lang === 'ar' ? '🇬🇧 EN' : '🇪🇬 AR'}
            </button>
            <a href={signIn}
              style={{ background:'#1B2556', color:'#fff', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:14, padding:'10px 22px', borderRadius:10, textDecoration:'none', whiteSpace:'nowrap', display:'inline-block' }}>
              {t('تسجيل الدخول','Sign In')}
            </a>
            {/* Hamburger */}
            <button onClick={() => setMenuOpen(v => !v)} className="lp-ham"
              style={{ display:'none', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:9, border:'1.5px solid #EDD98A', background:'#fff', cursor:'pointer', color:'#1B2556' }}>
              <svg viewBox="0 0 24 24" style={{ width:20, height:20, stroke:'currentColor', fill:'none', strokeWidth:2, strokeLinecap:'round' }}>
                {menuOpen ? <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></> : <><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ borderTop:'1px solid #EDD98A', background:'#fff', padding:'8px 0 16px' }}>
            {[
              features.length > 0 && { id:'features', ar:'المميزات',      en:'Features' },
              stats.length    > 0 && { id:'stats',    ar:'أرقامنا',        en:'Numbers' },
              faq.length      > 0 && { id:'faq',      ar:'الأسئلة الشائعة',en:'FAQ' },
              reviews.length  > 0 && { id:'reviews',  ar:'التقييمات',      en:'Reviews' },
            ].filter(Boolean).map((item: any) => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                style={{ display:'block', width:'100%', padding:'13px 20px', textAlign: lang==='ar' ? 'right' : 'left', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:14, color:'#1B2556', background:'none', border:'none', borderBottom:'1px solid #EDD98A', cursor:'pointer' }}>
                {t(item.ar, item.en)}
              </button>
            ))}
            <div style={{ display:'flex', gap:8, padding:'10px 20px' }}>
              <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
                style={{ background:'#fff', border:'1.5px solid #EDD98A', color:'#1B2556', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:13, padding:'9px 14px', borderRadius:10, cursor:'pointer' }}>
                {lang === 'ar' ? '🇬🇧 EN' : '🇪🇬 AR'}
              </button>
              <a href={signIn} style={{ flex:1, background:'#1B2556', color:'#fff', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:14, padding:'10px 0', borderRadius:10, textDecoration:'none', textAlign:'center', display:'block' }}>
                {t('تسجيل الدخول','Sign In')}
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section style={{ position:'relative', padding:'80px 0 60px', background:'radial-gradient(1200px 500px at 85% -10%, #FBF2D8, transparent 60%)' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }} className="lp-hero-grid">

          {/* Left copy */}
          <div>
            {(s.lp_hero_badge || s.lp_hero_badge_ar || s.lp_hero_badge_en) && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:13, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:20, border:'1px solid #EDD98A' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>
                {lang === 'ar'
                  ? (s.lp_hero_badge_ar || s.lp_hero_badge || s.lp_hero_badge_en)
                  : (s.lp_hero_badge_en || s.lp_hero_badge || s.lp_hero_badge_ar)}
              </span>
            )}
            <h1 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:800, lineHeight:1.32, color:'#1B2556', marginBottom:18, whiteSpace:'pre-line' }}>
              {(t(s.lp_hero_title_ar || '', s.lp_hero_title_en || '')).split('\n').map((line, i) => (
                <span key={i} style={{ display:'block' }}>
                  {i === 0 ? line : <span style={{ background:'linear-gradient(90deg,#d99401,#b87e00)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{line}</span>}
                </span>
              ))}
            </h1>
            {(s.lp_hero_sub_ar || s.lp_hero_sub_en) && (
              <p style={{ fontSize:15.5, color:'#6B7494', maxWidth:500, marginBottom:28, lineHeight:1.8 }}>
                {t(s.lp_hero_sub_ar || '', s.lp_hero_sub_en || '')}
              </p>
            )}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <a href={s.lp_hero_cta_url || signIn}
                style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#d99401', color:'#fff', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:15, padding:'14px 32px', borderRadius:10, textDecoration:'none', boxShadow:'0 8px 22px rgba(217,148,1,.35)' }}>
                🛒 {t(s.lp_hero_cta_ar || 'تسوق الآن', s.lp_hero_cta_en || 'Shop Now')}
              </a>
              {(s.lp_hero_cta2_ar || s.lp_hero_cta2_en) && (
                <a href={s.lp_hero_cta2_url || signIn}
                  style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#fff', color:'#1B2556', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:15, padding:'14px 28px', borderRadius:10, textDecoration:'none', border:'1.5px solid #DCE4F1' }}>
                  👤 {t(s.lp_hero_cta2_ar || '', s.lp_hero_cta2_en || '')}
                </a>
              )}
            </div>
          </div>

          {/* Right: hero visual */}
          {s.lp_hero_image ? (
            <div style={{ borderRadius:20, overflow:'hidden', border:'1.5px solid #EDD98A', boxShadow:'0 20px 48px -16px rgba(27,37,86,.12)' }}>
              <img src={s.lp_hero_image} alt="hero" style={{ width:'100%', display:'block' }}/>
            </div>
          ) : (
            <div style={{ borderRadius:20, border:'1.5px dashed #EDD98A', minHeight:260, display:'flex', alignItems:'center', justifyContent:'center', background:'#FFFDF5', color:'#EDD98A', fontSize:48 }}>
              🔑
            </div>
          )}
        </div>

        {/* Tool logos marquee */}
        {toolLogos.length > 0 && (
          <div style={{ marginTop:60, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:'0 0 0 auto', left:0, top:0, bottom:0, width:96, background:'linear-gradient(to right,#fff,transparent)', zIndex:2, pointerEvents:'none' }}/>
            <div style={{ position:'absolute', right:0, top:0, bottom:0, width:96, background:'linear-gradient(to left,#fff,transparent)', zIndex:2, pointerEvents:'none' }}/>
            <p style={{ textAlign:'center', fontSize:12, fontWeight:700, color:'#6B7494', letterSpacing:2, textTransform:'uppercase', marginBottom:20 }}>
              {t('الأدوات والمنتجات المتاحة','Available Tools & Products')}
            </p>
            <div className="lp-marquee" style={{ display:'flex', gap:16, width:`${marquee.length * 132}px` }}>
              {marquee.map((logo, i) => (
                <div key={i} style={{ flexShrink:0, width:116, height:68, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:12, border:'1px solid #DCE4F1', background:'#FAFAFA', padding:10, transition:'border-color .2s' }}>
                  {logo.url
                    ? <img src={logo.url} alt={logo.name} style={{ maxHeight:44, maxWidth:'100%', objectFit:'contain' }}/>
                    : <span style={{ fontSize:12, color:'#6B7494', textAlign:'center' }}>{logo.name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── WHY CHOOSE US ── */}
      {features.length > 0 && (
        <section id="features" style={{ padding:'80px 0', background:'#F9F6EE' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px' }}>
            <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 52px' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:12.5, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:16, border:'1px solid #EDD98A' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>
                {t('ليه تختارنا','WHY CHOOSE US')}
              </span>
              <h2 style={{ fontSize:30, fontWeight:800, color:'#1B2556', marginBottom:8 }}>
                {t(s.lp_feat_title_ar || 'ليه تختار Pro Keys؟', s.lp_feat_title_en || 'Why Choose Pro Keys?').split(' ').map((word, i, arr) =>
                  i === arr.length - 1
                    ? <span key={i} style={{ background:'linear-gradient(90deg,#d99401,#b87e00)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}> {word}</span>
                    : <span key={i}>{i === 0 ? word : ' ' + word}</span>
                )}
              </h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }} className="lp-feat-grid">
              {features.map((f, i) => (
                <div key={f.id || i} className="lp-card"
                  style={{ background:'#fff', border:'1px solid #DCE4F1', borderRadius:16, padding:26, transition:'all .2s' }}>
                  <div style={{ fontSize:28, marginBottom:16, lineHeight:1 }}>{f.icon}</div>
                  <h3 style={{ fontSize:16, fontWeight:800, color:'#1B2556', marginBottom:8 }}>{t(f.title_ar, f.title_en)}</h3>
                  <p style={{ fontSize:13.5, color:'#6B7494', lineHeight:1.75 }}>{t(f.desc_ar, f.desc_en)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── STATS ── */}
      {stats.length > 0 && (
        <section id="stats" style={{ padding:'80px 0', background:'linear-gradient(135deg,#1B2556,#2A3A78)' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', textAlign:'center' }}>
            <h2 style={{ fontSize:30, fontWeight:800, color:'#fff', marginBottom:8 }}>
              {t(s.lp_stats_title_ar || 'أرقامنا', s.lp_stats_title_en || 'Our Numbers')}
            </h2>
            {(s.lp_stats_sub_ar || s.lp_stats_sub_en) && (
              <p style={{ color:'rgba(255,255,255,.65)', fontSize:14.5, marginBottom:48 }}>
                {t(s.lp_stats_sub_ar || '', s.lp_stats_sub_en || '')}
              </p>
            )}
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${stats.length},1fr)`, gap:32, marginTop:40 }} className="lp-stats-grid">
              {stats.map((st, i) => (
                <div key={st.id || i} style={{ padding:'32px 24px', borderRadius:16, background:'rgba(255,255,255,.07)', border:'1px solid rgba(217,148,1,.3)' }}>
                  <div style={{ fontSize:'clamp(36px,5vw,52px)', fontWeight:900, color:'#d99401', fontVariantNumeric:'tabular-nums', lineHeight:1, marginBottom:10 }}>
                    <Counter target={parseInt(st.number) || 0} suffix={st.suffix}/>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:2 }}>
                    {t(st.label_ar, st.label_en)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CLIENTS MAP ── */}
      {(s.lp_map_image || s.lp_map_title_ar || s.lp_map_title_en) && (
        <section style={{ padding:'80px 0' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px', textAlign:'center' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:12.5, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:16, border:'1px solid #EDD98A' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>
              {t('عملاؤنا حول العالم','Our Clients Worldwide')}
            </span>
            <h2 style={{ fontSize:30, fontWeight:800, color:'#1B2556', marginBottom:8 }}>
              {t(s.lp_map_title_ar || '', s.lp_map_title_en || '')}
            </h2>
            {(s.lp_map_sub_ar || s.lp_map_sub_en) && (
              <p style={{ color:'#6B7494', fontSize:15, maxWidth:640, margin:'0 auto 36px', lineHeight:1.8 }}>
                {t(s.lp_map_sub_ar || '', s.lp_map_sub_en || '')}
              </p>
            )}
            {s.lp_map_image && (
              <div style={{ borderRadius:20, overflow:'hidden', border:'1.5px solid #EDD98A', boxShadow:'0 20px 48px -16px rgba(27,37,86,.12)', marginTop:16 }}>
                <img src={s.lp_map_image} alt="clients map" style={{ width:'100%', display:'block' }}/>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {faq.length > 0 && (
        <section id="faq" style={{ padding:'80px 0', background:'#F9F6EE' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px' }}>
            <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 52px' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:12.5, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:16, border:'1px solid #EDD98A' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>
                {t('أسئلة شائعة','FAQ')}
              </span>
              <h2 style={{ fontSize:30, fontWeight:800, color:'#1B2556', marginBottom:8 }}>
                {t(s.lp_faq_title_ar || 'الأسئلة الشائعة', s.lp_faq_title_en || 'Frequently Asked Questions')}
              </h2>
              {(s.lp_faq_sub_ar || s.lp_faq_sub_en) && (
                <p style={{ color:'#6B7494', fontSize:15 }}>
                  {t(s.lp_faq_sub_ar || '', s.lp_faq_sub_en || '')}
                </p>
              )}
            </div>
            <div style={{ maxWidth:860, margin:'0 auto' }}>
              {faq.map((item, i) => (
                <div key={item.id || i} style={{ border:'1px solid #DCE4F1', borderRadius:12, marginBottom:12, overflow:'hidden' }}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 26px', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:15, color:'#1B2556', background:'#fff', border:'none', cursor:'pointer', gap:14, textAlign: lang==='ar' ? 'right' : 'left' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ flexShrink:0, width:26, height:26, borderRadius:8, background:'#FBF2D8', color:'#b87e00', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800 }}>؟</span>
                      <span>{t(item.q_ar, item.q_en)}</span>
                    </div>
                    <span style={{ color:'#6B7494', fontSize:12, flexShrink:0, transition:'transform .2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ background:'#F9F6EE', borderTop:'1px solid #DCE4F1', padding:'18px 26px 24px', fontSize:14, color:'#6B7494', lineHeight:1.9 }}>
                      {t(item.a_ar, item.a_en)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── REVIEWS ── */}
      {reviews.length > 0 && (
        <section id="reviews" style={{ padding:'80px 0' }}>
          <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px' }}>
            <div style={{ textAlign:'center', maxWidth:640, margin:'0 auto 52px' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#FBF2D8', color:'#b87e00', fontSize:12.5, fontWeight:700, padding:'7px 16px', borderRadius:20, marginBottom:16, border:'1px solid #EDD98A' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#0E9F6E', display:'inline-block' }}/>
                {t('آراء العملاء','Customer Reviews')}
              </span>
              <h2 style={{ fontSize:30, fontWeight:800, color:'#1B2556', marginBottom:8 }}>
                {t(s.lp_rev_title_ar || 'ماذا يقول عملاؤنا', s.lp_rev_title_en || 'What Our Clients Say')}
              </h2>
            </div>

            {/* Slider */}
            <div style={{ maxWidth:720, margin:'0 auto' }}>
              {(() => {
                const rev = reviews[revIdx]
                return (
                  <div style={{ background:'#FFFDF5', border:'1.5px solid #EDD98A', borderRadius:20, padding:'40px 48px', textAlign:'center', boxShadow:'0 16px 40px -16px rgba(27,37,86,.10)' }}>
                    {/* Stars */}
                    <div style={{ display:'flex', justifyContent:'center', gap:4, marginBottom:20 }}>
                      {[1,2,3,4,5].map(n => (
                        <svg key={n} viewBox="0 0 24 24" style={{ width:20, height:20, fill: n <= rev.stars ? '#d99401' : '#DCE4F1', stroke:'none' }}>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    {/* Quote */}
                    <p style={{ fontSize:15.5, color:'#3D4A6B', lineHeight:2, marginBottom:28, fontStyle:'normal' }}>
                      "{t(rev.text_ar, rev.text_en)}"
                    </p>
                    {/* Avatar + name */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
                      {rev.photo
                        ? <img src={rev.photo} alt={rev.name} style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', border:'2px solid #d99401' }}/>
                        : <div style={{ width:52, height:52, borderRadius:'50%', background:'#FBF2D8', border:'2px solid #d99401', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#d99401' }}>{rev.name.charAt(0)}</div>}
                      <div style={{ textAlign: lang==='ar' ? 'right' : 'left' }}>
                        <div style={{ fontWeight:800, fontSize:15, color:'#1B2556' }}>{rev.name}</div>
                        {rev.location && <div style={{ fontSize:12.5, color:'#6B7494', marginTop:2 }}>{rev.location}</div>}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Dots + arrows */}
              {reviews.length > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:24 }}>
                  <button onClick={() => { clearTimeout(revTimer.current); setRevIdx(i => (i - 1 + reviews.length) % reviews.length) }}
                    style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid #DCE4F1', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#1B2556' }}>
                    {lang === 'ar' ? '›' : '‹'}
                  </button>
                  <div style={{ display:'flex', gap:6 }}>
                    {reviews.map((_, i) => (
                      <button key={i} onClick={() => { clearTimeout(revTimer.current); setRevIdx(i) }}
                        style={{ borderRadius:999, border:'none', cursor:'pointer', transition:'all .3s', background: i === revIdx ? '#d99401' : '#DCE4F1', width: i === revIdx ? 22 : 8, height:8 }}/>
                    ))}
                  </div>
                  <button onClick={() => { clearTimeout(revTimer.current); setRevIdx(i => (i + 1) % reviews.length) }}
                    style={{ width:36, height:36, borderRadius:'50%', border:'1.5px solid #DCE4F1', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#1B2556' }}>
                    {lang === 'ar' ? '‹' : '›'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── NEWSLETTER CTA ── */}
      {(s.lp_nl_title_ar || s.lp_nl_title_en) && (
        <section style={{ padding:'80px 24px' }}>
          <div style={{ maxWidth:1132, margin:'0 auto', background:'linear-gradient(135deg,#1B2556,#2A3A78)', borderRadius:24, padding:'56px 40px', textAlign:'center', color:'#fff' }}>
            <h2 style={{ fontSize:28, fontWeight:800, marginBottom:12 }}>
              {t(s.lp_nl_title_ar || 'فاتك عرض ميتفوتش؟', s.lp_nl_title_en || 'Missed a deal?')}
            </h2>
            {(s.lp_nl_sub_ar || s.lp_nl_sub_en) && (
              <p style={{ color:'rgba(255,255,255,.7)', marginBottom:32, fontSize:14.5, maxWidth:480, margin:'0 auto 32px' }}>
                {t(s.lp_nl_sub_ar || '', s.lp_nl_sub_en || '')}
              </p>
            )}
            {nlSent
              ? <div style={{ background:'rgba(14,159,110,.15)', border:'1px solid rgba(14,159,110,.4)', borderRadius:12, padding:'18px 32px', display:'inline-block', color:'#6EE7B7', fontWeight:700 }}>
                  {t('✅ تم الاشتراك بنجاح! شكراً ليك 🎉', '✅ Subscribed successfully! Thank you 🎉')}
                </div>
              : (
                <form onSubmit={e => { e.preventDefault(); if (nlEmail) setNlSent(true) }}
                  style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:420, margin:'0 auto' }}>
                  <input value={nlName} onChange={e => setNlName(e.target.value)}
                    placeholder={t(s.lp_nl_name_ar || 'الاسم', s.lp_nl_name_en || 'Name')}
                    style={{ padding:'13px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'#fff', fontFamily:"'Cairo',sans-serif", fontSize:14, outline:'none' }}/>
                  <input type="email" required value={nlEmail} onChange={e => setNlEmail(e.target.value)}
                    placeholder={t(s.lp_nl_email_ar || 'البريد الإلكتروني', s.lp_nl_email_en || 'Email address')}
                    style={{ padding:'13px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.08)', color:'#fff', fontFamily:"'Cairo',sans-serif", fontSize:14, outline:'none' }}/>
                  <button type="submit"
                    style={{ padding:'14px', borderRadius:10, border:'none', background:'#d99401', color:'#fff', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:15, cursor:'pointer', boxShadow:'0 8px 22px rgba(217,148,1,.4)' }}>
                    {t(s.lp_nl_btn_ar || 'اشترك في نشرتنا الإخبارية', s.lp_nl_btn_en || 'Subscribe')}
                  </button>
                </form>
              )}
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ padding:'36px 0', borderTop:'1px solid #DCE4F1', background:'#fff' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 24px' }}>
          {s.lp_footer_html
            ? <div dangerouslySetInnerHTML={{ __html: s.lp_footer_html }} style={{ fontSize:12.5, color:'#6B7494' }}/>
            : <p style={{ textAlign:'center', fontSize:12.5, color:'#6B7494' }}><strong>{siteName}</strong> © {new Date().getFullYear()}</p>}
        </div>
      </footer>

      {/* ── Back to top ── */}
      <button onClick={() => window.scrollTo({ top:0, behavior:'smooth' })} aria-label="Back to top"
        style={{ position:'fixed', bottom: lang==='ar' ? 'auto' : 30, right: lang==='ar' ? 'auto' : 18, left: lang==='ar' ? 18 : 'auto', top:'auto', zIndex:999999, width:46, height:46, borderRadius:'50%', border:'none', background:'#1B2556', cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 22px rgba(27,37,86,.28)', opacity: showTop ? 1 : 0, pointerEvents: showTop ? 'auto' : 'none', transform: showTop ? 'translateY(0)' : 'translateY(10px)', transition:'all .25s' }}>
        <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
          <circle cx="23" cy="23" r={R} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3"/>
          <circle cx="23" cy="23" r={R} fill="none" stroke="#d99401" strokeWidth="3"
            strokeLinecap="round" transform="rotate(-90 23 23)"
            strokeDasharray={C} strokeDashoffset={ringOffset}/>
          <path d="M17 26L23 20L29 26" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ── Google Fonts + responsive CSS ── */}
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{overflow-x:hidden;}
        a{text-decoration:none;color:inherit;}
        input::placeholder{color:rgba(255,255,255,.4);}
        .lp-card:hover{transform:translateY(-3px);box-shadow:0 16px 32px -12px rgba(27,37,86,.14);border-color:#EDD98A !important;}

        @keyframes lpmarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .lp-marquee{animation:lpmarquee 30s linear infinite;}
        .lp-marquee:hover{animation-play-state:paused;}
        [dir="rtl"] .lp-marquee{animation-direction:reverse;}

        @media(max-width:860px){
          .lp-hero-grid{grid-template-columns:1fr !important;}
          .lp-feat-grid{grid-template-columns:1fr !important;}
          .lp-stats-grid{grid-template-columns:1fr !important;}
          .lp-desk-nav{display:none !important;}
          .lp-ham{display:inline-flex !important;}
        }
        @media(max-width:600px){
          section{padding:56px 0 !important;}
        }
      `}</style>
    </div>
  )
}
