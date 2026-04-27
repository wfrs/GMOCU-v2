import { describe, it, expect, beforeEach } from 'vitest'
import { eq, desc } from 'drizzle-orm'
import { createTestDb, type TestDB } from '../db/test-helpers'
import { gmos, organisms, plasmids } from '../db/schema'
import { ok, err } from '../types/ipc'
import { CreateGMOSchema, UpdateGMOSchema } from '@shared/ipc-schemas'

function listGMOs(db: TestDB) {
  try {
    return ok(db.select().from(gmos).orderBy(desc(gmos.createdAt), desc(gmos.id)).all())
  } catch (e) { return err(String(e)) }
}

function createGMO(db: TestDB, payload: unknown) {
  try {
    const parsed = CreateGMOSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    return ok(db.insert(gmos).values({ ...parsed.data, createdAt: new Date() }).returning().get())
  } catch (e) { return err(String(e)) }
}

function updateGMO(db: TestDB, id: number, payload: unknown) {
  try {
    const parsed = UpdateGMOSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    db.update(gmos).set(parsed.data).where(eq(gmos.id, id)).run()
    return ok(db.select().from(gmos).where(eq(gmos.id, id)).get())
  } catch (e) { return err(String(e)) }
}

function deleteGMO(db: TestDB, id: number) {
  try {
    db.delete(gmos).where(eq(gmos.id, id)).run()
    return ok(undefined)
  } catch (e) { return err(String(e)) }
}

describe('gmo handlers', () => {
  let db: TestDB

  beforeEach(async () => { db = await createTestDb() })

  describe('create', () => {
    it('creates GMO with no required fields (all optional)', () => {
      const resp = createGMO(db, { strain: 'TOP10' })
      expect(resp.success).toBe(true)
      expect(resp.data!.strain).toBe('TOP10')
    })

    it('stores all optional fields', () => {
      const createdDate = new Date('2024-01-15')
      const resp = createGMO(db, {
        approval: 'BVL-2024-001',
        strain: 'GV3101',
        createdDate,
        notes: 'Stored at -80°C'
      })
      expect(resp.success).toBe(true)
      expect(resp.data!.approval).toBe('BVL-2024-001')
      expect(resp.data!.strain).toBe('GV3101')
      expect(resp.data!.notes).toBe('Stored at -80°C')
    })

    it('links to an organism via FK', () => {
      const org = db.insert(organisms).values({ name: 'E. coli', riskGroup: 1 }).returning().get()
      const resp = createGMO(db, { hostOrganismId: org.id })
      expect(resp.data!.hostOrganismId).toBe(org.id)
    })

    it('links to a plasmid via FK', () => {
      const plasmid = db.insert(plasmids).values({ name: 'pJL001', status: 'planned', creatorName: '', creatorInitials: '', createdAt: new Date(), updatedAt: new Date() }).returning().get()
      const resp = createGMO(db, { plasmidId: plasmid.id })
      expect(resp.data!.plasmidId).toBe(plasmid.id)
    })

    it('stores glycerol stock info', () => {
      const resp = createGMO(db, { glycerolStockId: 'CJM001', box: 'Box-A' })
      expect(resp.data!.glycerolStockId).toBe('CJM001')
      expect(resp.data!.box).toBe('Box-A')
    })
  })

  describe('list', () => {
    it('returns all GMOs ordered by createdAt desc', () => {
      createGMO(db, { strain: 'TOP10' })
      createGMO(db, { strain: 'DH5a' })
      const resp = listGMOs(db)
      expect(resp.data).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('records destruction date', () => {
      const created = createGMO(db, { strain: 'TOP10' })
      const destroyedDate = new Date('2024-06-30')
      updateGMO(db, created.data!.id, { destroyedDate })
      const after = db.select().from(gmos).where(eq(gmos.id, created.data!.id)).get()
      expect(after!.destroyedDate).not.toBeNull()
    })

    it('can update approval reference', () => {
      const created = createGMO(db, {})
      updateGMO(db, created.data!.id, { approval: 'BVL-2024-042' })
      const after = db.select().from(gmos).where(eq(gmos.id, created.data!.id)).get()
      expect(after!.approval).toBe('BVL-2024-042')
    })
  })

  describe('delete', () => {
    it('permanently removes GMO', () => {
      const created = createGMO(db, { strain: 'TOP10' })
      deleteGMO(db, created.data!.id)
      expect(listGMOs(db).data).toHaveLength(0)
    })
  })
})
