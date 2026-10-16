// Share the pure host boundary selectors with the jsdom harness.
import { poiSelectors } from '../../tests/ui/host'

export const {
  configSelector,
  constSelector,
  equipDataSelectorFactory,
  extensionSelectorFactory,
  fcdSelector,
  fleetInExpeditionSelectorFactory,
  fleetShipsIdSelectorFactory,
  inRepairShipsIdSelector,
  shipDataSelectorFactory,
  shipEquipDataSelectorFactory,
  shipsSelector,
  stateSelector,
  wctfSelector,
} = poiSelectors
