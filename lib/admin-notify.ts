import { db } from './db'

export async function fireAdminNotification(fields: {
  title: string
  message: string
  type?: 'info' | 'warning' | 'success' | 'danger'
  link?: string
}): Promise<void> {
  const { error } = await db.from('admin_notifications').insert({
    title:   fields.title,
    message: fields.message,
    type:    fields.type ?? 'info',
    link:    fields.link ?? null,
  })
  if (error) console.error('[admin-notify] failed:', error.message)
}
