import { createClient } from '@supabase/supabase-js'

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuditEntry {
  action: string
  actor_type?: 'admin' | 'member' | 'system'
  actor_id?: string
  actor_name?: string
  target_type?: string
  target_id?: string
  details?: Record<string, unknown>
  ip?: string
}

export async function logAudit(entry: AuditEntry) {
  await service.from('admin_audit_logs').insert({
    action:      entry.action,
    actor_type:  entry.actor_type ?? 'system',
    actor_id:    entry.actor_id   ?? null,
    actor_name:  entry.actor_name ?? null,
    target_type: entry.target_type ?? null,
    target_id:   entry.target_id   ?? null,
    details:     entry.details     ?? {},
    ip:          entry.ip          ?? null,
  })
}

export const writeAuditLog = logAudit
