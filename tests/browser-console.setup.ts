import { afterEach, beforeEach } from 'vitest'

import {
  captureConsole,
  validateConsole,
  type ConsoleCapture,
  type ExpectedConsoleCall,
} from './browser-console'

// Browser-only setup for the Storybook story tests. It enforces the strict
// console contract declared in docs/browser-testing.md: a story must not emit
// console.warn/console.error unless it declares the exact call in
// `parameters.expectedConsole`.
//
// Capture starts in `beforeEach` (before the story renders) and validation runs
// in `afterEach`, after the Storybook addon has attached `context.story`. The
// originals are always restored, even when validation throws.

interface StoryWithExpectedConsole {
  parameters?: {
    expectedConsole?: ExpectedConsoleCall[]
  }
}

let capture: ConsoleCapture | undefined

beforeEach(() => {
  capture = captureConsole()
})

afterEach((context) => {
  const active = capture
  capture = undefined
  try {
    const story = (context as { story?: StoryWithExpectedConsole }).story
    validateConsole(active?.calls ?? [], story?.parameters?.expectedConsole)
  } finally {
    active?.restore()
  }
})
