import { remote } from 'electron'
import { outputFile } from 'fs-extra'
import { domToPng } from 'modern-screenshot'

// Planner-owned screenshot capture. modern-screenshot renders through Chromium's
// SVG <foreignObject>, so it handles oklch colours and works in both the main and
// detached windows without a viewport crop. The caller supplies an opaque,
// theme-appropriate background; the full scroll size is captured.
//
// The destination is chosen before rendering (a cancel does no expensive work)
// and the decoded PNG bytes are written through the existing fs-extra boundary.
export interface CaptureOptions {
  backgroundColor: string
  /** Suggested ".png" file name: title + localized view + timestamp. */
  fileName: string
  /** Localized save-dialog filter name. */
  filterName: string
}

const INVALID_FILENAME = /[<>:"/\\|?*\u0000-\u001F]/gu

/** Strips characters invalid on Windows (and in most file systems) and bounds the text. */
export const sanitizeFileName = (value: string, maxLength = 120): string => {
  const cleaned = value
    .replace(INVALID_FILENAME, '_')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/[. ]+$/gu, '')
  return cleaned.slice(0, maxLength)
}

/** Deterministic title + localized view + timestamp `.png` suggestion. */
export const imageFileName = (
  title: string,
  viewLabel: string,
  now: Date = new Date(),
): string => {
  const stamp = now.toISOString().replace(/[:.]/gu, '-')
  const titlePart = sanitizeFileName(title, 80) || 'navy-reference'
  const viewPart = sanitizeFileName(viewLabel, 40)
  return `${titlePart} - ${viewPart}-${stamp}.png`
}

// Decode the rendered data URL into bytes without relying on Node's Buffer
// global, so the same path works in browser stories and Electron.
const pngBytes = async (dataUrl: string): Promise<Uint8Array> => {
  const response = await fetch(dataUrl)
  return new Uint8Array(await response.arrayBuffer())
}

export const captureRect = async (
  rect: HTMLElement,
  options: CaptureOptions,
): Promise<void> => {
  if (!rect) return

  // Ask for the destination first so cancelling avoids the expensive render.
  const { dialog } = remote
  const result = await dialog.showSaveDialog(remote.getCurrentWindow(), {
    defaultPath: options.fileName,
    filters: [{ extensions: ['png'], name: options.filterName }],
    title: options.fileName,
  })
  if (result.canceled || !result.filePath) return

  const bounds = rect.getBoundingClientRect()
  const width = Math.ceil(Math.max(rect.scrollWidth, rect.clientWidth, bounds.width))
  const height = Math.ceil(Math.max(rect.scrollHeight, rect.clientHeight, bounds.height))
  const dataUrl = await domToPng(rect, {
    backgroundColor: options.backgroundColor,
    height,
    scale: 1,
    width,
  })
  await outputFile(result.filePath, await pngBytes(dataUrl))
}
