import { describe, it, expect, beforeEach } from 'vitest'
import { eq, desc, like, or, and } from 'drizzle-orm'
import { createTestDb, type TestDB } from '../db/test-helpers'
import { gmos, organisms, plasmids, settings } from '../db/schema'
import { ok, err } from '../types/ipc'
import { CreatePlasmidSchema, UpdatePlasmidSchema, PlasmidFiltersSchema } from '@shared/ipc-schemas'

// ─── Inline handler logic (mirrors plasmids.ts, no ipcMain dependency) ────────

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function listPlasmids(db: TestDB, filtersRaw?: unknown) {
  try {
    const filters = PlasmidFiltersSchema.parse(filtersRaw ?? {})
    let where: ReturnType<typeof and> | undefined
    if (filters.search) {
      const term = `%${filters.search}%`
      where = or(like(plasmids.name, term), like(plasmids.description, term))
    }
    if (filters.status) {
      const f = eq(plasmids.status, filters.status)
      where = where ? and(where, f) : f
    }
    return ok(db.select().from(plasmids).where(where).orderBy(desc(plasmids.createdAt)).all())
  } catch (e) { return err(String(e)) }
}

function createPlasmid(db: TestDB, payload: unknown) {
  try {
    const parsed = CreatePlasmidSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    const now = new Date()
    return ok(db.transaction((tx) => {
      const created = tx.insert(plasmids).values({ ...parsed.data, createdAt: now, updatedAt: now }).returning().get()
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
            plasmidId: created.id,
            hostOrganismId: matchedOrganism?.id ?? null,
            strain,
            createdDate: parsed.data.dateCreated ?? null,
            createdAt: now
          }).run()
        }
      }

      return created
    }))
  } catch (e) { return err(String(e)) }
}

function updatePlasmid(db: TestDB, id: number, payload: unknown) {
  try {
    const parsed = UpdatePlasmidSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    db.update(plasmids).set({ ...parsed.data, updatedAt: new Date() }).where(eq(plasmids.id, id)).run()
    return ok(db.select().from(plasmids).where(eq(plasmids.id, id)).get())
  } catch (e) { return err(String(e)) }
}

