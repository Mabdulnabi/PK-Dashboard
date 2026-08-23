'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LandingInner } from './_content'

function LandingRoute() {
  const searchParams = useSearchParams()
  return <LandingInner embedded={searchParams.get('embedded') === '1'}/>
}

export default function Landing() {
  return (
    <Suspense>
      <LandingRoute/>
    </Suspense>
  )
}
