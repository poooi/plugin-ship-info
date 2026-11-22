import { getContrast } from 'polished'
import React from 'react'
import styled from 'styled-components'

import { controlSurface } from '@poi-plugins/shared/ui/styles'

interface CardControlBaseProps {
  checked?: boolean
  onChange?: (event: React.FormEvent<HTMLInputElement>) => void
  children?: React.ReactNode
  compact?: boolean
  value?: string
  name?: string
  onContextMenu?: (event: React.MouseEvent) => void
}

const CardBase = styled.label<{ $checked?: boolean; $compact?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${(props) => (props.$compact ? '5px 10px' : '10px 15px')};
  min-height: ${(props) => (props.$compact ? '30px' : '40px')};
  border: 1px solid;
  border-radius: 3px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s cubic-bezier(0.4, 1, 0.75, 0.9);
  position: relative;
  gap: 8px;

  /* Default unchecked state */
  ${(props) =>
    controlSurface(
      'rest',
      props.theme.variant === 'light'
        ? props.theme.LIGHT_GRAY5
        : props.theme.DARK_GRAY3,
    )}
  border-color: ${(props) => props.theme.GRAY3};
  color: ${(props) =>
    props.theme.variant === 'light'
      ? props.theme.DARK_GRAY1
      : props.theme.LIGHT_GRAY5};
  box-shadow: none;

  /* Checked state */
  ${(props) =>
    props.$checked &&
    `
    background-color: ${props.theme.BLUE3};
    border-color: ${props.theme.BLUE3};
    color: #fff;
  `}

  /* Hover effects */
  &:hover {
    ${(props) =>
      props.$checked
        ? `background-color: ${props.theme.BLUE2}; border-color: ${props.theme.BLUE2};`
        : controlSurface(
            'hover',
            props.theme.variant === 'light'
              ? props.theme.LIGHT_GRAY3
              : props.theme.DARK_GRAY4,
          )}
  }

  &:active {
    ${(props) =>
      props.$checked
        ? `background-color: ${props.theme.BLUE4};`
        : controlSurface(
            'active',
            props.theme.variant === 'light'
              ? props.theme.LIGHT_GRAY2
              : props.theme.DARK_GRAY5,
          )}
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* Focus state */
  &:focus-within {
    outline: rgba(19, 124, 189, 0.6) auto 2px;
    outline-offset: 2px;
    z-index: 1;
  }

  /* Hide the actual input */
  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
`

const CardContent = styled.span`
  flex: 1;
  line-height: 1.4;
`

const TagCheck = styled.span`
  display: inline-flex;
  flex: 0 0 14px;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  box-sizing: border-box;
  border: 1.5px solid currentColor;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
`

export const CustomCheckboxCard: React.FC<CardControlBaseProps> = ({
  checked = false,
  onChange,
  children,
  compact = false,
  value,
  onContextMenu,
}) => {
  return (
    <CardBase
      $checked={checked}
      $compact={compact}
      onContextMenu={onContextMenu}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        value={value}
      />
      <CardContent>{children}</CardContent>
    </CardBase>
  )
}

export const CustomRadioCard: React.FC<CardControlBaseProps> = ({
  checked = false,
  onChange,
  children,
  compact = false,
  value,
  name,
}) => {
  return (
    <CardBase $checked={checked} $compact={compact}>
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        value={value}
        name={name}
      />
      <CardContent>{children}</CardContent>
    </CardBase>
  )
}

// Colored version for sally-area
interface ColoredCheckboxCardProps extends CardControlBaseProps {
  cardColor?: string
}

// Helper function to convert hex to rgba
const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '')
  return {
    b: parseInt(h.substring(4, 6), 16),
    g: parseInt(h.substring(2, 4), 16),
    r: parseInt(h.substring(0, 2), 16),
  }
}

const blendHex = (hex: string, surface: string, alpha: number) => {
  const color = hexToRgb(hex)
  const base = hexToRgb(surface)
  const channel = (value: number, background: number) =>
    Math.round(value * alpha + background * (1 - alpha))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(color.r, base.r)}${channel(color.g, base.g)}${channel(
    color.b,
    base.b,
  )}`
}

const tagTextColor = (
  background: string,
  theme: { DARK_GRAY1: string; LIGHT_GRAY5: string },
) =>
  getContrast(background, theme.DARK_GRAY1) >=
  getContrast(background, theme.LIGHT_GRAY5)
    ? theme.DARK_GRAY1
    : theme.LIGHT_GRAY5

const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const ColoredCardBase = styled(CardBase)<{
  $cardColor?: string
  $checked?: boolean
}>`
  /* Override default colors with custom ones */
  ${(props) => {
    if (!props.$cardColor) return ''

    const color = props.$cardColor
    const surface =
      props.theme.variant === 'light'
        ? props.theme.LIGHT_GRAY5
        : props.theme.DARK_GRAY3

    if (!props.$checked) {
      return `
        border-color: ${color};
        color: ${tagTextColor(blendHex(color, surface, 0.1), props.theme)};
        background-color: ${hexToRgba(color, 0.1)};

        &:hover {
          background-color: ${hexToRgba(color, 0.18)};
        }

        &:active {
          background-color: ${hexToRgba(color, 0.25)};
        }
      `
    }

    return `
      background-color: ${color};
      border-color: ${color};
      color: ${tagTextColor(color, props.theme)};

      &:hover {
        background-color: ${hexToRgba(color, 0.85)};
        border-color: ${hexToRgba(color, 0.85)};
      }

      &:active {
        background-color: ${hexToRgba(color, 1.0)};
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      &:focus-within {
        outline-color: ${hexToRgba(color, 0.6)};
      }
    `
  }}
`

export const CustomColoredCheckboxCard: React.FC<ColoredCheckboxCardProps> = ({
  checked = false,
  onChange,
  children,
  compact = false,
  value,
  cardColor,
  onContextMenu,
}) => {
  return (
    <ColoredCardBase
      $checked={checked}
      $compact={compact}
      $cardColor={cardColor}
      onContextMenu={onContextMenu}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        value={value}
      />
      <TagCheck data-tag-check="" aria-hidden="true">
        {checked ? '✓' : ''}
      </TagCheck>
      <CardContent>{children}</CardContent>
    </ColoredCardBase>
  )
}
