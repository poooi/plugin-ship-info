import { afterEach, describe, expect, it } from 'vitest'

import {
  captureConsole,
  validateConsole,
  type ConsoleCallRecord,
} from './browser-console'

const call = (
  over: Partial<ConsoleCallRecord> = {},
): ConsoleCallRecord => ({
  argCount: 1,
  detail: 'detail',
  message: 'message',
  method: 'error',
  ...over,
})

const originalError = console.error
const originalWarn = console.warn

afterEach(() => {
  console.error = originalError
  console.warn = originalWarn
})

describe('browser console capture', () => {
  it('captures full details and restores the original methods', () => {
    const captured = captureConsole()
    try {
      console.error(new Error('boom'))
      console.warn('careful')
    } finally {
      captured.restore()
    }

    expect(console.error).toBe(originalError)
    expect(console.warn).toBe(originalWarn)
    expect(captured.calls).toHaveLength(2)
    expect(captured.calls[0]).toMatchObject({
      argCount: 1,
      message: 'Error: boom',
      method: 'error',
    })
    // The full stack stays available for diagnostics.
    expect(captured.calls[0].detail).toContain('Error: boom')
    expect(captured.calls[0].detail.split('\n').length).toBeGreaterThan(1)
    expect(captured.calls[1]).toMatchObject({
      argCount: 1,
      message: 'careful',
      method: 'warn',
    })
  })

  it('restores the originals when validation fails', () => {
    const captured = captureConsole()
    try {
      console.error('unexpected')
      expect(() => validateConsole(captured.calls, [])).toThrow(
        /unexpected console output/,
      )
    } finally {
      captured.restore()
    }
    expect(console.error).toBe(originalError)
    expect(console.warn).toBe(originalWarn)
  })
})

describe('validateConsole', () => {
  it('accepts a declared call with the exact count and arg count', () => {
    const calls = [
      call({ message: 'Error: EACCES: permission denied' }),
      call({ method: 'warn', message: 'careful' }),
    ]
    expect(() =>
      validateConsole(calls, [
        { method: 'error', message: 'Error: EACCES: permission denied', count: 1 },
        { method: 'warn', message: 'careful', count: 1 },
      ]),
    ).not.toThrow()
  })

  it('rejects unexpected warn/error output', () => {
    expect(() =>
      validateConsole([call({ detail: 'noisy', method: 'warn', message: 'noisy' })]),
    ).toThrow(/unexpected console output[\s\S]*warn[\s\S]*noisy/)
  })

  it('rejects a declared call that never occurred', () => {
    expect(() =>
      validateConsole([], [
        { method: 'error', message: 'Error: EACCES: permission denied' },
      ]),
    ).toThrow(/saw 0/)
  })

  it('rejects a wrong call count', () => {
    const calls = [call({ message: 'dup' }), call({ message: 'dup' })]
    expect(() =>
      validateConsole(calls, [{ method: 'error', message: 'dup', count: 1 }]),
    ).toThrow(/saw 2/)
  })

  it('rejects the same message under a different error name', () => {
    const calls = [call({ message: 'Error: persisted data is not an object' })]
    expect(() =>
      validateConsole(calls, [
        {
          method: 'error',
          message: 'PersistedDataError: persisted data is not an object',
        },
      ]),
    ).toThrow(/PersistedDataError/)
  })

  it('rejects extra arguments on an otherwise matching call', () => {
    const calls = [call({ argCount: 2, message: 'Error: boom' })]
    expect(() =>
      validateConsole(calls, [{ method: 'error', message: 'Error: boom' }]),
    ).toThrow(/1 arg\(s\)/)
  })

  it('rejects a non-frame multiline suffix that was not declared', () => {
    const calls = [call({ message: 'Error: boom\nsecond line' })]
    expect(() =>
      validateConsole(calls, [{ method: 'error', message: 'Error: boom' }]),
    ).toThrow(/unexpected console output/)
  })
})
