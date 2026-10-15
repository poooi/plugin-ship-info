import { mkMstShip, mkShip } from '../fixtures'

// Kept as a literal so this fixture module never imports views/redux (which
// itself pulls in the host selectors) just to read the key.
const PLUGIN_KEY = 'poi-plugin-ship-info'

// ---------------------------------------------------------------------------
// jsdom geometry: the virtualizer reads offsetHeight/offsetWidth and
// ResizeObserver. Freeze them so virtual rows render deterministically.
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

// ---------------------------------------------------------------------------
// Realistic small fixtures. Levels differ so level sort is observable; types
// 2/3 and sally areas 0/1/2 make type and tag filters observable.
// ---------------------------------------------------------------------------

const mst = (over: Record<string, any>) =>
  mkMstShip({ api_taik: [30, 30], ...over })

const shipDb = {
  item_types: [],
  ships: {},
}

export const tableShips = {
  1: mkShip({ api_cond: 60, api_id: 1, api_lv: 50, api_sally_area: 0 }),
  2: mkShip({ api_cond: 30, api_id: 2, api_lv: 10, api_sally_area: 1 }),
  3: mkShip({ api_cond: 40, api_id: 3, api_lv: 150, api_sally_area: 0 }),
  4: mkShip({ api_cond: 20, api_id: 4, api_lv: 100, api_sally_area: 2 }),
}

export const tableMstShips = {
  1: mst({ api_id: 1, api_name: 'Alpha', api_sortno: 10, api_stype: 2, api_yomi: 'アルファ' }),
  2: mst({ api_id: 2, api_name: 'Beta', api_sortno: 20, api_stype: 2, api_yomi: 'ベータ' }),
  3: mst({ api_id: 3, api_name: 'Gamma', api_sortno: 30, api_stype: 3, api_yomi: 'ガンマ' }),
  4: mst({ api_id: 4, api_name: 'Delta', api_sortno: 40, api_stype: 3, api_yomi: 'デルタ' }),
}

export const shipTypes = {
  1: { api_name: 'DE' },
  2: { api_name: 'DD' },
  3: { api_name: 'CL' },
}

export const tableState = (over: Record<string, any> = {}) => ({
  config: { plugin: { ShipInfo: {} }, poi: { appearance: { avatar: false } } },
  const: {
    $equips: {},
    $shipgraph: [],
    $ships: tableMstShips,
    $shipTypes: shipTypes,
  },
  db: shipDb,
  expedition: [] as number[],
  fcd: {
    shipavatar: { marginMagics: {} },
    shiptag: { color: ['#ff0000', '#00ff00'], mapname: ['E1', 'E2'] },
  },
  fleets: [[], [], [], []],
  info: { equips: {}, server: { ip: '1.2.3.4' }, ships: tableShips },
  repairs: [] as number[],
  [PLUGIN_KEY]: { planner: { archive: {}, current: [] }, ready: true },
  ...over,
})

export const plannerShips = {
  1: mkShip({ api_id: 1, api_lv: 50, api_sally_area: 0 }),
  2: mkShip({ api_id: 2, api_lv: 20, api_sally_area: 0 }),
  3: mkShip({ api_id: 3, api_lv: 150, api_sally_area: 0 }),
  4: mkShip({ api_id: 4, api_lv: 100, api_sally_area: 1 }),
  5: mkShip({ api_id: 5, api_lv: 10, api_sally_area: 0 }),
}

export const plannerMstShips = {
  1: mst({ api_id: 1, api_name: 'Alpha', api_sortno: 10, api_stype: 2, api_yomi: 'アルファ' }),
  2: mst({ api_id: 2, api_name: 'Beta', api_sortno: 20, api_stype: 2, api_yomi: 'ベータ' }),
  3: mst({ api_id: 3, api_name: 'Gamma', api_sortno: 30, api_stype: 3, api_yomi: 'ガンマ' }),
  4: mst({ api_id: 4, api_name: 'Delta', api_sortno: 40, api_stype: 3, api_yomi: 'デルタ' }),
  5: mst({ api_id: 5, api_name: 'Epsilon', api_sortno: 50, api_stype: 4, api_yomi: 'イプシロン' }),
}

export const plannerState = (over: Record<string, any> = {}) => ({
  ...tableState(),
  const: {
    $equips: {},
    $shipgraph: [],
    $ships: plannerMstShips,
    $shipTypes: { ...shipTypes, 4: { api_name: 'CLT' } },
  },
  info: { equips: {}, server: { ip: '1.2.3.4' }, ships: plannerShips },
  [PLUGIN_KEY]: { planner: { archive: {}, current: [[3]] }, ready: true },
  ...over,
})
