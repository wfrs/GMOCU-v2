import { describe, it, expect, beforeEach } from 'vitest'
import { eq, like } from 'drizzle-orm'
import { createTestDb, type TestDB } from '../db/test-helpers'
import { features } from '../db/schema'
import { ok, err } from '../types/ipc'
import { CreateFeatureSchema, UpdateFeatureSchema } from '@shared/ipc-schemas'

function listFeatures(db: TestDB, search?: string) {
  try {
    const rows = search
      ? db.select().from(features).where(like(features.name, `%${search}%`)).all()
      : db.select().from(features).all()
    return ok(rows)
  } catch (e) { return err(String(e)) }
}

function createFeature(db: TestDB, payload: unknown) {
  try {
    const parsed = CreateFeatureSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    return ok(db.insert(features).values(parsed.data).returning().get())
  } catch (e) { return err(String(e)) }
}

function updateFeature(db: TestDB, id: number, payload: unknown) {
  try {
    const parsed = UpdateFeatureSchema.safeParse(payload)
    if (!parsed.success) return err(parsed.error.message)
    db.update(features).set(parsed.data).where(eq(features.id, id)).run()
    return ok(db.select().from(features).where(eq(features.id, id)).get())
  } catch (e) { return err(String(e)) }
}

function deleteFeature(db: TestDB, id: number) {
  try {
    db.delete(features).where(eq(features.id, id)).run()
    return ok(undefined)
  } catch (e) { return err(String(e)) }
}

describe('feature handlers', () => {
  let db: TestDB

  beforeEach(async () => { db = await createTestDb() })

  describe('create', () => {
    it('creates feature with required fields', () => {
      const resp = createFeature(db, { name: '35S promoter', type: 'promoter' })
      expect(resp.success).toBe(true)
      expect(resp.data!.name).toBe('35S promoter')
      expect(resp.data!.type).toBe('promoter')
    })

    it('defaults type to "other"', () => {
      const resp = createFeature(db, { name: 'gfp' })
      expect(resp.data!.type).toBe('other')
    })

    it('defaults riskLevel to 0', () => {
      const resp = createFeature(db, { name: 'gfp' })
      expect(resp.data!.riskLevel).toBe(0)
    })

    it('stores alias and organismSource', () => {
      const resp = createFeature(db, {
        name: '35S promoter',
        alias: 'p35S',
        type: 'promoter',
        organismSource: 'Cauliflower mosaic virus'
      })
      expect(resp.data!.alias).toBe('p35S')
      expect(resp.data!.organismSource).toBe('Cauliflower mosaic virus')
    })

    it('rejects empty name', () => {
      expect(createFeature(db, { name: '' }).success).toBe(false)
    })

    it('rejects invalid type', () => {
      expect(createFeature(db, { name: 'x', type: 'enhancer' }).success).toBe(false)
    })

    it('accepts all valid type values', () => {
      const types = ['promoter', 'gene', 'terminator', 'rbs', 'marker', 'origin', 'other']
      for (const type of types) {
        expect(createFeature(db, { name: `feat_${type}`, type }).success).toBe(true)
      }
    })
  })

  describe('list', () => {
    beforeEach(() => {
      createFeature(db, { name: '35S promoter', type: 'promoter' })
      createFeature(db, { name: 'GFP', type: 'gene' })
      createFeature(db, { name: 'NOS terminator', type: 'terminator' })
    })

    it('lists all features', () => {
      expect(listFeatures(db).data).toHaveLength(3)
    })

    it('filters by name', () => {
      const resp = listFeatures(db, 'GFP')
      expect(resp.data).toHaveLength(1)
      expect(resp.data![0].name).toBe('GFP')
    })

    it('partial name search works', () => {
      expect(listFeatures(db, 'term').data).toHaveLength(1)
    })

    it('returns empty array for no match', () => {
      expect(listFeatures(db, 'ZZZZ').data).toHaveLength(0)
    })
  })

  describe('update', () => {
    it('updates feature type', () => {
      const created = createFeature(db, { name: 'MySeq', type: 'other' })
      updateFeature(db, created.data!.id, { type: 'gene' })
      const after = db.select().from(features).where(eq(features.id, created.data!.id)).get()
      expect(after!.type).toBe('gene')
    })

    it('partial update preserves other fields', () => {
      const created = createFeature(db, { name: 'Stable', type: 'gene', riskLevel: 2 })
      updateFeature(db, created.data!.id, { alias: 'st' })
      const after = db.select().from(features).where(eq(features.id, created.data!.id)).get()
      expect(after!.name).toBe('Stable')
      expect(after!.riskLevel).toBe(2)
      expect(after!.alias).toBe('st')
    })
  })

  describe('delete', () => {
    it('removes feature from DB', () => {
      const created = createFeature(db, { name: 'ToDelete' })
      deleteFeature(db, created.data!.id)
      expect(listFeatures(db).data).toHaveLength(0)
    })
  })
})
