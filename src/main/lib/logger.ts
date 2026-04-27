import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent, BrowserWindow } from 'electron'
import type { LogEntry, LogLevel } from '@shared/types'

export type { LogEntry, LogLevel }

const isDev = process.env.NODE_ENV === 'development'

// ─── ANSI palette ─────────────────────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  dim:     '\x1b[2m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',
  gray:    '\x1b[90m',
}

function ansiTs(): string {
  return `${C.gray}${new Date().toISOString().slice(11, 23)}${C.reset}`
}

function badge(label: string, color: string): string {
  return `${color}${C.bold}[${label}]${C.reset}`
}

export function truncate(val: unknown, max = 140): string {
  try {
    const s = JSON.stringify(val, (_key, v) => {
      if (v instanceof Buffer || v instanceof Uint8Array) return `<Buffer ${v.byteLength}b>`
      if (typeof v === 'string' && v.length > 200) return v.slice(0, 200) + '…'
      return v
    })
    if (!s) return 'undefined'
    return s.length <= max ? s : s.slice(0, max) + '…'
  } catch {
    return String(val)
  }
}

// ─── Buffer ────────────────────────────────────────────────────────────────────

let _seq = 0
const MAX_BUFFER = 500
const _buffer: LogEntry[] = []
let _win: BrowserWindow | null = null

function nowTs(): string {
  return new Date().toISOString().slice(11, 23)
}

function push(entry: LogEntry): void {
  _buffer.push(entry)
  if (_buffer.length > MAX_BUFFER) _buffer.shift()
  if (_win && !_win.isDestroyed()) {
    _win.webContents.send('dev:log', entry)
  }
}

/** Call once the main window is ready. Flushes the buffer and enables live push. */
export function attachDevWindow(win: BrowserWindow): void {
  _win = win
  for (const entry of _buffer) {
    win.webContents.send('dev:log', entry)
  }
}

/** Returns a snapshot of the current buffer. */
export function getLogBuffer(): LogEntry[] {
  return [..._buffer]
}

// ─── Public logger ─────────────────────────────────────────────────────────────

export const log = {
  info(...args: unknown[]): void {
    if (!isDev) return
    const message = args.map(String).join(' ')
    console.log(ansiTs(), badge('INFO', C.cyan), ...args)
    push({ id: ++_seq, ts: nowTs(), level: 'info', message })
  },

  warn(...args: unknown[]): void {
    if (!isDev) return
    const message = args.map(String).join(' ')
    console.warn(ansiTs(), badge('WARN', C.yellow), ...args)
    push({ id: ++_seq, ts: nowTs(), level: 'warn', message })
  },

  error(...args: unknown[]): void {
    if (!isDev) return
    const message = args.map(String).join(' ')
    console.error(ansiTs(), badge('ERR ', C.red), ...args)
    push({ id: ++_seq, ts: nowTs(), level: 'error', message })
  },

  // Forward renderer console messages (level: 0=log 1=info 2=warn 3=error)
  renderer(level: number, message: string, source: string, line: number): void {
    if (!isDev) return
    const lvl = Math.min(level, 3) as 0 | 1 | 2 | 3
    const colors:  [string, string, string, string] = [C.gray,  C.cyan,  C.yellow, C.red]
    const labels:  [string, string, string, string] = ['log ', 'info', 'warn', 'err ']
    const src = source.replace(/\?.*$/, '').split('/').slice(-2).join('/')
    console.log(
      ansiTs(), badge('RNDR', colors[lvl]),
      `${colors[lvl]}${labels[lvl]}${C.reset}`,
      `${C.gray}${src}:${line}${C.reset}`,
      message
    )
    // Only push warn/error renderer messages to the in-app log (suppress noisy logs)
    if (lvl >= 2) {
      push({ id: ++_seq, ts: nowTs(), level: 'renderer', message, detail: `${src}:${line}` })
    }
  },
}

// ─── IPC logging wrapper ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpcHandler = (event: IpcMainInvokeEvent, ...args: any[]) => unknown

/**
 * Drop-in replacement for `ipcMain.handle` that logs every invocation
 * with timing, args, and success/error in development.
 */
export function loggedHandle(channel: string, handler: IpcHandler): void {
  if (!isDev) {
    ipcMain.handle(channel, handler)
    return
  }

  ipcMain.handle(channel, async (event, ...args) => {
    const detail = args.length ? truncate(args) : undefined
    console.log(ansiTs(), badge('IPC ', C.blue), `${C.cyan}→${C.reset} ${channel}`, detail ? `${C.dim}${detail}${C.reset}` : '')
    push({ id: ++_seq, ts: nowTs(), level: 'ipc-in', message: channel, detail })

    const t0 = Date.now()
    let result: unknown

    try {
      result = await handler(event, ...args)
    } catch (e) {
      const duration = Date.now() - t0
      console.error(ansiTs(), badge('IPC ', C.red), `${C.red}✗ THREW${C.reset} ${channel}`, e, `${C.gray}(${duration}ms)${C.reset}`)
      push({ id: ++_seq, ts: nowTs(), level: 'ipc-err', message: channel, detail: String(e), duration })
      throw e
    }

    const duration = Date.now() - t0
    const res = result as { success?: boolean; error?: string } | undefined

    if (res?.success === false) {
      console.error(ansiTs(), badge('IPC ', C.red), `${C.red}✗${C.reset} ${channel}`, `${C.red}${res.error}${C.reset}`, `${C.gray}(${duration}ms)${C.reset}`)
      push({ id: ++_seq, ts: nowTs(), level: 'ipc-err', message: channel, detail: res.error, duration })
    } else {
      console.log(ansiTs(), badge('IPC ', C.blue), `${C.green}✓${C.reset} ${channel}`, `${C.gray}(${duration}ms)${C.reset}`)
      push({ id: ++_seq, ts: nowTs(), level: 'ipc-ok', message: channel, duration })
    }

    return result
  })
}
