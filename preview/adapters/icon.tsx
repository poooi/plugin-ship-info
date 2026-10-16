import React from 'react'

// Host-provided slot item icon. The browser preview renders a deterministic
// placeholder box (no host image requests).
export const SlotitemIcon = ({ slotitemId }: { slotitemId?: number }) => (
  <span
    aria-hidden="true"
    data-slotitem={slotitemId}
    style={{
      background: '#394b59',
      borderRadius: 2,
      display: 'inline-block',
      height: 30,
      verticalAlign: 'middle',
      width: 30,
    }}
  />
)
