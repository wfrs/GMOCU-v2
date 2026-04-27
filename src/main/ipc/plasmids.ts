import { eq, desc, like, or, and, type SQL } from 'drizzle-orm'
import { CreatePlasmidSchema, UpdatePlasmidSchema, PlasmidFiltersSchema } from '@shared/ipc-schemas'
import { ok, err } from '../types/ipc'
import { gmos, organisms, plasmids, settings } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import type { DB } from '../db'

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function registerPlasmidHandlers(db: DB): void {
  loggedHandle('plasmids:list', (_event, filtersRaw?: unknown) => {
    try {
      const filters = PlasmidFiltersSchema.parse(filtersRaw ?? {})

      let where: SQL | undefined
      if (filters.search) {
        const term = `%${filters.search}%`
        where = or(
          like(plasmids.name, term),
          like(plasmids.description, term),
          like(plasmids.cassette, term),
          like(plasmids.backboneVector, term)
        )
      }
      if (filters.creatorInitials) {
        const f = eq(plasmids.creatorInitials, filters.creatorInitials)
        where = where ? and(where, f) : f
      }
      if (filters.status) {
        const f = eq(plasmids.status, filters.status)
        where = where ? and(where, f) : f
      }
      if (filters.categoryId !== undefined) {
        const f = eq(plasmids.categoryId, filters.categoryId)
        where = where ? and(where, f) : f
      }

      const rows = db.select().from(plasmids).where(where).orderBy(desc(plasmids.createdAt)).all()
      return ok(rows)
    } catch (e) {
      return err(String(e))
    }
  })

  loggedHandle('plasmids:get', (_event, id: number) => {
    try {
      const row = db.select().from(plasmids).where(eq(plasmids.id, id)).get()
      if (!row) return err(`Plasmid ${id} not found`)
      return ok(row)
    } catch (e) {
      return err(String(e))
    }
  })

  loggedHandle('plasmids:create', (_event, payload: unknown) => {
    try {
      const parsed = CreatePlasmidSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)

      const now = new Date()
      const created = db.transaction((tx) => {
        const result = tx
          .insert(plasmids)
          .values({ ...parsed.data, createdAt: now, updatedAt: now })
          .run()

        const plasmidId = Number(result.lastInsertRowid)
        const createdPlasmid = tx.select().from(plasmids).where(eq(plasmids.id, plasmidId)).get()
        const appSettings = tx.select().from(settings).where(eq(settings.id, 1)).get()

        if (appSettings?.autoCreateGmoEnabled) {
          const organismHint = normalizeOptionalText(appSettings.autoCreateGmoOrganism)
          const strain = normalizeOptionalText(appSettings.autoCreateGmoStrain)
          const matchedOrganism = organismHint
            ? tx
                .select()
                .from(organisms)
                .where(or(eq(organisms.shortName, organismHint), eq(organisms.name, organismHint)))
                .get()
            : undefined

          if (matchedOrganism || organismHint || strain) {
            tx.insert(gmos).values({
              plasmidId,
              hostOrganismId: matchedOrganism?.id ?? null,
              strain,
              createdDate: parsed.data.dateCreated ?? null,
              createdAt: now
            }).run()
          }
        }

        return createdPlasmid
      })

      return ok(created)
    } catch (e) {
      return err(String(e))
    }
  })

  loggedHandle('plasmids:update', (_event, id: number, payload: unknown) => {
    try {
      const parsed = UpdatePlasmidSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)

      db.update(plasmids)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(plasmids.id, id))
        .run()

      const updated = db.select().from(plasmids).where(eq(plasmids.id, id)).get()
      return ok(updated)
    } catch (e) {
      return err(String(e))
    }
  })

  loggedHandle('plasmids:delete', (_event, id: number) => {
    try {
      db.update(plasmids)
        .set({ status: 'abandoned', updatedAt: new Date() })
        .where(eq(plasmids.id, id))
        .run()
      return ok(undefined)
    } catch (e) {
      return err(String(e))
    }
  })
}
