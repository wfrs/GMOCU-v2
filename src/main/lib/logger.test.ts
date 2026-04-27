import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock electron before any import so logger.ts doesn't fail on require('electron')
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }))

// Import truncate directly — it's a pure function with no isDev guard
import { truncate } from './logger'

describe('truncate', () => {
  it('serializes simple objects to JSON', () => {
    expect(truncate({ a: 1 })).toBe('{"a":1}')
  })

  it('returns "undefined" for undefined input', () => {
    expect(truncate(undefined)).toBe('undefined')
  })

  it('returns "null" for null input', () => {
    expect(truncate(null)).toBe('null')
  })

  it('truncates output at max length (default 140)', () => {
    const long = 'x'.repeat(200)
    const result = truncate(long)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBe(141) // 140 + ellipsis
  })

  it('does not truncate output shorter than max', () => {
    const result = truncate({ id: 1 })
    expect(result).toBe('{"id":1}')
  })

  it('replaces Uint8Array values with a summary tag', () => {
    // Uint8Array has no toJSON(), so the replacer sees it directly
    const arr = new Uint8Array(32)
    const result = truncate(arr)
    expect(result).toContain('<Buffer 32b>')
  })

  it('Buffer serializes via its toJSON() (replacer never sees the Buffer instance)', () => {
    // Buffer.toJSON() fires before the replacer, so truncate renders it as a JSON object
    // This test documents the actual behavior rather than an ideal
    const buf = Buffer.alloc(3)
    const result = truncate(buf)
    expect(result).toContain('"type":"Buffer"')
  })

  it('truncates individual string fields longer than 200 chars', () => {
    const longStr = 'a'.repeat(250)
    const result = truncate({ s: longStr })
    expect(result).toContain('…')
    expect(result).not.toContain('a'.repeat(250))
  })

  it('falls back to String(val) for non-serializable input', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    const result = truncate(circular)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('respects a custom max parameter', () => {
    const result = truncate('hello world', 5)
    expect(result).toBe('"hell…')
  })
})

describe('log buffer', () => {
  // Each test gets a fresh module instance so the buffer and _seq are reset
  beforeEach(() => { vi.resetModules() })

  async function freshLogger() {
    vi.stubEnv('NODE_ENV', 'development')
    return import('./logger')
  }

  it('getLogBuffer returns an empty array on a fresh module', async () => {
    const { getLogBuffer } = await freshLogger()
    expect(getLogBuffer()).toEqual([])
  })

  it('log.info pushes an entry to the buffer', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.info('hello')
    const buf = getLogBuffer()
    expect(buf).toHaveLength(1)
    expect(buf[0].level).toBe('info')
    expect(buf[0].message).toBe('hello')
  })

  it('log.warn pushes a warn entry', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.warn('careful')
    expect(getLogBuffer()[0].level).toBe('warn')
  })

  it('log.error pushes an error entry', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.error('boom')
    expect(getLogBuffer()[0].level).toBe('error')
  })

  it('multiple args are joined into a single message', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.info('a', 'b', 'c')
    expect(getLogBuffer()[0].message).toBe('a b c')
  })

  it('assigns incrementing id values', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.info('first')
    log.info('second')
    const [a, b] = getLogBuffer()
    expect(b.id).toBe(a.id + 1)
  })

  it('getLogBuffer returns a copy, not the live array', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.info('x')
    const snap = getLogBuffer()
    log.info('y')
    expect(snap).toHaveLength(1) // original snapshot unaffected
    expect(getLogBuffer()).toHaveLength(2)
  })

  it('caps buffer at 500 entries (oldest dropped)', async () => {
    const { log, getLogBuffer } = await freshLogger()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    for (let i = 0; i < 505; i++) log.info(`msg-${i}`)
    spy.mockRestore()
    const buf = getLogBuffer()
    expect(buf).toHaveLength(500)
    expect(buf[0].message).toBe('msg-5')   // first 5 dropped
    expect(buf[499].message).toBe('msg-504')
  })

  it('does not push to buffer when NODE_ENV is not development', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const { log, getLogBuffer } = await import('./logger')
    log.info('should not appear')
    expect(getLogBuffer()).toHaveLength(0)
  })
})

describe('log.renderer', () => {
  beforeEach(() => { vi.resetModules() })

  async function freshLogger() {
    vi.stubEnv('NODE_ENV', 'development')
    return import('./logger')
  }

  it('does not push level 0 (log) to buffer', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.renderer(0, 'debug msg', 'http://localhost/src/App.tsx?t=123', 10)
    expect(getLogBuffer()).toHaveLength(0)
  })

  it('does not push level 1 (info) to buffer', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.renderer(1, 'info msg', 'src/App.tsx', 10)
    expect(getLogBuffer()).toHaveLength(0)
  })

  it('pushes level 2 (warn) to buffer as renderer level', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.renderer(2, 'a warning', 'src/pages/Plasmids.tsx', 42)
    const buf = getLogBuffer()
    expect(buf).toHaveLength(1)
    expect(buf[0].level).toBe('renderer')
    expect(buf[0].message).toBe('a warning')
  })

  it('pushes level 3 (error) to buffer', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.renderer(3, 'an error', 'src/main/ipc/plasmids.ts', 99)
    expect(getLogBuffer()[0].level).toBe('renderer')
  })

  it('strips query strings and takes last 2 path segments for detail', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.renderer(2, 'warn', 'http://localhost:5173/src/pages/Settings.tsx?t=1234567', 10)
    expect(getLogBuffer()[0].detail).toBe('pages/Settings.tsx:10')
  })

  it('clamps out-of-range level values', async () => {
    const { log, getLogBuffer } = await freshLogger()
    log.renderer(99, 'high level', 'src/App.tsx', 1) // clamped to 3
    // Level 3 (error) — should be pushed
    expect(getLogBuffer()).toHaveLength(1)
  })
})
