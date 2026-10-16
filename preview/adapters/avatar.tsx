import React from 'react'

// Host-provided ship avatar. The browser preview renders a deterministic
// placeholder box (no host image requests).
export const Avatar = ({ mstId }: { mstId?: number }) => (
  <span
    aria-hidden="true"
    data-avatar={mstId}
    style={{
      background: '#394b59',
      borderRadius: 2,
      display: 'inline-block',
      height: 26,
      verticalAlign: 'middle',
      width: 26,
    }}
  />
)
