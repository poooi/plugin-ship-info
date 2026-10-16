// Browser boundary for the vendored html2canvas capture renderer. Electron runs
// the real renderer; the browser preview only needs to observe what the plugin
// asks to capture and to drive both the success and rejected paths. The call
// log and outcome live here so capture stories can reset them between runs.

export interface CaptureRect {
  height: number
  width: number
}

export interface CaptureRequest {
  element: HTMLElement
  options: Record<string, unknown>
  /** The element's real bounding rect at the instant the capture was requested. */
  rect: CaptureRect
}

export interface CaptureCanvas {
  toDataURL: (type?: string) => string
}

export type CaptureOutcome = 'success' | 'failure'

const requests: CaptureRequest[] = []
let outcome: CaptureOutcome = 'success'

/** Reset the recorded calls and restore the default success outcome. */
export const resetCapture = () => {
  requests.length = 0
  outcome = 'success'
}

/** Select whether the next capture resolves or rejects. */
export const setCaptureOutcome = (next: CaptureOutcome) => {
  outcome = next
}

/** Every capture request recorded since the last reset, in call order. */
export const getCaptureRequests = (): CaptureRequest[] => requests

const CAPTURED_DATA_URL = 'data:image/png;base64,cHJldmlldy1jYXB0dXJl'

const html2canvas = async (
  element: HTMLElement,
  options: Record<string, unknown> = {},
): Promise<CaptureCanvas> => {
  // Record the element's bounds at the same instant the plugin sizes the
  // capture, so assertions do not race a later dialog transition.
  const bounds = element.getBoundingClientRect()
  requests.push({
    element,
    options,
    rect: { height: bounds.height, width: bounds.width },
  })
  if (outcome === 'failure') {
    throw new Error('html2canvas capture rejected by the preview adapter')
  }
  return {
    toDataURL: () => CAPTURED_DATA_URL,
  }
}

export default html2canvas
