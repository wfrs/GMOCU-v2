import { eq, asc } from 'drizzle-orm'
import { CreateCategorySchema, UpdateCategorySchema } from '@shared/ipc-schemas'
import { ok, err } from '../types/ipc'
import { categories } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import type { DB } from '../db'

export function registerCategoryHandlers(db: DB): void {
  loggedHandle('categories:list', () => {
    try {
      const rows = db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)).all()
      return ok(rows)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('categories:create', (_event, payload: unknown) => {
    try {
      const parsed = CreateCategorySchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      const result = db.insert(categories).values({ ...parsed.data, createdAt: new Date() }).returning().get()
      return ok(result)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('categories:update', (_event, id: number, payload: unknown) => {
    try {
      const parsed = UpdateCategorySchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      db.update(categories).set(parsed.data).where(eq(categories.id, id)).run()
      const updated = db.select().from(categories).where(eq(categories.id, id)).get()
      return ok(updated)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('categories:delete', (_event, id: number) => {
    try {
      db.delete(categories).where(eq(categories.id, id)).run()
      return ok(undefined)
    } catch (e) { return err(String(e)) }
  })
}
