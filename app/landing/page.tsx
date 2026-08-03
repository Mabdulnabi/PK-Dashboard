'use client'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Star, Globe } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Settings { [key: string]: string }
interface ToolLogo  { id: string; url: string; name: string }
interface Feature   { id: string; icon: string; title_ar: string; title_en: string; desc_ar: string; desc_en: string }
interface Stat      { id: string; number: string; suffix: string; label_ar: string; label_en: string }
interface FaqItem   { id: string; q_ar: string; q_en: string; a_ar: string; a_en: string }
interface Review    { id: string; name: string; location: string; source: string; photo: string; stars: number; text_ar: string; text_en: string }

type Lang = 'ar' | 'en'

function safeParse<T>(val: string | undefined, fallback: T): T {
  if (!val) return fallback
  try { return JSON.parse(val) as T } catch { return fallback }
}

// ── Counter animation ────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, started = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!started) return
    let start = 0; const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, started])
  return count
}

function StatCounter({ stat, lang, started }: { stat: Stat; lang: Lang; started: boolean }) {
  const num = useCountUp(parseInt(stat.number) || 0, 2000, started)
  return (
    <div className="text-center">
      <div className="text-5xl font-black text-[#d99401] tabular-nums leading-none mb-2">
        {num.toLocaleString()}{stat.suffix}
      </div>
      <div className="text-sm font-medium text-gray-300 uppercase tracking-widest">
        {lang === 'ar' ? stat.label_ar : stat.label_en}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang,    setLang]    = useState<Lang>('ar')
  const [s,       setS]       = useState<Settings>({})
  const [loaded,  setLoaded]  = useState(false)
  const [menuOpen,setMenuOpen]= useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [revIdx,  setRevIdx]  = useState(0)
  const [statsVis,setStatsVis]= useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const [nlName,  setNlName]  = useState('')
  const [nlEmail, setNlEmail] = useState('')
  const [nlSent,  setNlSent]  = useState(false)

  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const t   = (ar: string, en: string) => lang === 'ar' ? ar : en

  useEffect(() => {
    fetch('/api/landing').then(r => r.json()).then(d => {
      setS(d.settings || {})
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVis(true) }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [loaded])

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
      <div className="w-10 h-10 border-2 border-[#d99401] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const toolLogos: ToolLogo[] = safeParse(s.lp_tool_logos, [])
  const features:  Feature[]  = safeParse(s.lp_features,   [])
  const stats:     Stat[]     = safeParse(s.lp_stats,      [])
  const faq:       FaqItem[]  = safeParse(s.lp_faq,        [])
  const reviews:   Review[]   = safeParse(s.lp_reviews,    [])

  const logo      = s.lp_header_logo || s.logo_url || ''
  const siteName  = s.lp_site_name   || 'Pro Keys'
  const signinUrl = s.lp_signin_url  || '/u/login'

  const heroTitleRaw = t(s.lp_hero_title_ar || 'اشتراكاتك الرقمية\nبأفضل الأسعار', s.lp_hero_title_en || 'Your Digital Subscriptions\nat the Best Prices')
  const heroLines = heroTitleRaw.split('\n')

  // duplicate for seamless marquee
  const marqueeItems = [...toolLogos, ...toolLogos]

  return (
    <div dir={dir} className="min-h-screen bg-[#0d0d0d] text-white font-sans antialiased">

      {/* ── Sticky header ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href={signinUrl} className="flex items-center gap-2.5 flex-shrink-0">
            {logo
              ? <img src={logo} alt={siteName} className="h-9 object-contain"/>
              : <span className="font-black text-xl text-[#d99401]">{siteName}</span>}
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              <Globe size={14}/>
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
            <a href={signinUrl}
              className="px-5 py-2 rounded-full text-sm font-bold text-[#0d0d0d] transition-all hover:brightness-110"
              style={{ background: '#d99401' }}>
              {t('تسجيل الدخول', 'Sign In')}
            </a>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(v => !v)} className="md:hidden text-gray-400 hover:text-white transition-colors">
            {menuOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0d0d0d] px-5 py-4 flex flex-col gap-3">
            <button onClick={() => { setLang(lang === 'ar' ? 'en' : 'ar'); setMenuOpen(false) }}
              className="flex items-center gap-2 text-sm text-gray-300">
              <Globe size={14}/> {lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            </button>
            <a href={signinUrl} className="px-5 py-2.5 rounded-full text-sm font-bold text-[#0d0d0d] text-center" style={{ background: '#d99401' }}>
              {t('تسجيل الدخول', 'Sign In')}
            </a>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 px-5 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(ellipse, #d99401 0%, transparent 70%)' }}/>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {s.lp_hero_badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-[#d99401] border border-[#d99401]/30 bg-[#d99401]/10 mb-6">
              {s.lp_hero_badge}
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-6">
            {heroLines.map((line, i) => (
              <span key={i} className="block">
                {i === 0 ? line : <span className="text-[#d99401]">{line}</span>}
              </span>
            ))}
          </h1>

          {(s.lp_hero_sub_ar || s.lp_hero_sub_en) && (
            <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {t(s.lp_hero_sub_ar || '', s.lp_hero_sub_en || '')}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={s.lp_hero_cta_url || signinUrl}
              className="px-8 py-3.5 rounded-full text-base font-bold text-[#0d0d0d] hover:brightness-110 transition-all shadow-lg shadow-[#d99401]/20"
              style={{ background: '#d99401' }}>
              {t(s.lp_hero_cta_ar || 'تسوق الآن', s.lp_hero_cta_en || 'Shop Now')}
            </a>
            {(s.lp_hero_cta2_ar || s.lp_hero_cta2_en) && (
              <a href={s.lp_hero_cta2_url || signinUrl}
                className="px-8 py-3.5 rounded-full text-base font-semibold text-white border border-white/20 hover:border-[#d99401]/50 hover:text-[#d99401] transition-all">
                {t(s.lp_hero_cta2_ar || 'سجل مجاناً', s.lp_hero_cta2_en || 'Sign up free')}
              </a>
            )}
          </div>
        </div>

        {/* Tool logos marquee */}
        {toolLogos.length > 0 && (
          <div className="mt-20 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #0d0d0d, transparent)' }}/>
            <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #0d0d0d, transparent)' }}/>
            <div className="flex gap-6 marquee-track" style={{ width: `${marqueeItems.length * 120}px` }}>
              {marqueeItems.map((logo, i) => (
                <div key={i} className="flex-shrink-0 w-24 h-16 flex items-center justify-center rounded-xl border border-white/8 bg-white/4 hover:border-[#d99401]/40 transition-colors p-2">
                  {logo.url
                    ? <img src={logo.url} alt={logo.name} className="max-h-10 max-w-full object-contain filter brightness-90 hover:brightness-110 transition-all"/>
                    : <span className="text-xs text-gray-400 text-center">{logo.name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Features ── */}
      {features.length > 0 && (
        <section className="py-24 px-5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black mb-3">
                {t(s.lp_feat_title_ar || 'ليه تختار Pro Keys؟', s.lp_feat_title_en || 'Why Choose Pro Keys?')}
              </h2>
              <div className="w-16 h-1 rounded-full mx-auto mt-4" style={{ background: '#d99401' }}/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <div key={f.id || i} className="group p-6 rounded-2xl border border-white/8 bg-white/3 hover:border-[#d99401]/40 hover:bg-[#d99401]/5 transition-all duration-300">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="text-base font-bold mb-2 text-white group-hover:text-[#d99401] transition-colors">
                    {t(f.title_ar, f.title_en)}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{t(f.desc_ar, f.desc_en)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Stats ── */}
      {stats.length > 0 && (
        <section ref={statsRef} className="py-24 px-5" style={{ background: 'linear-gradient(135deg, #111 0%, #1a1400 50%, #111 100%)' }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black mb-3">
                {t(s.lp_stats_title_ar || 'أرقامنا', s.lp_stats_title_en || 'Our Numbers')}
              </h2>
              {(s.lp_stats_sub_ar || s.lp_stats_sub_en) && (
                <p className="text-gray-400 max-w-xl mx-auto mt-3">
                  {t(s.lp_stats_sub_ar || '', s.lp_stats_sub_en || '')}
                </p>
              )}
              <div className="w-16 h-1 rounded-full mx-auto mt-4" style={{ background: '#d99401' }}/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              {stats.map((st, i) => <StatCounter key={st.id || i} stat={st} lang={lang} started={statsVis}/>)}
            </div>
          </div>
        </section>
      )}

      {/* ── Map ── */}
      {(s.lp_map_image || s.lp_map_title_ar || s.lp_map_title_en) && (
        <section className="py-24 px-5">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              {t(s.lp_map_title_ar || '', s.lp_map_title_en || '')}
            </h2>
            {(s.lp_map_sub_ar || s.lp_map_sub_en) && (
              <p className="text-gray-400 max-w-2xl mx-auto mt-3 leading-relaxed">
                {t(s.lp_map_sub_ar || '', s.lp_map_sub_en || '')}
              </p>
            )}
            {s.lp_map_image && (
              <div className="mt-12 rounded-2xl overflow-hidden border border-white/8 shadow-2xl">
                <img src={s.lp_map_image} alt="clients map" className="w-full object-cover"/>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      {faq.length > 0 && (
        <section className="py-24 px-5 bg-[#0a0a0a]">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black mb-2">
                {t(s.lp_faq_title_ar || 'الأسئلة الشائعة', s.lp_faq_title_en || 'FAQ')}
              </h2>
              {(s.lp_faq_sub_ar || s.lp_faq_sub_en) && (
                <p className="text-gray-400 mt-2">{t(s.lp_faq_sub_ar || '', s.lp_faq_sub_en || '')}</p>
              )}
              <div className="w-16 h-1 rounded-full mx-auto mt-4" style={{ background: '#d99401' }}/>
            </div>
            <div className="space-y-3">
              {faq.map((item, i) => (
                <div key={item.id || i} className="rounded-xl border border-white/8 overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-start hover:bg-white/3 transition-colors">
                    <span className="font-semibold text-white">{t(item.q_ar, item.q_en)}</span>
                    {openFaq === i ? <ChevronUp size={16} className="text-[#d99401] flex-shrink-0"/> : <ChevronDown size={16} className="text-gray-500 flex-shrink-0"/>}
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5">
                      <p className="pt-4">{t(item.a_ar, item.a_en)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Reviews ── */}
      {reviews.length > 0 && (
        <section className="py-24 px-5">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black mb-3">
                {t(s.lp_rev_title_ar || 'ماذا يقول عملاؤنا', s.lp_rev_title_en || 'What Our Clients Say')}
              </h2>
              <div className="w-16 h-1 rounded-full mx-auto mt-4" style={{ background: '#d99401' }}/>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
                <div className="p-8 md:p-10">
                  {(() => {
                    const rev = reviews[revIdx]
                    return (
                      <div key={revIdx} className="flex flex-col items-center text-center">
                        {rev.photo
                          ? <img src={rev.photo} alt={rev.name} className="w-20 h-20 rounded-full object-cover border-2 border-[#d99401] mb-5 shadow-lg shadow-[#d99401]/20"/>
                          : <div className="w-20 h-20 rounded-full bg-[#d99401]/20 border-2 border-[#d99401] flex items-center justify-center mb-5 text-2xl font-black text-[#d99401]">{rev.name.charAt(0)}</div>}
                        <div className="flex gap-1 mb-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={18} fill={i < rev.stars ? '#d99401' : 'transparent'} stroke={i < rev.stars ? '#d99401' : '#555'} />
                          ))}
                        </div>
                        <p className="text-gray-200 text-base leading-relaxed mb-6 max-w-2xl">
                          "{t(rev.text_ar, rev.text_en)}"
                        </p>
                        <div>
                          <div className="font-bold text-white">{rev.name}</div>
                          {rev.location && <div className="text-xs text-gray-500 mt-0.5">{rev.location}</div>}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {reviews.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <button onClick={() => setRevIdx(i => (i - 1 + reviews.length) % reviews.length)}
                    className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:border-[#d99401]/50 transition-colors">
                    {lang === 'ar' ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
                  </button>
                  <div className="flex gap-2">
                    {reviews.map((_, i) => (
                      <button key={i} onClick={() => setRevIdx(i)}
                        className={`rounded-full transition-all ${i === revIdx ? 'w-6 h-2.5 bg-[#d99401]' : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'}`}/>
                    ))}
                  </div>
                  <button onClick={() => setRevIdx(i => (i + 1) % reviews.length)}
                    className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center hover:border-[#d99401]/50 transition-colors">
                    {lang === 'ar' ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Newsletter ── */}
      {(s.lp_nl_title_ar || s.lp_nl_title_en) && (
        <section className="py-24 px-5" style={{ background: 'linear-gradient(135deg, #1a1400 0%, #0d0d0d 100%)' }}>
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-black mb-3">
              {t(s.lp_nl_title_ar || 'فاتك عرض ميتفوتش؟', s.lp_nl_title_en || 'Missed a deal?')}
            </h2>
            {(s.lp_nl_sub_ar || s.lp_nl_sub_en) && (
              <p className="text-gray-400 mb-8 leading-relaxed">
                {t(s.lp_nl_sub_ar || '', s.lp_nl_sub_en || '')}
              </p>
            )}
            {nlSent
              ? <div className="p-6 rounded-2xl border border-[#d99401]/30 bg-[#d99401]/10 text-[#d99401] font-semibold">
                  {t('شكراً! هيوصلك كل جديد 🎉', 'Thank you! We\'ll keep you updated 🎉')}
                </div>
              : (
                <form onSubmit={e => { e.preventDefault(); if (nlEmail) setNlSent(true) }} className="space-y-3">
                  <input value={nlName} onChange={e => setNlName(e.target.value)}
                    placeholder={t(s.lp_nl_name_ar || 'الاسم', s.lp_nl_name_en || 'Name')}
                    className="w-full px-5 py-3.5 rounded-xl bg-white/6 border border-white/10 text-white placeholder-gray-500 focus:border-[#d99401]/50 outline-none transition-colors text-sm"/>
                  <input type="email" required value={nlEmail} onChange={e => setNlEmail(e.target.value)}
                    placeholder={t(s.lp_nl_email_ar || 'البريد الالكتروني', s.lp_nl_email_en || 'Email address')}
                    className="w-full px-5 py-3.5 rounded-xl bg-white/6 border border-white/10 text-white placeholder-gray-500 focus:border-[#d99401]/50 outline-none transition-colors text-sm"/>
                  <button type="submit"
                    className="w-full py-3.5 rounded-xl font-bold text-sm text-[#0d0d0d] hover:brightness-110 transition-all"
                    style={{ background: '#d99401' }}>
                    {t(s.lp_nl_btn_ar || 'اشترك في نشرتنا', s.lp_nl_btn_en || 'Subscribe')}
                  </button>
                </form>
              )}
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-5">
        <div className="max-w-6xl mx-auto">
          {s.lp_footer_html
            ? <div dangerouslySetInnerHTML={{ __html: s.lp_footer_html }} className="text-sm text-gray-500"/>
            : <p className="text-center text-sm text-gray-600">{siteName} © {new Date().getFullYear()}</p>}
        </div>
      </footer>

      {/* ── Marquee CSS ── */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 30s linear infinite;
          display: flex;
          gap: 1.5rem;
        }
        .marquee-track:hover { animation-play-state: paused; }
        [dir="rtl"] .marquee-track {
          animation-direction: reverse;
        }
      `}</style>
    </div>
  )
}
