import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Returns the primary admin's display info for the chat widget header
export async function GET() {
  const { data } = await db
    .from('admin_profiles')
    .select('display_name, avatar_url')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    name:   data?.display_name || 'Support Team',
    avatar: data?.avatar_url   || null,
  })
}
