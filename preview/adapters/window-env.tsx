import { createContext } from 'react'

// Host-provided WindowEnv context. The decorator supplies the live host window.
export const WindowEnv = createContext<{ window: any }>({ window: undefined })
