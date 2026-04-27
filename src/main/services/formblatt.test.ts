import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDB } from '../db/test-helpers'
import { features, gmos, organisms, plasmids, settings } from '../db/schema'
import { generateFormblattWorkbook, validateFormblatt } from './formblatt'

describe('Formblatt-Z reporting', () => {
  let db: TestDB

  beforeEach(async () => {
    db = await createTestDb()
  })

  it('reports missing settings and row fields during validation', () => {
    const donor = db.insert(organisms).values({ name: 'Arabidopsis thaliana', shortName: 'At', riskGroup: 1 }).returning().get()
    const host = db.insert(organisms).values({ name: 'Escherichia coli', shortName: 'Ec', riskGroup: 1 }).returning().get()

    db.insert(features).values({
      name: '35S',
      organismSource: donor.shortName,
      riskLevel: 0,
      type: 'promoter'
    }).run()

    const plasmid = db.insert(plasmids).values({
      name: 'pTest',
      cassette: '35S-GFP',
      backboneVector: null,
      status: 'planned',
      creatorName: '',
      creatorInitials: ''
    }).returning().get()

    const createdDate = new Date('2026-03-15T00:00:00.000Z')
    db.insert(gmos).values({
      plasmidId: plasmid.id,
      hostOrganismId: host.id,
      approval: null,
      createdDate
    }).run()

    const result = validateFormblatt(db, {
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-12-31T00:00:00.000Z')
    })

    expect(result.fileIssues).toEqual([
      'Settings: Institution is required.',
      'Settings: Az. is required.',
      'Settings: Anlage-Nr. is required.'
    ])
    expect(result.includedCount).toBe(1)
    expect(result.invalidCount).toBe(1)
    expect(result.rows[0]?.messages).toEqual(
      expect.arrayContaining([
        'Approval reference is missing.',
        'Backbone vector is missing.',
        'Cassette feature "GFP" was not found in the features glossary.'
      ])
    )
  })

  it('builds a workbook buffer for a valid report row', () => {
    db.update(settings).set({
      institution: 'Jores Lab',
      institutionAz: 'AZ-42',
      institutionAnlage: 'A-7'
    }).where(eq(settings.id, 1)).run()

    const donor = db.insert(organisms).values({ name: 'Arabidopsis thaliana', shortName: 'At', riskGroup: 1 }).returning().get()
    const host = db.insert(organisms).values({ name: 'Escherichia coli', shortName: 'Ec', riskGroup: 1 }).returning().get()

    db.insert(features).values([
      { name: '35S', organismSource: donor.shortName, riskLevel: 0, type: 'promoter' },
      { name: 'GFP', organismSource: donor.shortName, riskLevel: 1, type: 'gene' }
    ]).run()

    const plasmid = db.insert(plasmids).values({
      name: 'pGreen',
      cassette: '35S-GFP',
      backboneVector: 'pEarleyGate101',
      status: 'planned',
      creatorName: '',
      creatorInitials: ''
    }).returning().get()

    db.insert(gmos).values({
      plasmidId: plasmid.id,
      hostOrganismId: host.id,
      approval: 'BVL-2026-001',
      createdDate: new Date('2026-02-11T00:00:00.000Z')
    }).run()

    const result = generateFormblattWorkbook(db, 'de', {
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-12-31T00:00:00.000Z')
    })

    expect(result.rowCount).toBe(1)
    expect(result.buffer.subarray(0, 2).toString()).toBe('PK')
    expect(result.buffer.includes(Buffer.from('Spender Bezeichnung'))).toBe(true)
    expect(result.buffer.includes(Buffer.from('Ec-pGreen'))).toBe(true)
    expect(result.buffer.includes(Buffer.from('BVL-2026-001'))).toBe(true)
  })

  it('includes an active GMO when the selected range spans its created date', () => {
    db.update(settings).set({
      institution: 'Jores Lab',
      institutionAz: 'AZ-42',
      institutionAnlage: 'A-7'
    }).where(eq(settings.id, 1)).run()

    const donor = db.insert(organisms).values({ name: 'Arabidopsis thaliana', shortName: 'At', riskGroup: 1 }).returning().get()
    const host = db.insert(organisms).values({ name: 'Escherichia coli', shortName: 'Ec', riskGroup: 1 }).returning().get()

    db.insert(features).values({ name: 'GFP', organismSource: donor.shortName, riskLevel: 1, type: 'gene' }).run()

    const plasmid = db.insert(plasmids).values({
      name: 'pSpan',
      cassette: 'GFP',
      backboneVector: 'pBackbone',
      status: 'planned',
      creatorName: '',
      creatorInitials: ''
    }).returning().get()

    db.insert(gmos).values({
      plasmidId: plasmid.id,
      hostOrganismId: host.id,
      approval: 'BVL-2026-002',
      createdDate: new Date('2026-02-11T00:00:00.000Z'),
      destroyedDate: null
    }).run()

    const result = validateFormblatt(db, {
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-04-04T00:00:00.000Z')
    })

    expect(result.includedCount).toBe(1)
    expect(result.invalidCount).toBe(0)
    expect(result.rows[0]?.included).toBe(true)
  })
})
