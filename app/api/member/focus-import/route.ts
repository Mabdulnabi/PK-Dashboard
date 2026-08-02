import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSession() {
  const token = cookies().get('pk_member_token')?.value
  if (!token) return null
  const { data } = await service.rpc('verify_member_session', { p_token: token })
  return data?.valid ? data : null
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data: payload, mode = 'merge' } = body as {
    data: {
      version?: string
      bookmarks?: any[]
      notes?: any[]
      tasks?: any[]
      calendar_events?: any[]
    }
    mode?: 'merge' | 'replace'
  }

  if (!payload || typeof payload !== 'object')
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

  const mid = session.member_id

  // Replace mode: wipe private data first
  if (mode === 'replace') {
    await Promise.all([
      service.from('focus_bookmarks').delete().eq('member_id', mid).is('board_id', null),
      service.from('focus_notes').delete().eq('member_id', mid).is('board_id', null),
      service.from('focus_tasks').delete().eq('member_id', mid).is('board_id', null),
      service.from('focus_calendar').delete().eq('member_id', mid).is('board_id', null),
    ])
  }

  const stats = { bookmarks: 0, notes: 0, tasks: 0, events: 0 }

  // ── Bookmarks: folders first, then bookmarks (remap folder_id) ──────────────
  const folderIdMap: Record<string, string> = {}
  const folders  = (payload.bookmarks || []).filter((b: any) => b.type === 'folder')
  const bmarks   = (payload.bookmarks || []).filter((b: any) => b.type === 'bookmark')

  for (const f of folders) {
    const { data } = await service
      .from('focus_bookmarks')
      .insert({ member_id: mid, created_by: mid, type: 'folder', name: f.name, url: null, folder_id: null })
      .select('id').single()
    if (data) folderIdMap[f.id] = data.id
    stats.bookmarks++
  }

  for (const bm of bmarks) {
    await service.from('focus_bookmarks').insert({
      member_id:  mid,
      created_by: mid,
      type:       'bookmark',
      name:       bm.name,
      url:        bm.url || null,
      folder_id:  bm.folder_id ? (folderIdMap[bm.folder_id] ?? null) : null,
    })
    stats.bookmarks++
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  for (const n of payload.notes || []) {
    await service.from('focus_notes').insert({
      member_id: mid, created_by: mid,
      title:   n.title   || 'Untitled Note',
      content: n.content || '',
    })
    stats.notes++
  }

  // ── Tasks ────────────────────────────────────────────────────────────────────
  for (const t of payload.tasks || []) {
    await service.from('focus_tasks').insert({
      member_id:   mid,
      created_by:  mid,
      title:       t.title    || 'Task',
      deadline:    t.deadline  || null,
      priority:    t.priority  || 'medium',
      done:        t.done      || false,
      remind_at:   t.remind_at || null,
      description: t.description || null,
    })
    stats.tasks++
  }

  // ── Calendar events ──────────────────────────────────────────────────────────
  for (const e of payload.calendar_events || []) {
    if (!e.start_at) continue
    await service.from('focus_calendar').insert({
      member_id:   mid,
      created_by:  mid,
      title:       e.title       || 'Event',
      description: e.description || null,
      start_at:    e.start_at,
      end_at:      e.end_at      || null,
      all_day:     e.all_day     || false,
      color:       e.color       || '#06b6d4',
      remind_at:   e.remind_at   || null,
      recurrence:  e.recurrence  || 'none',
    })
    stats.events++
  }

  return NextResponse.json({ success: true, stats })
}
