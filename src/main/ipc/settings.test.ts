import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDB } from '../db/test-helpers'
import { settings } from '../db/schema'
import { ok, err } from '../types/ipc'

// Call the handler logic directly rather than going through ipcMain
function getSettings(db: TestDB) {
  try {
    const row = db.select().from(settings).where(eq(settings.id, 1)).get()
    return ok(row)
  } catch (e) { return err(String(e)) }
}


describe('settings handlers', () => {
  let db: TestDB

  beforeEach(async () => { db = await createTestDb() })

  describe('get', () => {
    it('returns the settings row with defaults', () => {
      const resp = getSettings(db)
      expect(resp.success).toBe(true)
      expect(resp.data).toBeDefined()
      expect(resp.data!.id).toBe(1)
      expect(resp.data!.theme).toBe('light')
      expect(resp.data!.fontSize).toBe(14)
      expect(resp.data!.accentColor).toBe('teal')
      expect(resp.data!.userName).toBe('')
    })
  })

  describe('update', () => {
    it('persists updated fields', () => {
      db.update(settings).set({ userName: 'Julia Jores', userInitials: 'JJ' }).where(eq(settings.id, 1)).run()
      const resp = getSettings(db)
      expect(resp.data!.userName).toBe('Julia Jores')
      expect(resp.data!.userInitials).toBe('JJ')
    })

    it('persists theme change', () => {
      db.update(settings).set({ theme: 'dark' }).where(eq(settings.id, 1)).run()
      expect(getSettings(db).data!.theme).toBe('dark')
    })

    it('persists regional locale setting', () => {
      db.update(settings).set({ regionalLocale: 'de-DE' }).where(eq(settings.id, 1)).run()
      expect(getSettings(db).data!.regionalLocale).toBe('de-DE')
    })

    it('persists compliance fields', () => {
      db.update(settings).set({ institutionAz: 'AZ-2024-001', institutionAnlage: '3' }).where(eq(settings.id, 1)).run()
      const row = getSettings(db).data!
      expect(row.institutionAz).toBe('AZ-2024-001')
      expect(row.institutionAnlage).toBe('3')
    })

    it('persists cloud provider and path', () => {
      db.update(settings).set({ cloudProvider: 'sciebo', cloudPath: '/Users/julia/Sciebo' }).where(eq(settings.id, 1)).run()
      const row = getSettings(db).data!
      expect(row.cloudProvider).toBe('sciebo')
      expect(row.cloudPath).toBe('/Users/julia/Sciebo')
    })
  })
})
