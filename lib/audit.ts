import { db } from './db'

export interface AuditLogFields {
  member_id:          string | null
  server_id?:         string | null
  action:             string
  ip_address?:        string
  user_agent?:        string
  device_fingerprint?: string | null
  tool_name?:         string | null
  server_label?:      string | null
  session_id?:        string | null
  meta?:              Record<string, unknown>
}

export async function writeAuditLog(fields: AuditLogFields): Promise<void> {
  const { error } = await db.from('server_usage_logs').insert({
    member_id:          fields.member_id,
    server_id:          fields.server_id ?? null,
    action:             fields.action,
    ip_address:         fields.ip_address ?? null,
    user_agent:         fields.user_agent ?? null,
    device_fingerprint: fields.device_fingerprint ?? null,
    tool_name:          fields.tool_name ?? null,
    server_label:       fields.server_label ?? null,
    session_id:         fields.session_id ?? null,
    meta:               fields.meta ?? {},
  })
  if (error) console.error('[audit] write failed:', error.message, { action: fields.action, member_id: fields.member_id })
}
