import { Selector } from 'reselect'

declare module 'views/utils/selectors' {
  export const constSelector: Selector<any, any>
  export const shipDataSelectorFactory: (id: number) => Selector<any, any>
  export const shipsSelector: Selector<any, any>
  export const configSelector: Selector<any, any>
  export const fcdSelector: Selector<any, any>
  export const shipEquipDataSelectorFactory: (id: number) => Selector<any, any>
  export const fleetInExpeditionSelectorFactory: (id: number) => Selector<any, any>
  export const fleetShipsIdSelectorFactory: (id: number) => Selector<any, any>
  export const stateSelector: Selector<any, any>
  export const inRepairShipsIdSelector: Selector<any, any>
  export const extensionSelectorFactory: (ext: string) => Selector<any, any>
  export const wctfSelector: Selector<any, any>
}
