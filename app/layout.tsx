import type { Metadata } from 'next'
import Script from 'next/script'
import { createClient } from '@supabase/supabase-js'
import './globals.css'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl: string | undefined
  let logoUrl: string | undefined
  try {
    const { data } = await service
      .from('ui_settings')
      .select('key, value')
      .in('key', ['favicon_url', 'logo_url'])
    data?.forEach((r: any) => {
      if (r.key === 'favicon_url') faviconUrl = r.value || undefined
      if (r.key === 'logo_url')    logoUrl    = r.value || undefined
    })
  } catch {}

  return {
    title: 'ProKeys Dashboard',
    description: 'Subscription Manager',
    icons: faviconUrl ? { icon: faviconUrl, shortcut: faviconUrl } : undefined,
    other: logoUrl ? { 'pk-logo': logoUrl } : {},
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Script
          src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
          strategy="beforeInteractive"
        />

        {/* ── Site-wide Preloader ── */}
        <style dangerouslySetInnerHTML={{__html:`
          :root{--pk-bg:#d99401;--pk-logo-size:190px;--pk-logo-size-mobile:130px;--pk-hole-x:50%;--pk-hole-y:50%;--pk-hole-size:0px;}
          #pkPreloader{position:fixed;inset:0;z-index:9999999;overflow:hidden;display:flex;align-items:center;justify-content:center;pointer-events:none;}
          #pkReveal{position:absolute;inset:0;background:var(--pk-bg);z-index:1;will-change:opacity,mask-image,-webkit-mask-image;-webkit-mask-image:radial-gradient(circle at var(--pk-hole-x) var(--pk-hole-y),transparent 0,transparent var(--pk-hole-size),#000 calc(var(--pk-hole-size) + 1px));mask-image:radial-gradient(circle at var(--pk-hole-x) var(--pk-hole-y),transparent 0,transparent var(--pk-hole-size),#000 calc(var(--pk-hole-size) + 1px));}
          .pkCenter{position:relative;z-index:2;width:100%;display:flex;align-items:center;justify-content:center;}
          .pkStack{display:flex;flex-direction:column;align-items:center;justify-content:center;will-change:opacity,transform;}
          #pkLogoWrap{display:block;line-height:0;transform-origin:50% 52%;will-change:transform,opacity;backface-visibility:hidden;}
          #pkLogo{width:var(--pk-logo-size);max-width:80vw;height:auto;display:block;margin:0 auto;user-select:none;-webkit-user-drag:none;animation:pkLogoIntro .65s ease;}
          .pkDots{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:10px;will-change:transform,opacity;}
          .pkDots span{width:12px;height:12px;border-radius:50%;background:#fff;opacity:.25;animation:pkDot 1.4s infinite ease-in-out;}
          .pkDots span:nth-child(1){animation-delay:0s;}.pkDots span:nth-child(2){animation-delay:.2s;}.pkDots span:nth-child(3){animation-delay:.4s;}
          #pkPreloader.pkHide{opacity:0;visibility:hidden;transition:opacity .12s linear,visibility .12s linear;}
          @keyframes pkDot{0%,80%,100%{opacity:.25;transform:translateY(0);}40%{opacity:1;transform:translateY(-6px);}}
          @keyframes pkLogoIntro{from{opacity:0;transform:translateY(8px) scale(.985);}to{opacity:1;transform:translateY(0) scale(1);}}
          @media(max-width:600px){#pkLogo{width:var(--pk-logo-size-mobile);}.pkDots{gap:7px;margin-top:8px;}.pkDots span{width:10px;height:10px;}}

          /* ── Scroll progress bar ── */
          #pkScrollBar{position:fixed;top:0;left:0;height:3px;width:0;background:#d99401;z-index:999999;opacity:.9;pointer-events:none;}

          /* ── Back to top button ── */
          #pkTopBtn{position:fixed;right:18px;bottom:20px;z-index:999999;width:46px;height:46px;border:0!important;border-radius:999px!important;background:#d99401!important;cursor:pointer;display:inline-flex!important;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,.25);transition:transform .25s ease,filter .25s ease,opacity .25s ease;opacity:0;pointer-events:none;transform:translateY(10px);outline:2px solid transparent;outline-offset:2px;-webkit-tap-highlight-color:rgba(255,255,255,0.15);}
          #pkTopBtn.pkShow{opacity:1;pointer-events:auto;transform:translateY(0);}
          #pkTopBtn::before,#pkTopBtn::after{content:""!important;display:none!important;border:0!important;background:transparent!important;clip-path:none!important;}
          #pkTopBtn:focus{outline:2px solid rgba(255,255,255,0.35);}
          #pkTopBtn:hover{transform:translateY(-3px);filter:brightness(1.05);}
          #pkTopBtn svg{display:block}
          #pkTopBtn .pkRingBg{stroke:rgba(255,255,255,.25)}
          #pkTopBtn .pkRingProg{stroke:#ffffff}
          #pkTopBtn .pkArrow{stroke:#ffffff}
          @media(max-width:600px){#pkTopBtn{right:14px;}}
        `}}/>

        <div id="pkPreloader">
          <div id="pkReveal"></div>
          <div className="pkCenter">
            <div className="pkStack" id="pkStack">
              <div id="pkLogoWrap">
                <img id="pkLogo" src="https://files.easy-orders.net/1771552422569112871.png" alt="Logo"/>
              </div>
              <div className="pkDots" id="pkDots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll progress bar */}
        <div id="pkScrollBar"></div>

        {/* Back to top */}
        <button id="pkTopBtn" aria-label="Back to top">
          <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
            <circle className="pkRingBg" cx="23" cy="23" r="18" fill="none" strokeWidth="3"></circle>
            <circle id="pkRingProg" className="pkRingProg" cx="23" cy="23" r="18" fill="none" strokeWidth="3"
                    strokeLinecap="round" transform="rotate(-90 23 23)"></circle>
            <path className="pkArrow" d="M17 26L23 20L29 26" fill="none" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </button>

        {children}

        <Script id="pk-preloader" strategy="afterInteractive" dangerouslySetInnerHTML={{__html:`
(function(){
  // ── Skip if inside iframe ──
  var _pre=document.getElementById('pkPreloader');
  if(window.self!==window.top){if(_pre)_pre.style.display='none';return;}

  // ── Preloader ──
  var pre=document.getElementById('pkPreloader'),reveal=document.getElementById('pkReveal'),stack=document.getElementById('pkStack'),logoWrap=document.getElementById('pkLogoWrap'),dots=document.getElementById('pkDots');
  if(pre&&reveal&&stack&&logoWrap&&dots){
    var HOLD=900,TOTAL=1400,PRE_ZOOM=2.5,MASK_START=2.3,END_R=Math.hypot(window.innerWidth,window.innerHeight);
    function clamp(v,a,b){return Math.min(Math.max(v,a),b)}
    function mix(a,b,t){return a+(b-a)*t}
    function easeInCubic(t){return t*t*t}
    function easeOutCubic(t){return 1-Math.pow(1-t,3)}
    function smoothstep(t){return t*t*(3-2*t)}
    function setHole(px){reveal.style.setProperty('--pk-hole-size',px+'px')}
    function removePre(){pre.classList.add('pkHide');setTimeout(function(){if(pre&&pre.parentNode)pre.parentNode.removeChild(pre)},120)}
    function startAnim(){
      var start=performance.now();
      function frame(now){
        var t=clamp((now-start)/TOTAL,0,1);
        var zoomE=smoothstep(t),scale=mix(1,PRE_ZOOM,zoomE);
        logoWrap.style.transform='scale('+scale+')';
        if(t<0.10){dots.style.opacity='1';dots.style.transform='translateY(0)';}
        else if(t<0.20){var d=1-((t-0.10)/0.10);dots.style.opacity=String(d);dots.style.transform='translateY(8px)';}
        else{dots.style.opacity='0';dots.style.transform='translateY(10px)';}
        var hp=0;
        if(scale>=MASK_START){hp=clamp((scale-MASK_START)/(PRE_ZOOM-MASK_START),0,1);}
        var hE=easeOutCubic(hp),radius=END_R*hE;
        setHole(radius);
        if(hp<0.12){logoWrap.style.opacity='1';}
        else if(hp<0.55){logoWrap.style.opacity=String(1-((hp-0.12)/0.43));}
        else{logoWrap.style.opacity='0';}
        if(hp<0.25){stack.style.opacity='1';}
        else if(hp<0.70){stack.style.opacity=String(1-((hp-0.25)/0.45));}
        else{stack.style.opacity='0';}
        if(t<1){requestAnimationFrame(frame);}else{removePre();}
      }
      requestAnimationFrame(frame);
    }
    function init(){setHole(0);setTimeout(startAnim,HOLD);}
    if(document.readyState==='complete'){init();}else{window.addEventListener('load',init);}
    window.addEventListener('resize',function(){END_R=Math.hypot(window.innerWidth,window.innerHeight);});
  }

  // ── Favicon client-side injection (bust browser cache on admin change) ──
  try{
    fetch('/api/ui-settings').then(function(r){return r.json();}).then(function(d){
      var url=d.settings&&d.settings.favicon_url;
      if(!url)return;
      var link=document.querySelector('link[rel="icon"]:not([data-admin])');
      if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link);}
      link.href=url+(url.indexOf('?')>=0?'&':'?')+'_v='+Date.now();
    }).catch(function(){});
  }catch(e){}

  // ── Scroll bar + Back to top ──
  try{
    var bar=document.getElementById('pkScrollBar'),btn=document.getElementById('pkTopBtn'),ring=document.getElementById('pkRingProg');
    if(bar&&btn&&ring){
      var r=18,C=2*Math.PI*r;
      ring.style.strokeDasharray=C;ring.style.strokeDashoffset=C;

      // Position back-to-top: above live chat for /u/ portal, low for visitors
      var inPortal=window.location.pathname.startsWith('/u/');
      btn.style.bottom=inPortal?'88px':'20px';

      function updateScroll(sc,max){
        var p=sc/max;
        bar.style.width=(p*100)+'%';ring.style.strokeDashoffset=C*(1-p);
        if(sc>200){if(!btn.classList.contains('pkShow'))btn.classList.add('pkShow');}else{btn.classList.remove('pkShow');}
      }
      window.addEventListener('scroll',function(){
        var h=document.documentElement,sc=h.scrollTop||document.body.scrollTop,max=(h.scrollHeight-h.clientHeight)||1;
        updateScroll(sc,max);
      },{passive:true});

      // Capture scroll from portal tab containers
      document.addEventListener('scroll',function(e){
        var el=e.target;
        if(el instanceof Element&&el.getAttribute&&el.getAttribute('data-scroll-container')){
          var sc2=el.scrollTop,max2=(el.scrollHeight-el.clientHeight)||1;
          updateScroll(sc2,max2);
        }
      },true);

      btn.addEventListener('click',function(e){
        e.preventDefault();
        var containers=document.querySelectorAll('[data-scroll-container]');
        var scrolled=false;
        containers.forEach(function(c){if(c.scrollTop>0){c.scrollTo({top:0,behavior:'smooth'});scrolled=true;}});
        if(!scrolled)window.scrollTo({top:0,behavior:'smooth'});
      });

      // Adjust position if route changes (SPA navigation)
      var lastPath=window.location.pathname;
      setInterval(function(){
        if(window.location.pathname!==lastPath){
          lastPath=window.location.pathname;
          var nowPortal=window.location.pathname.startsWith('/u/');
          btn.style.bottom=nowPortal?'88px':'20px';
        }
      },500);

      // Reset progress bar when portal tab changes
      window.addEventListener('pk-tab-change',function(){
        var containers=document.querySelectorAll('[data-scroll-container]');
        var found=false;
        containers.forEach(function(c){
          if(c.scrollTop>0){updateScroll(c.scrollTop,(c.scrollHeight-c.clientHeight)||1);found=true;}
        });
        if(!found)updateScroll(0,1);
      });
    }
  }catch(e){}
})();
        `}}/>
      </body>
    </html>
  )
}
