import { dialog, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { ok, err } from '../types/ipc'
import { loggedHandle } from '../lib/logger'
import { parseGenBank } from '../services/genbank'

export function registerFileHandlers(): void {
  loggedHandle('files:parseGenbank', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select GenBank File',
      filters: [{ name: 'GenBank', extensions: ['gb', 'gbk', 'genbank'] }],
      properties: ['openFile']
    })

    if (result.canceled || !result.filePaths[0]) return ok(null)

    try {
      const content = await readFile(result.filePaths[0], 'utf-8')
      return ok(parseGenBank(content))
    } catch (e) {
      return err(String(e))
    }
  })

  // Called with raw string content (e.g. from drag-drop read in renderer)
  loggedHandle('files:parseGenbankContent', (_event, content: string) => {
    try {
      return ok(parseGenBank(content))
    } catch (e) {
      return err(String(e))
    }
  })
}
