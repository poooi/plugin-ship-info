// Host-provided poi selectors. The canonical implementations live in
// tests/ui/host.tsx (shared with the jsdom tests); re-export them as named
// bindings because the plugin imports them individually.
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
