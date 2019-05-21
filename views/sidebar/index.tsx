import { rgba } from 'polished'
import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { ThunkDispatch } from 'redux-thunk'
import styled from 'styled-components'

import { initStore } from '../redux'
import { Export } from './export'
import { Filter } from './filter'
import { Planner } from './planner'

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
  padding-bottom: 20px;
`

export const Sidebar = connect()(
  ({ dispatch }: { dispatch: ThunkDispatch<void, any, any> }) => {
    useEffect(() => {
      dispatch(initStore)
    }, [])

    return (
      <Wrapper>
        <Planner />
        <Filter />
        <Export />
      </Wrapper>
    )
  },
)
