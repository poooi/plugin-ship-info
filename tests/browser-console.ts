// Strict browser console contract for the Chromium story suite.
//
// Each story must be silent on `console.warn`/`console.error`. A story that
// intentionally logs declares it in `parameters.expectedConsole`; the setup file
// (tests/browser-console.setup.ts) captures every call before the story renders
// and validates it afterwards. Captured calls are not printed: expected output
// stays out of CI, unexpected output is surfaced in the assertion message.

export type ExpectedConsoleMethod = 'warn' | 'error'

export interface ExpectedConsoleCall {
  method: ExpectedConsoleMethod
  /**
   * Exact logged identity with stack frames normalized away (e.g.
   * `Error: EACCES ...`). The error name is part of the identity, so `Error: ...`
   * never matches a declared `PersistedDataError: ...`; any non-frame extra
   * lines stay part of the identity and must be declared.
   */
  message: string
  /** Exact number of matching calls; defaults to 1. */
  count?: number
  /** Exact number of arguments passed to the call; defaults to 1. */
  args?: number
}

export interface ConsoleCallRecord {
  method: ExpectedConsoleMethod
  /** Identity used for matching: logged text with stack frames normalized away. */
  message: string
  /** Full logged text, kept for failure diagnostics only. */
  detail: string
  argCount: number
}

export interface ConsoleCapture {
  calls: ConsoleCallRecord[]
  restore: () => void
}

const STACK_FRAME = /^\s*at\s/

/** Removes only the `at ...` stack-frame lines; other content is preserved. */
const normalizeStackFrames = (text: string): string =>
  text
    .split('\n')
    .filter((line) => !STACK_FRAME.test(line))
    .join('\n')
    .trimEnd()

/** Full text of a logged call; an Error contributes its whole stack. */
export const consoleText = (args: unknown[]): string =>
  args
    .map((arg) => {
      if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`
      if (typeof arg === 'string') return arg
      return String(arg)
    })
    .join(' ')

/** Replaces console.warn/error with recorders; restore() puts the originals back. */
export const captureConsole = (): ConsoleCapture => {
  const original = { error: console.error, warn: console.warn }
  const calls: ConsoleCallRecord[] = []
  const record =
    (method: ExpectedConsoleMethod) =>
    (...args: unknown[]) => {
      const detail = consoleText(args)
      calls.push({
        argCount: args.length,
        detail,
        message: normalizeStackFrames(detail),
        method,
      })
    }
  console.error = record('error')
  console.warn = record('warn')
  return {
    calls,
    restore: () => {
      console.error = original.error
      console.warn = original.warn
    },
  }
}

/**
 * Fails unless every declared call occurs exactly `count` times with the
 * declared argument count and no undeclared call was recorded. Throws with the
 * captured output so an unexpected warning/error keeps actionable diagnostics.
 */
export const validateConsole = (
  calls: ConsoleCallRecord[],
  expected: ExpectedConsoleCall[] = [],
): void => {
  const unmatched = [...calls]
  const problems: string[] = []

  for (const declared of expected) {
    const want = declared.count ?? 1
    const wantArgs = declared.args ?? 1
    let found = 0
    for (let index = unmatched.length - 1; index >= 0; index -= 1) {
      const call = unmatched[index]
      if (
        call.method === declared.method &&
        call.message === declared.message &&
        call.argCount === wantArgs
      ) {
        unmatched.splice(index, 1)
        found += 1
      }
    }
    if (found !== want) {
      problems.push(
        `expected ${want} ${declared.method} call(s) with ${wantArgs} arg(s) matching "${declared.message}", saw ${found}`,
      )
    }
  }

  if (unmatched.length > 0) {
    problems.push(
      `unexpected console output:\n${unmatched
        .map(
          (call) =>
            `  ${call.method} (${call.argCount} arg(s)):\n${call.detail
              .split('\n')
              .map((line) => `    ${line}`)
              .join('\n')}`,
        )
        .join('\n')}`,
    )
  }

  if (problems.length > 0) {
    throw new Error(`Browser console contract failed:\n${problems.join('\n')}`)
  }
}
