import { Button } from '@blueprintjs/core'
import React from 'react'
import FA from 'react-fontawesome'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'

import { rawValueOptions } from '../../constants'
import { LevelRange } from './level-range'
import { RadioCheck } from './radio'
import { SallyAreaCheck } from './sally-area'
import { ShipTypeCheck } from './ship-type'
import { YesNoCheck } from './yes-no-check'

const FilterContainer = styled.div`
  padding: 20px;
  max-width: 80vw;
  max-height: 80vh;
  overflow: auto;
`

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`

export const Filter = () => (
  <Popover
    content={
      <FilterContainer>
        <ShipTypeCheck />
        <LevelRange />
        <SallyAreaCheck />
        <FilterGrid>
          <YesNoCheck configKey="locked" label="Lock" />
          <YesNoCheck configKey="expedition" label="Expedition" />
          <YesNoCheck configKey="inFleet" label="In Fleet" />
          <YesNoCheck configKey="sparkle" label="Sparkle" />
          <YesNoCheck configKey="exSlot" label="Extra Slot" />
          <YesNoCheck configKey="daihatsu" label="Daihatsu" />
          <YesNoCheck
            configKey="modernization"
            label="Modernization Completed"
          />
          <YesNoCheck configKey="remodel" label="Remodelable" />
        </FilterGrid>
        <div>
          <RadioCheck
            configKey="rawValue"
            label="Value Type"
            options={rawValueOptions}
            default={0}
          />
        </div>
      </FilterContainer>
    }
    hasBackdrop
  >
    <Button minimal>
      <FA name="filter" />
    </Button>
  </Popover>
)
