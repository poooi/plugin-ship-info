// jsdom geometry: the virtualizer reads offsetHeight/offsetWidth and
// ResizeObserver. Freeze them so virtual rows render deterministically.
//
// This module is deliberately jsdom-only; browser consumers import the pure
// state factories from ./fixtures instead so they never touch this file.
// ---------------------------------------------------------------------------

export const VIEWPORT_HEIGHT = 350
export const VIEWPORT_WIDTH = 1000

const DESCRIPTORS = [
  ['offsetHeight', () => VIEWPORT_HEIGHT],
  ['offsetWidth', () => VIEWPORT_WIDTH],
  ['clientHeight', () => VIEWPORT_HEIGHT],
  ['clientWidth', () => VIEWPORT_WIDTH],
] as const

const originalDescriptors = new Map(
  DESCRIPTORS.map(([name]) => [
    name,
    Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, name),
  ]),
)

export const installViewport = () => {
  const { prototype } = window.HTMLElement
  for (const [name, get] of DESCRIPTORS) {
    Object.defineProperty(prototype, name, { configurable: true, get })
  }

  class ResizeObserverStub {
    public constructor(private readonly cb: any) {}
    public observe(target: Element) {
      this.cb(
        [
          {
            contentRect: { height: VIEWPORT_HEIGHT, width: VIEWPORT_WIDTH },
            target,
          },
        ],
        this,
      )
    }
    public unobserve() {
      /* noop */
    }
    public disconnect() {
      /* noop */
    }
  }
  ;(window as any).ResizeObserver = ResizeObserverStub
  ;(globalThis as any).ResizeObserver = ResizeObserverStub

  if (!window.matchMedia) {
    ;(window as any).matchMedia = (query: string) => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    })
  }
}

export const restoreViewport = () => {
  const { prototype } = window.HTMLElement
  for (const [name] of DESCRIPTORS) {
    const descriptor = originalDescriptors.get(name)
    if (descriptor) Object.defineProperty(prototype, name, descriptor)
    else delete (prototype as any)[name]
  }
  delete (window as any).ResizeObserver
}
