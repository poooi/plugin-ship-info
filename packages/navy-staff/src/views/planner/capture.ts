import { remote } from 'electron'
import _ from 'lodash'

import html2canvas from '../../lib/html2canvas'

// Planner-owned screenshot capture. Kept out of the table utilities so pure
// table imports never pull Electron or the vendored renderer.
export const captureRect = async (rect: HTMLElement) => {
  if (!rect) {
    return
  }
  const { width, height } = rect.getBoundingClientRect()

  let canvas

  try {
    canvas = await html2canvas(rect, {
      allowTaint: true,
      backgroundColor: '#333',
      height: _.ceil(height, 16),
      width: _.ceil(width, 16),
    })
  } catch (e) {
    console.error(e)
    return
  }
  remote.getCurrentWebContents().downloadURL(canvas.toDataURL('image/png'))
}
