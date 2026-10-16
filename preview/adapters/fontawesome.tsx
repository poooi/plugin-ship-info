import { Icon, type IconName } from '@blueprintjs/core'
import React from 'react'

// Host-provided react-fontawesome boundary. The browser preview maps the FA
// names the plugin uses onto Blueprint's bundled inline icons so previews are
// visible with no external font or network request.

const FA_TO_ICON: Record<string, IconName> = {
  bath: 'time',
  columns: 'column-layout',
  download: 'download',
  filter: 'filter',
  lock: 'lock',
  plus: 'plus',
  'sort-down': 'caret-down',
  'sort-up': 'caret-up',
  tag: 'tag',
  tags: 'tags',
  times: 'cross',
}

const FontAwesome = ({ name }: { name?: string }) => {
  const icon: IconName = (name && FA_TO_ICON[name]) || 'help'
  return <Icon aria-hidden icon={icon} />
}

export default FontAwesome
