export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth'
import { unauthorized } from '@/lib/responses'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin() } catch { return unauthorized() }

  const body = await req.json()
  const { action, reason } = body

  if (!['approve', 'reject', 'revision', 'note'].includes(action))
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  // Internal note — only saves admin_note, no status change
  if (action === 'note') {
    const { error } = await service.from('blog_posts').update({ admin_note: reason || null, updated_at: new Date().toISOString() }).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const statusMap: Record<string, string> = { approve: 'approved', reject: 'rejected', revision: 'revision_needed' }
  const update: Record<string, unknown> = {
    status: statusMap[action],
    updated_at: new Date().toISOString(),
  }
  if (action === 'approve')  update.published_at = new Date().toISOString()
  if (action !== 'approve')  update.rejection_reason = reason || null

  // Fetch post info for notification
  const { data: post } = await service.from('blog_posts').select('member_id, title').eq('id', params.id).single()

  const { data, error } = await service.from('blog_posts').update(update).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify member
  if (post?.member_id) {
    const msgs: Record<string, { title: string; title_en: string; message: string; message_en: string }> = {
      approve: {
        title: `تمت الموافقة على مقالك ✅`,
        title_en: `Your article was approved ✅`,
        message: `مقالك "${post.title}" تم نشره الآن للمجتمع.`,
        message_en: `Your article "${post.title}" is now published to the community.`,
      },
      reject: {
        title: `تم رفض مقالك ❌`,
        title_en: `Your article was rejected ❌`,
        message: `مقالك "${post.title}" تم رفضه${reason ? `: ${reason}` : '.'}`,
        message_en: `Your article "${post.title}" was rejected${reason ? `: ${reason}` : '.'}`,
      },
      revision: {
        title: `مقالك يحتاج تعديلات 📝`,
        title_en: `Your article needs revisions 📝`,
        message: `يرجى تعديل مقالك "${post.title}"${reason ? `: ${reason}` : '.'}`,
        message_en: `Please revise your article "${post.title}"${reason ? `: ${reason}` : '.'}`,
      },
    }
    const notif = msgs[action]
    if (notif) {
      void service.from('member_notifications').insert({
        member_id: post.member_id,
        ...notif,
        type: action === 'approve' ? 'success' : 'warning',
        link: '/u/blogs',
      })
    }
  }

  return NextResponse.json(data)
}
