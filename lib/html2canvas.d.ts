interface Html2CanvasOptions {
  allowTaint?: boolean
  backgroundColor?: string
  height?: number
  width?: number
}

declare function html2canvas(
  element: HTMLElement,
  options?: Html2CanvasOptions,
): Promise<HTMLCanvasElement>

export = html2canvas
