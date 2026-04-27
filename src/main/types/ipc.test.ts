import { describe, it, expect } from 'vitest'
import { ok, err } from './ipc'

describe('ok', () => {
  it('sets success true and passes data through', () => {
    const r = ok({ id: 1, name: 'test' })
    expect(r.success).toBe(true)
    expect(r.data).toEqual({ id: 1, name: 'test' })
  })

  it('works with primitive values', () => {
    expect(ok(42).data).toBe(42)
    expect(ok('hello').data).toBe('hello')
    expect(ok(true).data).toBe(true)
  })

  it('works with undefined (void result)', () => {
    const r = ok(undefined)
    expect(r.success).toBe(true)
    expect(r.data).toBeUndefined()
  })

  it('has no error field', () => {
    expect(ok('x').error).toBeUndefined()
  })
})

describe('err', () => {
  it('sets success false and passes the error message', () => {
    const r = err('something went wrong')
    expect(r.success).toBe(false)
    expect(r.error).toBe('something went wrong')
  })

  it('has no data field', () => {
    expect(err('x').data).toBeUndefined()
  })

  it('preserves the exact error string', () => {
    const msg = 'Error: SQLITE_CONSTRAINT: UNIQUE constraint failed'
    expect(err(msg).error).toBe(msg)
  })
})
