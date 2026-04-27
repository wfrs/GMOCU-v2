import { eq, desc, like } from 'drizzle-orm'
import { CreateSeedSchema, UpdateSeedSchema } from '@shared/ipc-schemas'
import { ok, err } from '../types/ipc'
import { seeds } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import type { DB } from '../db'

export function registerSeedHandlers(db: DB): void {
  loggedHandle('seeds:list', (_event, search?: string) => {
    try {
      const rows = search
        ? db.select().from(seeds).where(like(seeds.name, `%${search}%`)).orderBy(desc(seeds.createdAt)).all()
        : db.select().from(seeds).orderBy(desc(seeds.createdAt)).all()
      return ok(rows)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('seeds:get', (_event, id: number) => {
    try {
      const row = db.select().from(seeds).where(eq(seeds.id, id)).get()
      if (!row) return err(`Seed ${id} not found`)
      return ok(row)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('seeds:create', (_event, payload: unknown) => {
    try {
      const parsed = CreateSeedSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      const now = new Date()
      const result = db.insert(seeds).values({ ...parsed.data, createdAt: now, updatedAt: now }).returning().get()
      return ok(result)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('seeds:update', (_event, id: number, payload: unknown) => {
    try {
      const parsed = UpdateSeedSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      db.update(seeds).set({ ...parsed.data, updatedAt: new Date() }).where(eq(seeds.id, id)).run()
      const updated = db.select().from(seeds).where(eq(seeds.id, id)).get()
      return ok(updated)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('seeds:delete', (_event, id: number) => {
    try {
      db.delete(seeds).where(eq(seeds.id, id)).run()
      return ok(undefined)
    } catch (e) { return err(String(e)) }
  })
}