function deletePlasmid(db: TestDB, id: number) {
  try {
    db.update(plasmids).set({ status: 'abandoned', updatedAt: new Date() }).where(eq(plasmids.id, id)).run()
    return ok(undefined)
  } catch (e) { return err(String(e)) }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('plasmid handlers', () => {
  let db: TestDB

  beforeEach(async () => { db = await createTestDb() })

  describe('create', () => {
    it('creates a plasmid with required fields', () => {
      const resp = createPlasmid(db, { name: 'pJL001', creatorName: 'Julia', creatorInitials: 'JJ' })
      expect(resp.success).toBe(true)
      expect(resp.data!.name).toBe('pJL001')
      expect(resp.data!.status).toBe('planned')
      expect(resp.data!.creatorInitials).toBe('JJ')
    })

    it('assigns an autoincrement id', () => {
      const a = createPlasmid(db, { name: 'pA' })
      const b = createPlasmid(db, { name: 'pB' })
      expect(b.data!.id).toBe(a.data!.id + 1)
    })

    it('rejects missing name', () => {
      expect(createPlasmid(db, {}).success).toBe(false)
    })

    it('accepts any string status (validated at selection_values level)', () => {
      expect(createPlasmid(db, { name: 'p', status: 'planned' }).success).toBe(true)
      expect(createPlasmid(db, { name: 'p', status: 'complete' }).success).toBe(true)
    })

    it('stores genbank file path', () => {
      const resp = createPlasmid(db, { name: 'pGB', gbFilePath: '/data/plasmids/pGB.gb' })
      expect(resp.data!.gbFilePath).toBe('/data/plasmids/pGB.gb')
    })

    it('stores cassette string', () => {
      const resp = createPlasmid(db, { name: 'pCass', cassette: '35S-GFP-NOS' })
      expect(resp.data!.cassette).toBe('35S-GFP-NOS')
    })

    it('auto-creates a GMO entry when workflow settings enable it', () => {
      const ecoli = db.insert(organisms).values({ name: 'Escherichia coli', shortName: 'EsCo', riskGroup: 1 }).returning().get()
      db.update(settings).set({
        autoCreateGmoEnabled: true,
        autoCreateGmoOrganism: 'EsCo',
        autoCreateGmoStrain: 'TOP10'
      }).where(eq(settings.id, 1)).run()

      const resp = createPlasmid(db, { name: 'pAuto', dateCreated: new Date('2024-04-01') })
      expect(resp.success).toBe(true)

      const createdGmos = db.select().from(gmos).where(eq(gmos.plasmidId, resp.data!.id)).all()
      expect(createdGmos).toHaveLength(1)
      expect(createdGmos[0].hostOrganismId).toBe(ecoli.id)
      expect(createdGmos[0].strain).toBe('TOP10')
      expect(createdGmos[0].createdDate?.toISOString()).toContain('2024-04-01')
    })

    it('does not auto-create a GMO when workflow setting is disabled', () => {
      db.update(settings).set({
        autoCreateGmoEnabled: false,
        autoCreateGmoOrganism: 'EsCo',
        autoCreateGmoStrain: 'TOP10'
      }).where(eq(settings.id, 1)).run()

      const resp = createPlasmid(db, { name: 'pNoAuto' })
      expect(resp.success).toBe(true)
      expect(db.select().from(gmos).where(eq(gmos.plasmidId, resp.data!.id)).all()).toHaveLength(0)
    })
  })

  describe('list', () => {
    beforeEach(() => {
      createPlasmid(db, { name: 'pAlpha', status: 'planned', description: 'GFP expression' })
      createPlasmid(db, { name: 'pBeta', status: 'complete' })
      createPlasmid(db, { name: 'pGamma-GFP', status: 'in_progress' })
    })

    it('lists all plasmids', () => {
      expect(listPlasmids(db).data).toHaveLength(3)
    })

    it('filters by status', () => {
      const resp = listPlasmids(db, { status: 'complete' })
      expect(resp.data).toHaveLength(1)
      expect(resp.data![0].name).toBe('pBeta')
    })

    it('searches by name', () => {
      const resp = listPlasmids(db, { search: 'GFP' })
      expect(resp.data).toHaveLength(2) // pAlpha (description) + pGamma-GFP (name)
    })

    it('returns empty array when nothing matches', () => {
      expect(listPlasmids(db, { search: 'XXXXXX' }).data).toHaveLength(0)
    })
  })

  describe('update', () => {
    it('updates plasmid fields', () => {
      const created = createPlasmid(db, { name: 'pOrig' })
      const id = created.data!.id
      const updated = updatePlasmid(db, id, { name: 'pRenamed', status: 'finished' })
      expect(updated.data!.name).toBe('pRenamed')
      expect(updated.data!.status).toBe('finished')
    })

    it('partial update leaves other fields unchanged', () => {
      const created = createPlasmid(db, { name: 'pOrig', description: 'Keep this' })
      const id = created.data!.id
      updatePlasmid(db, id, { status: 'complete' })
      const after = db.select().from(plasmids).where(eq(plasmids.id, id)).get()
      expect(after!.description).toBe('Keep this')
      expect(after!.status).toBe('complete')
    })

    it('accepts any string status on update', () => {
      const created = createPlasmid(db, { name: 'p' })
      expect(updatePlasmid(db, created.data!.id, { status: 'complete' }).success).toBe(true)
    })
  })

  describe('delete (soft)', () => {
    it('sets status to abandoned', () => {
      const created = createPlasmid(db, { name: 'pToDelete', status: 'complete' })
      const id = created.data!.id
      deletePlasmid(db, id)
      const after = db.select().from(plasmids).where(eq(plasmids.id, id)).get()
      expect(after!.status).toBe('abandoned')
    })

    it('still appears in list after soft delete', () => {
      const created = createPlasmid(db, { name: 'pDeleted' })
      deletePlasmid(db, created.data!.id)
      expect(listPlasmids(db).data).toHaveLength(1)
    })
  })
})
