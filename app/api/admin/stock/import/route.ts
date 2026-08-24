import { NextRequest, NextResponse } from 'next/server'
import { db as service } from '@/lib/db'

const BATCH = 100

export async function POST(req: NextRequest) {
  const { tool_id, import_type, rows } = await req.json() as {
    tool_id:     string
    import_type: 'account' | 'key'
    rows:        Record<string, string>[]
  }

  if (!tool_id)     return NextResponse.json({ error: 'tool_id required' },     { status: 400 })
  if (!import_type) return NextResponse.json({ error: 'import_type required' }, { status: 400 })
  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })

  // Fetch existing emails/keys to detect duplicates
  const { data: existing } = await service
    .from('private_accounts_stock')
    .select('email, key_enc')
    .eq('tool_id', tool_id)

  const existingEmails = new Set((existing || []).map((r: any) => r.email?.toLowerCase()).filter(Boolean))
  const existingKeys   = new Set((existing || []).map((r: any) => r.key_enc?.toLowerCase()).filter(Boolean))

  const toInsert: Record<string, unknown>[] = []
  const errors:   { row: number; reason: string }[] = []
  let skipped = 0

  rows.forEach((row, idx) => {
    const rowNum = idx + 1

    if (import_type === 'account') {
      const email    = row.email?.trim()
      const password = row.password?.trim()
      if (!email || !password) {
        errors.push({ row: rowNum, reason: 'Missing email or password' })
        return
      }
      if (existingEmails.has(email.toLowerCase())) {
        skipped++
        return
      }
      existingEmails.add(email.toLowerCase())
      toInsert.push({
        tool_id,
        delivery_type: 'account',
        email,
        password_enc: password,
        key_enc:      null,
        notes:        null,
        status:       'available',
      })
    } else {
      const key = (row.key || row.Key || row.KEY)?.trim()
      if (!key) {
        errors.push({ row: rowNum, reason: 'Missing key' })
        return
      }
      if (existingKeys.has(key.toLowerCase())) {
        skipped++
        return
      }
      existingKeys.add(key.toLowerCase())
      toInsert.push({
        tool_id,
        delivery_type: 'key',
        email:        null,
        password_enc: null,
        key_enc:      key,
        notes:        null,
        status:       'available',
      })
    }
  })

  let imported = 0
  const batchErrors: { row: number; reason: string }[] = []

  // Insert in batches
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)
    const { error } = await service.from('private_accounts_stock').insert(batch)
    if (error) {
      // Mark the whole batch as failed
      batch.forEach((_, j) => batchErrors.push({ row: i + j + 1, reason: error.message }))
    } else {
      imported += batch.length
    }
  }

  return NextResponse.json({
    total:    rows.length,
    imported,
    skipped,
    failed:   errors.length + batchErrors.length,
    errors:   [...errors, ...batchErrors],
  })
}
