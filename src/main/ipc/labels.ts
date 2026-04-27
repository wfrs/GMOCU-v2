import { app, BrowserWindow, dialog } from 'electron'
import { writeFile } from 'fs/promises'
import { inArray } from 'drizzle-orm'
import { GenerateLabelsSchema } from '@shared/ipc-schemas'
import { ok, err } from '../types/ipc'
import { plasmids } from '../db/schema'
import { loggedHandle } from '../lib/logger'
import { generateLabelsPdf } from '../services/labels'
import type { DB } from '../db'

function formatToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function registerLabelHandlers(db: DB): void {
  loggedHandle('labels:generate', async (event, payload: unknown) => {
    try {
      const parsed = GenerateLabelsSchema.safeParse(payload)
      if (!parsed.success) return err(parsed.error.message)

      const { plasmidIds, filePath: providedPath } = parsed.data

      const rows = db
        .select()
        .from(plasmids)
        .where(inArray(plasmids.id, plasmidIds))
        .all()

      // Preserve the caller's order
      const idOrder = new Map(plasmidIds.map((id, i) => [id, i]))
      rows.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

      if (rows.length === 0) return err('No plasmids found for the given IDs.')

      const pdfBuffer = await generateLabelsPdf(rows)

      let targetPath = providedPath ?? null
      if (!targetPath) {
        const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow()
        const result = await dialog.showSaveDialog(win!, {
          title: 'Save Labels PDF',
          defaultPath: `${app.getPath('documents')}/labels_${formatToday()}.pdf`,
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
        })
        if (result.canceled || !result.filePath) return err('Save cancelled')
        targetPath = result.filePath
      }

      await writeFile(targetPath, pdfBuffer)
      return ok({ filePath: targetPath, count: rows.length })
    } catch (e) {
      return err(String(e))
    }
  })
}
