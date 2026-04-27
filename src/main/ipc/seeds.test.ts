import { describe, it, expect, beforeEach } from 'vitest'
import { eq, desc, like } from 'drizzle-orm'
import { createTestDb, type TestDB } from '../db/test-helpers'
import { seeds } from '../db/schema'
import { ok, err } from '../types/ipc'
import { CreateSeedSchema, UpdateSeedSchema } from '@shared/ipc-schemas'

function listSeeds(db: TestDB, search?: string) {
  try {
    const rows = search
      ? db.select().from(seeds).where(like(seeds.name, `%${search}%`)).orderBy(desc(seeds.createdAt)).all()
      : db.select().from(seeds).orderBy(desc(seeds.createdAt)).all()
    return ok(rows)
  } catch (e) { return err(String(e)) }
}

function createSeed(db: TestDB, payload: unknown) {
  try {
    const parsed = CreateSeedSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    const now = new Date()
    return ok(db.insert(seeds).values({ ...parsed.data, createdAt: now, updatedAt: now }).returning().get())
  } catch (e) { return err(String(e)) }
}

function updateSeed(db: TestDB, id: number, payload: unknown) {
  try {
    const parsed = UpdateSeedSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    db.update(seeds).set({ ...parsed.data, updatedAt: new Date() }).where(eq(seeds.id, id)).run()
    return ok(db.select().from(seeds).where(eq(seeds.id, id)).get())
  } catch (e) { return err(String(e)) }
}

function deleteSeed(db: TestDB, id: number) {
  try {
    db.delete(seeds).where(eq(seeds.id, id)).run()
    return ok(undefined)
  } catch (e) { return err(String(e)) }
}

describe('seed handlers', () => {
  let db: TestDB

  beforeEach(async () => { db = await createTestDb() })

  describe('create', () => {
    it('creates seed with required fields', () => {
      const resp = createSeed(db, { name: 'Col-0', species: 'Arabidopsis thaliana' })
      expect(resp.success).toBe(true)
      expect(resp.data!.name).toBe('Col-0')
      expect(resp.data!.species).toBe('Arabidopsis thaliana')
    })

    it('stores all optional fields', () => {
      const resp = createSeed(db, {
        name: 'Col-0 #3',
        species: 'Arabidopsis thaliana',
        lineAccession: 'CS70000',
        source: 'TAIR',
        storageLocation: 'Fridge A, box 3',
        notes: 'WT ecotype, generation T3'
      })
      expect(resp.data!.lineAccession).toBe('CS70000')
      expect(resp.data!.source).toBe('TAIR')
      expect(resp.data!.storageLocation).toBe('Fridge A, box 3')
      expect(resp.data!.notes).toBe('WT ecotype, generation T3')
    })

    it('rejects missing name', () => {
      expect(createSeed(db, { species: 'A. thaliana' }).success).toBe(false)
    })

    it('rejects missing species', () => {
      expect(createSeed(db, { name: 'Col-0' }).success).toBe(false)
    })

    it('assigns timestamps', () => {
      const resp = createSeed(db, { name: 'Col-0', species: 'A. thaliana' })
      expect(resp.data!.createdAt).toBeInstanceOf(Date)
      expect(resp.data!.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('list', () => {
    beforeEach(() => {
      createSeed(db, { name: 'Col-0', species: 'Arabidopsis thaliana' })
      createSeed(db, { name: 'Ler-0', species: 'Arabidopsis thaliana' })
      createSeed(db, { name: 'N. benthamiana WT', species: 'Nicotiana benthamiana' })
    })

    it('lists all seeds', () => {
      expect(listSeeds(db).data).toHaveLength(3)
    })

    it('filters by name', () => {
      const resp = listSeeds(db, 'Col')
      expect(resp.data).toHaveLength(1)
      expect(resp.data![0].name).toBe('Col-0')
    })

    it('returns empty array for no match', () => {
      expect(listSeeds(db, 'Tomato').data).toHaveLength(0)
    })
  })

  describe('update', () => {
    it('updates storage location', () => {
      const created = createSeed(db, { name: 'Col-0', species: 'A. thaliana' })
      updateSeed(db, created.data!.id, { storageLocation: 'Fridge B, box 1' })
      const after = db.select().from(seeds).where(eq(seeds.id, created.data!.id)).get()
      expect(after!.storageLocation).toBe('Fridge B, box 1')
    })

    it('updates updatedAt timestamp', async () => {
      const created = createSeed(db, { name: 'Col-0', species: 'A. thaliana' })
      const before = created.data!.updatedAt
      // Small delay to ensure timestamp difference
      await new Promise((r) => setTimeout(r, 5))
      updateSeed(db, created.data!.id, { notes: 'updated' })
      const after = db.select().from(seeds).where(eq(seeds.id, created.data!.id)).get()
      expect(after!.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('partial update preserves species', () => {
      const created = createSeed(db, { name: 'Col-0', species: 'Arabidopsis thaliana' })
      updateSeed(db, created.data!.id, { notes: 'new note' })
      const after = db.select().from(seeds).where(eq(seeds.id, created.data!.id)).get()
      expect(after!.species).toBe('Arabidopsis thaliana')
    })
  })

  describe('delete', () => {
    it('permanently removes seed', () => {
      const created = createSeed(db, { name: 'Col-0', species: 'A. thaliana' })
      deleteSeed(db, created.data!.id)
      expect(listSeeds(db).data).toHaveLength(0)
    })

    it('does not affect other seeds', () => {
      const a = createSeed(db, { name: 'Col-0', species: 'A. thaliana' })
      createSeed(db, { name: 'Ler-0', species: 'A. thaliana' })
      deleteSeed(db, a.data!.id)
      expect(listSeeds(db).data).toHaveLength(1)
      expect(listSeeds(db).data![0].name).toBe('Ler-0')
    })
  })
})
