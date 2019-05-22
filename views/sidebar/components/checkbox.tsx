import styled from 'styled-components'

interface ICheckboxProps {
  halfWidth?: boolean
}

export const Checkbox = styled.div<ICheckboxProps>`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  white-space: nowrap;
  align-items: center;
  margin: 8px 0;

  width: ${props => (props.halfWidth ? '46%' : '100%')};

  :nth-child(odd) {
    margin-right: ${props => props.halfWidth && '8%'};
  }
`

export const CheckboxLabel = styled.div`
  flex: 1;
`

interface ICheckboxOptionProps {
  checked?: boolean
  partial?: boolean
}

export const CheckboxOption = styled.div.attrs({
  role: 'button',
  tabIndex: 0,
})<ICheckboxOptionProps>`
  padding: 0 1ex;
  line-height: 160%;
  transition: 0.3s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 2em;

  color: ${props => (props.checked || props.partial) && '#fff'};
  background-color: ${props => props.checked && props.theme.BLUE5};
  background-color: ${props => props.partial && props.theme.ORANGE5};
`
