import { eq } from 'drizzle-orm'
import { UpdateSettingsSchema } from '@shared/ipc-schemas'
import { ok, err } from '../types/ipc'
import { settings } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import type { DB } from '../db'

export function registerSettingsHandlers(db: DB): void {
  loggedHandle('settings:get', () => {
    try {
      const row = db.select().from(settings).where(eq(settings.id, 1)).get()
      return ok(row)
    } catch (e) {
      return err(String(e))
    }
  })

  loggedHandle('settings:update', (_event, payload: unknown) => {
    try {
      const parsed = UpdateSettingsSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)

      db.update(settings)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(settings.id, 1))
        .run()
      const updated = db.select().from(settings).where(eq(settings.id, 1)).get()
      return ok(updated)
    } catch (e) {
      return err(String(e))
    }
  })
}
