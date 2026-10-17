import { remote } from 'electron'
import { domToPng } from 'modern-screenshot'

// Planner-owned screenshot capture. modern-screenshot renders through Chromium's
// SVG <foreignObject>, so it handles oklch colours and works in both the main and
// detached windows without a viewport crop. The caller supplies an opaque,
// theme-appropriate background; the full scroll size is captured.
export interface CaptureOptions {
  backgroundColor: string
}

export const captureRect = async (
  rect: HTMLElement,
  options: CaptureOptions,
): Promise<void> => {
  if (!rect) return
  const bounds = rect.getBoundingClientRect()
  const width = Math.ceil(Math.max(rect.scrollWidth, rect.clientWidth, bounds.width))
  const height = Math.ceil(Math.max(rect.scrollHeight, rect.clientHeight, bounds.height))
  const dataUrl = await domToPng(rect, {
    backgroundColor: options.backgroundColor,
    height,
    scale: 1,
    width,
  })
  // Current Electron may return a promise; await so a rejected download is
  // caught by the caller's error UI.
  await remote.getCurrentWebContents().downloadURL(dataUrl)
}
