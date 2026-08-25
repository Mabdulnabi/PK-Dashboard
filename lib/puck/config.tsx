import type { Config } from '@puckeditor/core'

const GOLD = '#d99401'

// ── Shared render helpers ──────────────────────────────────────────────────
function getYoutubeEmbed(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : url
}

// ── Block render components (shown in Puck canvas + member page) ───────────

function HeroRender({ image_url, title_en, title_ar, body_en, body_ar, image_side }: any) {
  const reversed = image_side === 'right'
  return (
    <section className={`flex flex-col md:flex-row gap-8 items-center p-8 ${reversed ? 'md:flex-row-reverse' : ''}`}>
      {image_url && (
        <div className="md:w-1/2 flex-shrink-0">
          <img src={image_url} alt={title_en} className="w-full rounded-2xl object-cover max-h-80"/>
        </div>
      )}
      <div className={`flex-1 ${image_url ? '' : 'text-center max-w-2xl mx-auto'}`}>
        {title_en  && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title_en}</h2>}
        {title_ar  && <p  className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-3 text-right" dir="rtl">{title_ar}</p>}
        {body_en   && <p  className="text-gray-600 dark:text-gray-300 leading-relaxed">{body_en}</p>}
        {body_ar   && <p  className="text-gray-500 dark:text-gray-400 leading-relaxed text-right mt-2" dir="rtl">{body_ar}</p>}
      </div>
    </section>
  )
}

