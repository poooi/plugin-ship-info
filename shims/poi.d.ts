declare module 'views/components/etc/window-env' {
  import { Context, Component } from 'react'

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

  export const configSelector: Selector<IState, any, []>
  export const constSelector: Selector<IState, IConstState, []>
  export const extensionSelectorFactory: (id: string) => Selector<IState, any, []>
  export const fcdSelector: Selector<IState, IFCD, []>
  export const fleetInExpeditionSelectorFactory: (id: number) => Selector<IState, any, []>
  export const fleetShipsIdSelectorFactory: (id: number) => Selector<IState, any, []>
  export const inRepairShipsIdSelector: Selector<IState, any, []>
  export const shipDataSelectorFactory: (id: number) => Selector<IState, IShipData, []>
  export const shipEquipDataSelectorFactory: (id: number) => Selector<IState, any, []>
  export const equipDataSelectorFactory: (id: number) => Selector<IState, any, []>
  export const shipsSelector: Selector<IState, Dictionary<APIShip>, []>
  export const stateSelector: Selector<IState, IState, []>
  export const wctfSelector: Selector<IState, any, []>
}

declare module 'views/components/etc/overlay' {
  export { Tooltip, Popover, Dialog } from '@blueprintjs/core'
}

declare module 'views/components/etc/avatar' {
  import { ComponentType } from 'react'
  export const Avatar: ComponentType<any>
}

declare module 'views/utils/tools' {
  export const resolveTime: (time: number) => string
}

declare module 'views/components/etc/icon' {
  import { ComponentType } from 'react'
  export const SlotitemIcon: ComponentType<any>
}

declare module 'views/utils/ship-img' {
  export const getShipImgPath: (id: number, type: string, damagaed: boolean, ip?: string, version?: number) => string
}


declare module 'views/create-store' {
  export const store: any
}
