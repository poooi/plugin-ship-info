import { Icon } from '@blueprintjs/core'
import { get } from 'lodash'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import type { IState } from 'views/utils/selectors'

import type { HostShiptagView } from '../sync/capture'

// Current host sortie-tag metadata. Read-only and transient: it is never
// persisted and never compared with the planned assignment.
export const hostShiptagSelector = (state: IState): HostShiptagView | null =>
  (get(state, 'fcd.shiptag', null) as HostShiptagView | null) ?? null

export const currentLocale = (): string =>
  typeof window !== 'undefined' && typeof window.language === 'string'
    ? window.language
    : 'en-US'

/** Host map/fleet label for a 1-based tag, honoring the original/translated setting. */
export const resolveSortieTagLabel = (
  shiptag: HostShiptagView | null | undefined,
  tag: number,
  translated: boolean,
): string | null => {
  if (!shiptag || tag < 1) return null
  const slot = tag - 1
  const localized = translated
    ? shiptag.fleetname?.[currentLocale()]?.[slot]
    : undefined
  if (typeof localized === 'string' && localized.length > 0) return localized
  // Translated mode falls back to the original map label, then to the numeric
  // tag at the call site.
  const original = shiptag.mapname?.[slot]
  return typeof original === 'string' && original.length > 0 ? original : null
}

/** Host color for a 1-based tag, or null when metadata is absent. */
export const resolveSortieTagColor = (
  shiptag: HostShiptagView | null | undefined,
  tag: number,
): string | null => {
  if (!shiptag || tag < 1) return null
  const color = shiptag.color?.[tag - 1]
  return typeof color === 'string' && color.length > 0 ? color : null
}

const Badge = styled.span`
  display: inline-flex;
  flex: 0 1 auto;
  align-items: center;
  gap: 0.25em;
  min-width: 0;
  max-width: 100%;
  font-size: 0.85em;
  line-height: 1.1;
  opacity: 0.85;
  white-space: nowrap;
  /* The grid text layer sets pointer-events:none; re-enable events here (they
     still bubble to the card) so the truncated badge's title tooltip works. */
  pointer-events: auto;
`

const TagIcon = styled.span<{ $color: string | null }>`
  display: inline-flex;
  flex: none;
  color: ${(props) => props.$color ?? props.theme.GRAY3};
`

const TagText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export interface ActualSortieTagProps {
  /** 1-based live sortie tag, or null when untagged/absent. */
  actualTag: number | null
  /** True to prefer the translated fleet label over the original map label. */
  translated: boolean
  className?: string
  /** Lets a container reference the badge from its aria-describedby. */
  id?: string
}

// The ship's live sortie tag, shown alongside the planned assignment. A missing
// game label degrades to the numeric `Tag N` with a neutral icon color instead
// of hiding the tag.
export const ActualSortieTag = ({
  actualTag,
  translated,
  className,
  id,
}: ActualSortieTagProps) => {
  const { t } = useTranslation('poi-plugin-navy-staff')
  const shiptag = useSelector(hostShiptagSelector)
  if (actualTag === null || actualTag < 1) return null
  const resolved = resolveSortieTagLabel(shiptag, actualTag, translated)
  const label = resolved ?? t('Tag {{number}}', { number: actualTag })
  const color = resolveSortieTagColor(shiptag, actualTag)
  const accessible = t('actualTagLabel', { label })
  return (
    <Badge
      className={className}
      id={id}
      data-testid="actual-sortie-tag"
      role="img"
      aria-label={accessible}
      title={accessible}
    >
      <TagIcon $color={color} aria-hidden>
        <Icon icon="tag" size={12} />
      </TagIcon>
      <TagText>{t('actualTag', { label })}</TagText>
    </Badge>
  )
}
