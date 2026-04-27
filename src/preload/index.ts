import { contextBridge, ipcRenderer } from 'electron'

const api = {
  platform: process.platform,
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data: unknown) => ipcRenderer.invoke('settings:update', data)
  },
  plasmids: {
    list: (filters?: unknown) => ipcRenderer.invoke('plasmids:list', filters),
    get: (id: number) => ipcRenderer.invoke('plasmids:get', id),
    create: (data: unknown) => ipcRenderer.invoke('plasmids:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('plasmids:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('plasmids:delete', id)
  },
  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    create: (data: unknown) => ipcRenderer.invoke('categories:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('categories:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id)
  },
  selectionValues: {
    list: () => ipcRenderer.invoke('selectionValues:list'),
    update: (id: number, data: unknown) => ipcRenderer.invoke('selectionValues:update', id, data)
  },
  importData: {
    legacyGmocu: (opts?: { backup?: boolean }) => ipcRenderer.invoke('import:legacyGmocu', opts)
  },
  files: {
    parseGenbank: () => ipcRenderer.invoke('files:parseGenbank'),
    parseGenbankContent: (content: string) => ipcRenderer.invoke('files:parseGenbankContent', content)
  },
  organisms: {
    list: (search?: string) => ipcRenderer.invoke('organisms:list', search),
    get: (id: number) => ipcRenderer.invoke('organisms:get', id),
    create: (data: unknown) => ipcRenderer.invoke('organisms:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('organisms:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('organisms:delete', id)
  },
  features: {
    list: (search?: string) => ipcRenderer.invoke('features:list', search),
    get: (id: number) => ipcRenderer.invoke('features:get', id),
    create: (data: unknown) => ipcRenderer.invoke('features:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('features:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('features:delete', id)
  },
  gmos: {
    list: (plasmidId?: number) => ipcRenderer.invoke('gmos:list', plasmidId),
    get: (id: number) => ipcRenderer.invoke('gmos:get', id),
    create: (data: unknown) => ipcRenderer.invoke('gmos:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('gmos:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('gmos:delete', id),
    validateFormblatt: (data?: unknown) => ipcRenderer.invoke('gmos:validateFormblatt', data),
    generateFormblatt: (data?: unknown) => ipcRenderer.invoke('gmos:generateFormblatt', data)
  },
  seeds: {
    list: (search?: string) => ipcRenderer.invoke('seeds:list', search),
    get: (id: number) => ipcRenderer.invoke('seeds:get', id),
    create: (data: unknown) => ipcRenderer.invoke('seeds:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('seeds:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('seeds:delete', id)
  },
  labels: {
    generate: (data: unknown) => ipcRenderer.invoke('labels:generate', data)
  },
  dev: {
    getLogs: () => ipcRenderer.invoke('dev:getLogs'),
    resetDb: () => ipcRenderer.invoke('dev:resetDb'),
    onLog: (cb: (entry: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, entry: unknown) => cb(entry)
      ipcRenderer.on('dev:log', handler)
      return () => ipcRenderer.off('dev:log', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (e) {
    console.error('contextBridge error:', e)
  }
} else {
  // @ts-expect-error — fallback for non-sandboxed environments
  window.api = api
}
