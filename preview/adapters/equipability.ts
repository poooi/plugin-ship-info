// The host owns the equipment rules. Preview scenarios supply their results by master ID.
export function canEquipShipItem(
  shipId: number,
  itemId: number,
  state: { allowedEquipment?: Record<number, number[]> },
) {
  return state.allowedEquipment?.[shipId]?.includes(itemId) ?? false
}

export function canEquipType(
  shipId: number,
  typeId: number,
  state: { allowedEquipmentTypes?: Record<number, number[]> },
) {
  return state.allowedEquipmentTypes?.[shipId]?.includes(typeId) ?? false
}
