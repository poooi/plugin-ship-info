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

  width: ${(props) => (props.halfWidth ? '46%' : '100%')};

  :nth-child(odd) {
    margin-right: ${(props) => props.halfWidth && '8%'};
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
  padding: 6px 12px;
  line-height: 1.6;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  position: relative;
  font-weight: 500;

  /* Default state */
  color: ${(props) => props.theme.LIGHT_GRAY5};
  background-color: ${(props) => props.theme.DARK_GRAY3};
  border: 1px solid ${(props) => props.theme.DARK_GRAY5};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  /* Checked state */
  ${(props) =>
    props.checked &&
    `
    color: #fff;
    background: linear-gradient(135deg, ${props.theme.BLUE4} 0%, ${props.theme.BLUE5} 100%);
    border-color: ${props.theme.BLUE5};
    box-shadow: 0 2px 8px rgba(41, 101, 204, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
  `}

  /* Partial state */
  ${(props) =>
    props.partial &&
    `
    color: #fff;
    background: linear-gradient(135deg, ${props.theme.ORANGE4} 0%, ${props.theme.ORANGE5} 100%);
    border-color: ${props.theme.ORANGE5};
    box-shadow: 0 2px 8px rgba(217, 130, 43, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
  `}

  /* Hover effects */
  &:hover {
    ${(props) =>
      !props.checked &&
      !props.partial &&
      `
      background-color: ${props.theme.DARK_GRAY4};
      border-color: ${props.theme.GRAY5};
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    `}

    ${(props) =>
      props.checked &&
      `
      box-shadow: 0 4px 12px rgba(41, 101, 204, 0.4), 0 2px 4px rgba(0, 0, 0, 0.25);
      transform: translateY(-2px);
    `}

    ${(props) =>
      props.partial &&
      `
      box-shadow: 0 4px 12px rgba(217, 130, 43, 0.4), 0 2px 4px rgba(0, 0, 0, 0.25);
      transform: translateY(-2px);
    `}
  }

  /* Focus state for accessibility */
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(41, 101, 204, 0.3);
  }

  /* Active state */
  &:active {
    transform: translateY(0);
  }
`
