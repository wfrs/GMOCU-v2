import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDB } from './test-helpers'
import {
  settings, organisms, features, plasmids,
  cassettes, cassetteParts, attachments, gmos
} from './schema'

describe('schema defaults', () => {
  let db: TestDB

  beforeEach(async () => { db = await createTestDb() })

  describe('settings', () => {
    it('applies all default values on insert', () => {
      // createTestDb already seeds id=1; read it back
      const row = db.select().from(settings).where(eq(settings.id, 1)).get()!
      expect(row.theme).toBe('light')
      expect(row.fontSize).toBe(14)
      expect(row.accentColor).toBe('teal')
      expect(row.userName).toBe('')
      expect(row.userInitials).toBe('')
      expect(row.institution).toBe('')
      expect(row.institutionAz).toBe('')
      expect(row.institutionAnlage).toBe('')
      expect(row.regionalLocale).toBeNull()
      expect(row.cloudProvider).toBeNull()
      expect(row.cloudPath).toBeNull()
    })

    it('timestamps are Date instances', () => {
      const row = db.select().from(settings).where(eq(settings.id, 1)).get()!
      expect(row.createdAt).toBeInstanceOf(Date)
      expect(row.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('organisms', () => {
    it('defaults riskGroup to 1', () => {
      const row = db.insert(organisms).values({ name: 'E. coli' }).returning().get()
      expect(row.riskGroup).toBe(1)
    })

    it('defaults synced to false', () => {
      const row = db.insert(organisms).values({ name: 'E. coli' }).returning().get()
      expect(row.synced).toBe(false)
    })

    it('createdAt is a Date instance', () => {
      const row = db.insert(organisms).values({ name: 'E. coli' }).returning().get()
      expect(row.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('features', () => {
    it('defaults riskLevel to 0', () => {
      const row = db.insert(features).values({ name: 'GFP', type: 'gene' }).returning().get()
      expect(row.riskLevel).toBe(0)
    })

    it('defaults synced to false', () => {
      const row = db.insert(features).values({ name: 'GFP', type: 'gene' }).returning().get()
      expect(row.synced).toBe(false)
    })
  })

  describe('plasmids', () => {
    it('defaults status to planned', () => {
      const row = db.insert(plasmids)
        .values({ name: 'pTest', createdAt: new Date(), updatedAt: new Date() })
        .returning().get()
      expect(row.status).toBe('planned')
    })

    it('defaults creatorName and creatorInitials to empty string', () => {
      const row = db.insert(plasmids)
        .values({ name: 'pTest', createdAt: new Date(), updatedAt: new Date() })
        .returning().get()
      expect(row.creatorName).toBe('')
      expect(row.creatorInitials).toBe('')
    })
  })

  describe('cassettes', () => {
    it('defaults order to 0', () => {
      const plasmid = db.insert(plasmids)
        .values({ name: 'pBase', createdAt: new Date(), updatedAt: new Date() })
        .returning().get()
      const row = db.insert(cassettes)
        .values({ plasmidId: plasmid.id, name: 'cassette-1', createdAt: new Date() })
        .returning().get()
      expect(row.order).toBe(0)
    })
  })
})

describe('schema constraints', () => {
  let db: TestDB

  beforeEach(async () => { db = await createTestDb() })

  describe('unique uid constraints', () => {
    it('rejects two organisms with the same uid', () => {
      db.insert(organisms).values({ name: 'Org A', uid: 'uid-001' }).run()
      expect(() =>
        db.insert(organisms).values({ name: 'Org B', uid: 'uid-001' }).run()
      ).toThrow()
    })

    it('allows multiple organisms with null uid', () => {
      db.insert(organisms).values({ name: 'Org A', uid: null }).run()
      expect(() =>
        db.insert(organisms).values({ name: 'Org B', uid: null }).run()
      ).not.toThrow()
    })

    it('rejects two features with the same uid', () => {
      db.insert(features).values({ name: 'Feat A', type: 'gene', uid: 'uid-001' }).run()
      expect(() =>
        db.insert(features).values({ name: 'Feat B', type: 'gene', uid: 'uid-001' }).run()
      ).toThrow()
    })
  })

  describe('cascade deletes', () => {
    it('deletes cassettes when parent plasmid is deleted', () => {
      const p = db.insert(plasmids)
        .values({ name: 'pCascade', createdAt: new Date(), updatedAt: new Date() })
        .returning().get()
      db.insert(cassettes)
        .values({ plasmidId: p.id, name: 'c1', createdAt: new Date() }).run()
      db.insert(cassettes)
        .values({ plasmidId: p.id, name: 'c2', createdAt: new Date() }).run()

      db.delete(plasmids).where(eq(plasmids.id, p.id)).run()

      const remaining = db.select().from(cassettes).where(eq(cassettes.plasmidId, p.id)).all()
      expect(remaining).toHaveLength(0)
    })

    it('deletes cassette_parts when parent cassette is deleted', () => {
      const p = db.insert(plasmids)
        .values({ name: 'pCascade2', createdAt: new Date(), updatedAt: new Date() })
        .returning().get()
      const c = db.insert(cassettes)
        .values({ plasmidId: p.id, name: 'c1', createdAt: new Date() })
        .returning().get()
      const feat = db.insert(features)
        .values({ name: 'GFP', type: 'gene' }).returning().get()
      db.insert(cassetteParts)
        .values({ cassetteId: c.id, featureId: feat.id }).run()

      db.delete(cassettes).where(eq(cassettes.id, c.id)).run()

      const remaining = db.select().from(cassetteParts)
        .where(eq(cassetteParts.cassetteId, c.id)).all()
      expect(remaining).toHaveLength(0)
    })

    it('deletes attachments when parent plasmid is deleted', () => {
      const p = db.insert(plasmids)
        .values({ name: 'pAttach', createdAt: new Date(), updatedAt: new Date() })
        .returning().get()
      db.insert(attachments).values({
        plasmidId: p.id,
        filename: 'map.pdf',
        mimeType: 'application/pdf',
        filePath: '/tmp/map.pdf',
        createdAt: new Date()
      }).run()

      db.delete(plasmids).where(eq(plasmids.id, p.id)).run()

      const remaining = db.select().from(attachments)
        .where(eq(attachments.plasmidId, p.id)).all()
      expect(remaining).toHaveLength(0)
    })

    it('cascade is transitive: deleting plasmid removes cassettes AND their parts', () => {
      const p = db.insert(plasmids)
        .values({ name: 'pDeep', createdAt: new Date(), updatedAt: new Date() })
        .returning().get()
      const c = db.insert(cassettes)
        .values({ plasmidId: p.id, name: 'c1', createdAt: new Date() })
        .returning().get()
      const feat = db.insert(features)
        .values({ name: 'p35S', type: 'promoter' }).returning().get()
      db.insert(cassetteParts)
        .values({ cassetteId: c.id, featureId: feat.id }).run()

      db.delete(plasmids).where(eq(plasmids.id, p.id)).run()

      expect(db.select().from(cassettes).all()).toHaveLength(0)
      expect(db.select().from(cassetteParts).all()).toHaveLength(0)
    })
  })

  describe('foreign key enforcement', () => {
    it('rejects a cassette referencing a non-existent plasmid', () => {
      expect(() =>
        db.insert(cassettes)
          .values({ plasmidId: 9999, name: 'orphan', createdAt: new Date() }).run()
      ).toThrow()
    })

    it('rejects a GMO referencing a non-existent organism', () => {
      expect(() =>
        db.insert(gmos).values({ hostOrganismId: 9999 }).run()
      ).toThrow()
    })
  })
})
