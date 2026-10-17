// Transient history preview target. It is React state provided by
// NavyStaffContent, not part of the Redux extension slice the persistence
// engine observes, so opening or closing a preview never schedules a write.
// A detached poi window renders through a React portal that shares this
// provider, so the preview is visible in both windows.

import { createContext, useContext } from 'react'

export interface PreviewTarget {
  workspaceId: string
  revisionId: string
}

export interface PreviewContextValue {
  target: PreviewTarget | null
  setTarget: (target: PreviewTarget | null) => void
}

export const PreviewContext = createContext<PreviewContextValue>({
  setTarget: () => undefined,
  target: null,
})

export const usePreview = (): PreviewContextValue => useContext(PreviewContext)
