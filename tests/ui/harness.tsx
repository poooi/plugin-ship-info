import { render as rtlRender } from '@testing-library/react'
import React from 'react'

import { createEnvironment, Environment, Providers } from './environment'

// jsdom render adapter: wires the shared environment into testing-library.
// Browser consumers use createEnvironment + Providers from ./environment
// directly instead of importing testing-library/react.

export interface Harness extends Environment {
  render: (ui: React.ReactElement) => ReturnType<typeof rtlRender>
}

export const createHarness = (initialState: any): Harness => {
  const environment = createEnvironment(initialState)

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Providers environment={environment}>{children}</Providers>
  )

  return {
    ...environment,
    render: (ui) => rtlRender(ui, { wrapper }),
  }
}
