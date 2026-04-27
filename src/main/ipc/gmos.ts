import { app, BrowserWindow, dialog } from 'electron'
import { writeFile } from 'fs/promises'
import { eq, desc } from 'drizzle-orm'
import { CreateGMOSchema, GenerateFormblattSchema, UpdateGMOSchema, ValidateFormblattSchema } from '@shared/ipc-schemas'
import { ok, err } from '../types/ipc'
import { gmos, settings } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import { generateFormblattWorkbook, validateFormblatt } from '../services/formblatt'
import type { DB } from '../db'

function formatToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function slugify(value: string | null | undefined): string {
  const normalized = value?.trim().replace(/\s+/g, '_').replace(/[^\w.-]/g, '') ?? ''
  return normalized || 'jlab'
}

function hasInvalidRange(dateFrom?: Date | null, dateTo?: Date | null): boolean {
  return Boolean(dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime())
}

export function registerGMOHandlers(db: DB): void {
  loggedHandle('gmos:list', (_event, plasmidId?: number) => {
    try {
      const rows = plasmidId !== undefined
        ? db.select().from(gmos).where(eq(gmos.plasmidId, plasmidId)).orderBy(desc(gmos.createdAt)).all()
        : db.select().from(gmos).orderBy(desc(gmos.createdAt)).all()
      return ok(rows)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('gmos:get', (_event, id: number) => {
    try {
      const row = db.select().from(gmos).where(eq(gmos.id, id)).get()
      if (!row) return err(`GMO ${id} not found`)
      return ok(row)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('gmos:create', (_event, payload: unknown) => {
    try {
      const parsed = CreateGMOSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      const result = db.insert(gmos).values({ ...parsed.data, createdAt: new Date() }).returning().get()
      return ok(result)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('gmos:update', (_event, id: number, payload: unknown) => {
    try {
      const parsed = UpdateGMOSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)
      db.update(gmos).set(parsed.data).where(eq(gmos.id, id)).run()
      const updated = db.select().from(gmos).where(eq(gmos.id, id)).get()
      return ok(updated)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('gmos:delete', (_event, id: number) => {
    try {
      db.delete(gmos).where(eq(gmos.id, id)).run()
      return ok(undefined)
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('gmos:validateFormblatt', (_event, payload: unknown) => {
    try {
      const parsed = ValidateFormblattSchema.safeParse(payload ?? {})
      if (!parsed.success) return err(parsed.error.message)
      if (hasInvalidRange(parsed.data.dateFrom, parsed.data.dateTo)) {
        return err('Reporting period start must not be after the end date.')
      }
      return ok(validateFormblatt(db, parsed.data))
    } catch (e) { return err(String(e)) }
  })

  loggedHandle('gmos:generateFormblatt', async (event, payload: unknown) => {
    try {
      const parsed = GenerateFormblattSchema.safeParse(payload ?? {})
      if (!parsed.success) return err(parsed.error.message)
      if (hasInvalidRange(parsed.data.dateFrom, parsed.data.dateTo)) {
        return err('Reporting period start must not be after the end date.')
      }

      const workbook = generateFormblattWorkbook(db, parsed.data.lang, parsed.data)
      let targetPath = parsed.data.filePath ?? null

      if (!targetPath) {
        const currentSettings = db.select().from(settings).get()
        const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow()
        const result = await dialog.showSaveDialog(win!, {
          title: 'Save Formblatt-Z',
          defaultPath: `${app.getPath('documents')}/Formblatt-Z_${slugify(currentSettings?.userName)}_${formatToday()}.xlsx`,
          filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
        })
        if (result.canceled || !result.filePath) return err('Save cancelled')
        targetPath = result.filePath
      }

      await writeFile(targetPath, workbook.buffer)
      return ok({ filePath: targetPath, rowCount: workbook.rowCount, language: parsed.data.lang })
    } catch (e) { return err(String(e)) }
  })
}
