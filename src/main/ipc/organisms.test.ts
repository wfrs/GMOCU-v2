import { describe, it, expect, beforeEach } from 'vitest'
import { eq, like } from 'drizzle-orm'
import { createTestDb, type TestDB } from '../db/test-helpers'
import { organisms } from '../db/schema'
import { ok, err } from '../types/ipc'
import { CreateOrganismSchema, UpdateOrganismSchema } from '@shared/ipc-schemas'

function listOrganisms(db: TestDB, search?: string) {
  try {
    const rows = search
      ? db.select().from(organisms).where(like(organisms.name, `%${search}%`)).all()
      : db.select().from(organisms).all()
    return ok(rows)
  } catch (e) { return err(String(e)) }
}

function createOrganism(db: TestDB, payload: unknown) {
  try {
    const parsed = CreateOrganismSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    return ok(db.insert(organisms).values(parsed.data).returning().get())
  } catch (e) { return err(String(e)) }
}

function updateOrganism(db: TestDB, id: number, payload: unknown) {
  try {
    const parsed = UpdateOrganismSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    db.update(organisms).set(parsed.data).where(eq(organisms.id, id)).run()
    return ok(db.select().from(organisms).where(eq(organisms.id, id)).get())
  } catch (e) { return err(String(e)) }
}

function deleteOrganism(db: TestDB, id: number) {
  try {
    db.delete(organisms).where(eq(organisms.id, id)).run()
    return ok(undefined)
  } catch (e) { return err(String(e)) }
}

describe('organism handlers', () => {
  let db: TestDB

  beforeEach(async () => { db = await createTestDb() })

  describe('create', () => {
    it('creates organism with required fields', () => {
      const resp = createOrganism(db, { name: 'Escherichia coli', riskGroup: 1 })
      expect(resp.success).toBe(true)
      expect(resp.data!.name).toBe('Escherichia coli')
      expect(resp.data!.riskGroup).toBe(1)
    })

    it('defaults riskGroup to 1', () => {
      const resp = createOrganism(db, { name: 'E. coli' })
      expect(resp.data!.riskGroup).toBe(1)
    })

    it('stores shortName and roleGroup', () => {
      const resp = createOrganism(db, { name: 'Escherichia coli', shortName: 'EsCo', roleGroup: 'host' })
      expect(resp.data!.shortName).toBe('EsCo')
      expect(resp.data!.roleGroup).toBe('host')
    })

    it('rejects empty name', () => {
      expect(createOrganism(db, { name: '' }).success).toBe(false)
    })

    it('rejects riskGroup 5', () => {
      expect(createOrganism(db, { name: 'X', riskGroup: 5 }).success).toBe(false)
    })
  })

  describe('list', () => {
    beforeEach(() => {
      createOrganism(db, { name: 'Escherichia coli', shortName: 'EsCo' })
      createOrganism(db, { name: 'Agrobacterium tumefaciens', shortName: 'AgTu' })
      createOrganism(db, { name: 'Nicotiana benthamiana', shortName: 'NiBe' })
    })

    it('lists all organisms', () => {
      expect(listOrganisms(db).data).toHaveLength(3)
    })

    it('filters by partial name', () => {
      const resp = listOrganisms(db, 'coli')
      expect(resp.data).toHaveLength(1)
      expect(resp.data![0].name).toBe('Escherichia coli')
    })

    it('returns empty array for no match', () => {
      expect(listOrganisms(db, 'XXXXXX').data).toHaveLength(0)
    })
  })

  describe('update', () => {
    it('updates organism fields', () => {
      const created = createOrganism(db, { name: 'E. coli' })
      const id = created.data!.id
      updateOrganism(db, id, { riskGroup: 2, roleGroup: 'donor' })
      const after = db.select().from(organisms).where(eq(organisms.id, id)).get()
      expect(after!.riskGroup).toBe(2)
      expect(after!.roleGroup).toBe('donor')
    })

    it('partial update leaves name unchanged', () => {
      const created = createOrganism(db, { name: 'E. coli K-12' })
      updateOrganism(db, created.data!.id, { riskGroup: 1 })
      const after = db.select().from(organisms).where(eq(organisms.id, created.data!.id)).get()
      expect(after!.name).toBe('E. coli K-12')
    })
  })

  describe('delete', () => {
    it('removes organism from DB', () => {
      const created = createOrganism(db, { name: 'ToDelete' })
      deleteOrganism(db, created.data!.id)
      expect(listOrganisms(db).data).toHaveLength(0)
    })
  })
})
