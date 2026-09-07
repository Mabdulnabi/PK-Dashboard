import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: tool } = await service
    .from('shop_tools')
    .select('name, description, image_url, category_slug, price_egp, rating')
    .eq('details_slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!tool) return { title: 'Pro Keys' }

  const title = `${tool.name} | Pro Keys`
  const description = tool.description
    ? tool.description.slice(0, 155)
    : `اشترك في ${tool.name} بأفضل سعر في مصر — Pro Keys`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: tool.image_url ? [{ url: tool.image_url, width: 1200, height: 630, alt: tool.name }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: tool.image_url ? [tool.image_url] : [],
    },
  }
}

export default function ToolSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
