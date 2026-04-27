import { ipcMain } from 'electron'
import { registerSettingsHandlers } from './settings'
import { registerPlasmidHandlers } from './plasmids'
import { registerImportHandlers } from './import'
import { registerFileHandlers } from './files'
import { registerOrganismHandlers } from './organisms'
import { registerFeatureHandlers } from './features'
import { registerGMOHandlers } from './gmos'
import { registerSeedHandlers } from './seeds'
import { registerLabelHandlers } from './labels'
import { registerCategoryHandlers } from './categories'
import { registerSelectionValueHandlers } from './selectionValues'
import { getLogBuffer, log } from '../lib/logger'
import { backupDb } from '../db'
import {
  plasmids, cassettes, cassetteParts, attachments,
  organisms, features, gmos, seeds, settings, categories, selectionValues
} from '../db/schema'
import { eq } from 'drizzle-orm'
import { ok, err } from '../types/ipc'
import type { DB } from '../db'

export function registerIpcHandlers(db: DB): void {
  registerSettingsHandlers(db)
  registerPlasmidHandlers(db)
  registerImportHandlers(db)
  registerFileHandlers()
  registerOrganismHandlers(db)
  registerFeatureHandlers(db)
  registerGMOHandlers(db)
  registerSeedHandlers(db)
  registerCategoryHandlers(db)
  registerSelectionValueHandlers(db)
  registerLabelHandlers(db)

  if (process.env.NODE_ENV === 'development') {
    ipcMain.handle('dev:getLogs', () => getLogBuffer())

    ipcMain.handle('dev:resetDb', async () => {
      try {
        const backupPath = await backupDb()
        log.info(`dev:resetDb — backup at ${backupPath}`)
        db.transaction((tx) => {
          tx.delete(cassetteParts).run()
          tx.delete(cassettes).run()
          tx.delete(attachments).run()
          tx.delete(gmos).run()
          tx.delete(plasmids).run()
          tx.delete(categories).run()
          tx.delete(organisms).run()
          tx.delete(features).run()
          tx.delete(seeds).run()
          tx.update(settings).set({
            userName: '', userInitials: '', institution: '',
            institutionAz: '', institutionAnlage: '',
            theme: 'light', regionalLocale: null, fontSize: 14, accentColor: 'teal',
            aliasFormat: null, autoCreateGmoEnabled: false,
            autoCreateGmoOrganism: null, autoCreateGmoStrain: null,
            statusColours: null, favouriteOrganisms: null, targetOrganisms: null,
            cloudProvider: null, cloudPath: null, labelTemplateJson: null,
            updatedAt: new Date()
          }).where(eq(settings.id, 1)).run()
          // Re-seed selection values
          tx.delete(selectionValues).run()
        })
        log.info('dev:resetDb — done')
        return ok(backupPath)
      } catch (e) {
        return err(String(e))
      }
    })
  }
}