function TextRender({ title_en, title_ar, body_en, body_ar }: any) {
  return (
    <section className="max-w-3xl mx-auto px-8 py-10 text-center">
      {title_en && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{title_en}</h2>}
      {title_ar && <p  className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-4" dir="rtl">{title_ar}</p>}
      {body_en  && <p  className="text-gray-600 dark:text-gray-300 leading-relaxed">{body_en}</p>}
      {body_ar  && <p  className="text-gray-500 dark:text-gray-400 leading-relaxed mt-2" dir="rtl">{body_ar}</p>}
    </section>
  )
}

function ImageBannerRender({ image_url }: any) {
  if (!image_url) return (
    <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-xl text-gray-400 text-sm">
      No image selected
    </div>
  )
  return <img src={image_url} alt="Banner" className="w-full object-cover max-h-80 rounded-xl"/>
}

function FeaturesRender({ title_en, title_ar, features }: any) {
  return (
    <section className="px-8 py-10">
      {title_en && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">{title_en}</h2>}
      {title_ar && <p  className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-6 text-center" dir="rtl">{title_ar}</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(features || []).map((f: any, i: number) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
            <span className="text-2xl flex-shrink-0">{f.icon}</span>
            <div>
              {f.en && <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{f.en}</p>}
              {f.ar && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" dir="rtl">{f.ar}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function VideoRender({ video_url, title_en, title_ar }: any) {
  const embed = video_url ? getYoutubeEmbed(video_url) : null
  return (
    <section className="px-8 py-10">
      {title_en && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">{title_en}</h2>}
      {title_ar && <p  className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-4 text-center" dir="rtl">{title_ar}</p>}
      {embed
        ? <div className="aspect-video rounded-2xl overflow-hidden"><iframe src={embed} className="w-full h-full" allowFullScreen title="video"/></div>
        : <div className="aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">No video URL</div>
      }
    </section>
  )
}

function FAQRender({ title_en, title_ar, faqs }: any) {
  return (
    <section className="max-w-3xl mx-auto px-8 py-10">
      {title_en && <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">{title_en}</h2>}
      {title_ar && <p  className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-6 text-center" dir="rtl">{title_ar}</p>}
      <div className="space-y-3">
        {(faqs || []).map((f: any, i: number) => (
          <details key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden group">
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <span>{f.q_en}</span>
              {f.q_ar && <span className="text-sm text-gray-500 ml-4" dir="rtl">{f.q_ar}</span>}
            </summary>
            <div className="px-5 pb-4 pt-1 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {f.a_en && <p>{f.a_en}</p>}
              {f.a_ar && <p dir="rtl" className="text-right">{f.a_ar}</p>}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

// ── Puck Config ────────────────────────────────────────────────────────────
export const puckConfig: Config = {
  components: {
    HeroBlock: {
      label: 'Hero — Image + Text',
      fields: {
        image_side: {
          type: 'radio',
          label: 'Image Side',
          options: [
            { label: 'Left',  value: 'left'  },
            { label: 'Right', value: 'right' },
          ],
        },
        image_url: { type: 'text', label: 'Image URL' },
        title_en:  { type: 'text', label: '🇬🇧 Title (EN)' },
        title_ar:  { type: 'text', label: '🇪🇬 العنوان (AR)' },
        body_en:   { type: 'textarea', label: '🇬🇧 Body (EN)' },
        body_ar:   { type: 'textarea', label: '🇪🇬 النص (AR)' },
      },
      defaultProps: {
        image_side: 'left',
        image_url: '',
        title_en: 'Section Title',
        title_ar: 'عنوان القسم',
        body_en: 'Describe this section in English.',
        body_ar: 'وصف القسم باللغة العربية.',
      },
      render: HeroRender,
    },

    TextBlock: {
      label: 'Text Only',
      fields: {
        title_en: { type: 'text',     label: '🇬🇧 Title (EN)' },
        title_ar: { type: 'text',     label: '🇪🇬 العنوان (AR)' },
        body_en:  { type: 'textarea', label: '🇬🇧 Body (EN)' },
        body_ar:  { type: 'textarea', label: '🇪🇬 النص (AR)' },
      },
      defaultProps: {
        title_en: 'Section Title',
        title_ar: 'عنوان القسم',
        body_en:  'Full-width text content here.',
        body_ar:  'النص هنا.',
      },
      render: TextRender,
    },

    ImageBanner: {
      label: 'Image Banner',
      fields: {
        image_url: { type: 'text', label: 'Image URL' },
      },
      defaultProps: { image_url: '' },
      render: ImageBannerRender,
    },

    FeaturesGrid: {
      label: 'Features Grid',
      fields: {
        title_en: { type: 'text', label: '🇬🇧 Section Title (EN)' },
        title_ar: { type: 'text', label: '🇪🇬 عنوان القسم (AR)' },
        features: {
          type: 'array',
          label: 'Features',
          arrayFields: {
            icon: { type: 'text', label: 'Icon (emoji)' },
            en:   { type: 'text', label: 'Text (EN)' },
            ar:   { type: 'text', label: 'النص (AR)' },
          },
          defaultItemProps: { icon: '⭐', en: 'Feature', ar: 'ميزة' },
        },
      },
      defaultProps: {
        title_en: 'Why Choose Us',
        title_ar: 'لماذا تختارنا',
        features: [
          { icon: '⚡', en: 'Instant delivery', ar: 'تسليم فوري' },
          { icon: '🔒', en: 'Secure & private',  ar: 'آمن وخاص' },
          { icon: '💬', en: '24/7 support',      ar: 'دعم على مدار الساعة' },
        ],
      },
      render: FeaturesRender,
    },

    VideoBlock: {
      label: 'Video Embed',
      fields: {
        title_en:  { type: 'text', label: '🇬🇧 Title (EN)' },
        title_ar:  { type: 'text', label: '🇪🇬 العنوان (AR)' },
        video_url: { type: 'text', label: 'YouTube URL' },
      },
      defaultProps: {
        title_en:  'Watch the Demo',
        title_ar:  'شاهد العرض',
        video_url: '',
      },
      render: VideoRender,
    },

    FAQBlock: {
      label: 'FAQ',
      fields: {
        title_en: { type: 'text', label: '🇬🇧 Section Title (EN)' },
        title_ar: { type: 'text', label: '🇪🇬 عنوان القسم (AR)' },
        faqs: {
          type: 'array',
          label: 'Questions',
          arrayFields: {
            q_en: { type: 'text',     label: 'Question (EN)' },
            q_ar: { type: 'text',     label: 'السؤال (AR)' },
            a_en: { type: 'textarea', label: 'Answer (EN)' },
            a_ar: { type: 'textarea', label: 'الإجابة (AR)' },
          },
          defaultItemProps: { q_en: 'Question?', q_ar: 'السؤال؟', a_en: 'Answer here.', a_ar: 'الإجابة هنا.' },
        },
      },
      defaultProps: {
        title_en: 'Frequently Asked Questions',
        title_ar: 'الأسئلة الشائعة',
        faqs: [
          { q_en: 'How fast is delivery?', q_ar: 'ما سرعة التسليم؟', a_en: 'Instantly after payment.', a_ar: 'فوراً بعد الدفع.' },
        ],
      },
      render: FAQRender,
    },
  },
}

export type { Config }
