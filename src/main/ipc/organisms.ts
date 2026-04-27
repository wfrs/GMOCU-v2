import { eq, like } from 'drizzle-orm'
import { CreateOrganismSchema, UpdateOrganismSchema } from '@shared/ipc-schemas'
import { ok, err } from '../types/ipc'
import { organisms } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import type { DB } from '../db'

export function registerOrganismHandlers(db: DB): void {
  loggedHandle('organisms:list', (_event, search?: string) => {
    try {
      const rows = search
        ? db.select().from(organisms).where(like(organisms.name, `%${search}%`)).all()
        : db.select().from(organisms).all()
      return ok(rows)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('organisms:get', (_event, id: number) => {
    try {
      const row = db.select().from(organisms).where(eq(organisms.id, id)).get()
      if (!row) return err(`Organism ${id} not found`)
      return ok(row)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('organisms:create', (_event, payload: unknown) => {
    try {
      const parsed = CreateOrganismSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      const result = db.insert(organisms).values(parsed.data).returning().get()
      return ok(result)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('organisms:update', (_event, id: number, payload: unknown) => {
    try {
      const parsed = UpdateOrganismSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      db.update(organisms).set(parsed.data).where(eq(organisms.id, id)).run()
      const updated = db.select().from(organisms).where(eq(organisms.id, id)).get()
      return ok(updated)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('organisms:delete', (_event, id: number) => {
    try {
      db.delete(organisms).where(eq(organisms.id, id)).run()
      return ok(undefined)
    } catch (e) { return err(String(e)) }
  })
}
