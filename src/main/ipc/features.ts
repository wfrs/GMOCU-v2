import { eq, like } from 'drizzle-orm'
import { CreateFeatureSchema, UpdateFeatureSchema } from '@shared/ipc-schemas'
import { ok, err } from '../types/ipc'
import { features } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import type { DB } from '../db'

export function registerFeatureHandlers(db: DB): void {
  loggedHandle('features:list', (_event, search?: string) => {
    try {
      const rows = search
        ? db.select().from(features).where(like(features.name, `%${search}%`)).all()
        : db.select().from(features).all()
      return ok(rows)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('features:get', (_event, id: number) => {
    try {
      const row = db.select().from(features).where(eq(features.id, id)).get()
      if (!row) return err(`Feature ${id} not found`)
      return ok(row)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('features:create', (_event, payload: unknown) => {
    try {
      const parsed = CreateFeatureSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      const result = db.insert(features).values(parsed.data).returning().get()
      return ok(result)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('features:update', (_event, id: number, payload: unknown) => {
    try {
      const parsed = UpdateFeatureSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      db.update(features).set(parsed.data).where(eq(features.id, id)).run()
      const updated = db.select().from(features).where(eq(features.id, id)).get()
      return ok(updated)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('features:delete', (_event, id: number) => {
    try {
      db.delete(features).where(eq(features.id, id)).run()
      return ok(undefined)
    } catch (e) { return err(String(e)) }
  })
}
