'use client'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface BannerSlide { url: string; link?: string }

interface Props {
  slides: BannerSlide[]
  maxHeight?: number
  isRtl?: boolean
  className?: string
}

export default function BannerSlider({ slides, maxHeight = 280, isRtl = false, className = '' }: Props) {
  const [slide, setSlide] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const start = (len: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setSlide(s => (s+1) % len), 4500)
  }

  useEffect(() => {
    if (slides.length > 1) start(slides.length)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [slides.length])

  const go = (i: number) => { setSlide(i); start(slides.length) }

  if (slides.length === 0) return null

  const cur = slides[slide]

  return (
    <div className={`relative rounded-2xl overflow-hidden group ${className}`} style={{ maxHeight }}>
      {slides.map((s, i) => (
        <div key={s.url+i} className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === slide ? 1 : 0, zIndex: i === slide ? 1 : 0 }}>
          <img src={s.url} alt={`Slide ${i+1}`} className="w-full h-full object-cover" style={{ maxHeight }}/>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.3))' }}/>
        </div>
      ))}
      {/* invisible spacer to give the container height */}
      <img src={slides[0].url} alt="" className="w-full object-cover invisible" style={{ maxHeight }}/>

      {/* clickable link overlay on current slide */}
      {cur.link && (
        <a href={cur.link} className="absolute inset-0 z-20" aria-label="Banner link"/>
      )}

      {slides.length > 1 && (<>
        <button onClick={e => { e.preventDefault(); go((slide-1+slides.length)%slides.length) }}
          className="absolute start-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {isRtl ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>
        <button onClick={e => { e.preventDefault(); go((slide+1)%slides.length) }}
          className="absolute end-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
          {isRtl ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
          {slides.map((_,i) => (
            <button key={i} onClick={e => { e.preventDefault(); go(i) }}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i===slide ? 20 : 6, background: i===slide ? '#fff' : 'rgba(255,255,255,0.5)' }}/>
          ))}
        </div>
      </>)}
    </div>
  )
}
