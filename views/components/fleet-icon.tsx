import React from 'react'
import styled from 'styled-components'
import Fleet1Icon from '../icons/fleet-1'
import Fleet2Icon from '../icons/fleet-2'
import Fleet3Icon from '../icons/fleet-3'
import Fleet4Icon from '../icons/fleet-4'

const FleetIconWrapper = styled.div<{ $size: string }>`
  flex-shrink: 0;
  width: ${(props) => props.$size};
  height: ${(props) => props.$size};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;

  svg {
    width: 100%;
    height: 100%;
  }
`

interface FleetIconProps {
  fleetId: number
  size?: string
  className?: string
}

export const FleetIcon: React.FC<FleetIconProps> = ({
  fleetId,
  size = '1em',
  className,
}) => {
  const FleetIconComponent = [Fleet1Icon, Fleet2Icon, Fleet3Icon, Fleet4Icon][
    fleetId
  ]

  if (!FleetIconComponent || fleetId < 0) {
    return null
  }

  return (
    <FleetIconWrapper $size={size} className={className}>
      <FleetIconComponent />
    </FleetIconWrapper>
  )
}
