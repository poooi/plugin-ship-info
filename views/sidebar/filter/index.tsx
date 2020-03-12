import { Button } from '@blueprintjs/core'
import React from 'react'
import FA from 'react-fontawesome'
import styled from 'styled-components'
import { Popover } from 'views/components/etc/overlay'

import {
  daihatsuOptions,
  expeditionOptions,
  exSlotOptions,
  inFleetOptions,
  lockedOptions,
  lvOptions,
  modernizationOptions,
  rawValueOptions,
  remodelOptions,
  sparkleOptions,
} from '../../constants'
import { Container } from '../components/layout'
import { LevelRange } from './level-range'
import { RadioCheck } from './radio'
import { SallyAreaCheck } from './sally-area'
import { ShipTypeCheck } from './ship-type'

const Content = styled.div`
  max-width: 80vw;
  display: flex;
  flex-wrap: wrap;
`

export const Filter = () => (
  <Popover hasBackdrop>
    <Button minimal>
      <FA name="filter" />
    </Button>
    <Container>
      <Content>
        <ShipTypeCheck />
      </Content>
      <Content>
        <LevelRange />
      </Content>
      <Content>
        <RadioCheck
          configKey="lockedRadio"
          label="Lock"
          options={lockedOptions}
          default={1}
        />
        <RadioCheck
          configKey="expeditionRadio"
          label="Expedition"
          options={expeditionOptions}
          default={0}
        />
        <RadioCheck
          configKey="inFleetRadio"
          label="In Fleet"
          options={inFleetOptions}
          default={0}
        />
        <RadioCheck
          configKey="modernizationRadio"
          label="Modernization"
          options={modernizationOptions}
          default={0}
        />
        <RadioCheck
          configKey="remodelRadio"
          label="Remodelable"
          options={remodelOptions}
          default={0}
        />
        <RadioCheck
          configKey="sparkleRadio"
          label="Sparkle"
          options={sparkleOptions}
          default={0}
        />
        <RadioCheck
          configKey="exSlotRadio"
          label="Extra Slot"
          options={exSlotOptions}
          default={0}
        />
        <RadioCheck
          configKey="daihatsuRadio"
          label="Daihatsu"
          options={daihatsuOptions}
          default={0}
        />
      </Content>
      <Content>
        <SallyAreaCheck />
      </Content>
      <Content>
        <RadioCheck
          configKey="rawValue"
          label="Value Type"
          options={rawValueOptions}
          default={0}
        />
      </Content>
    </Container>
  </Popover>
)
