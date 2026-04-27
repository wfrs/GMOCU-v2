import { eq, asc } from 'drizzle-orm'
import { ok, err } from '../types/ipc'
import { selectionValues } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import type { DB } from '../db'

export function registerSelectionValueHandlers(db: DB): void {
  loggedHandle('selectionValues:list', () => {
    try {
      const rows = db.select().from(selectionValues).orderBy(asc(selectionValues.sortOrder)).all()
      return ok(rows)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('selectionValues:update', (_event, id: number, payload: unknown) => {
    try {
      const data = payload as { colour?: string | null }
      db.update(selectionValues).set({ colour: data.colour ?? null }).where(eq(selectionValues.id, id)).run()
      const updated = db.select().from(selectionValues).where(eq(selectionValues.id, id)).get()
      return ok(updated)
    } catch (e) { return err(String(e)) }
  })
}
