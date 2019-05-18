import { rgba } from 'polished'
import React from 'react'
import styled from 'styled-components'

import { Filter } from './filter'

const Wrapper = styled.div`
  width: 50px;
  background: linear-gradient(
    to bottom,
    transparent,
    ${props => rgba(props.theme.BLUE1, 0.4)}
  );
  margin-right: 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
`

export const Sidebar = () => (
  <Wrapper>
    <Filter />
  </Wrapper>
)
