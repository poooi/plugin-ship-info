declare module 'views/components/etc/window-env' {
  import { Context } from 'react'

  export const WindowEnv: Context<{ window: Window }>
}

declare module 'views/env-parts/i18next' {
  import { i18n } from 'i18next'

  const i18nextInstance: i18n
  export default i18nextInstance
}

declare module 'views/utils/selectors' {
  import { APIShip } from 'kcsapi/api_port/port/response'
  import {
    APIMstShip,
    APIMstShipgraph,
    APIMstStype,
  } from 'kcsapi/api_start2/getData/response'
  import { Selector } from 'reselect'
  interface Dictionary<T> {
    [index: string]: T
  }

  export interface IState {
    const: IConstState
    config: any
  }

  export interface IConstState {
    $shipgraph?: APIMstShipgraph[]
    $shipTypes?: Dictionary<APIMstStype>
    $ships?: Dictionary<APIMstShip>
  }

  export interface IFCD {
    shipavatar: {
      marginMagics: Dictionary<any>
    }
    shiptag: any
  }

  export type IShipData = [APIShip?, APIMstShip?]

  export const configSelector: Selector<any, any>
  export const constSelector: Selector<any, IConstState>
  export const extensionSelectorFactory: Selector<any, any>
  export const fcdSelector: Selector<any, IFCD>
  export const fleetInExpeditionSelectorFactory: Selector<any, any>
  export const fleetShipsIdSelectorFactory: Selector<any, any>
  export const inRepairShipsIdSelector: Selector<any, any>
  export const shipDataSelectorFactory: (id: number) => Selector<any, IShipData>
  export const shipEquipDataSelectorFactory: Selector<any, any>
  export const shipsSelector: Selector<any, Dictionary<APIShip>>
  export const stateSelector: Selector<any, any>
  export const wctfSelector: Selector<any, any>
}
