# poi-plugin-ship-info

Ship Girls Info plugin for [poi](https://github.com/poooi/poi).

Shows detailed information about every owned ship girl: a sortable, filterable
table with configurable columns, repair/condition status, equipment details and
CSV export. The sortie planner is maintained separately as
`poi-plugin-navy-staff` in this workspace.

## Install

Open **Settings → Plugins** in poi. Under **Install directly from npm**, enter
`poi-plugin-ship-info` and click **Install**. poi manages installation in its
plugin directory.

poi provides React, Redux, Blueprint and the other host UI libraries at runtime;
this package bundles the rest of its implementation.

## Development

The plugin is developed inside the repository's pnpm workspace. See the
repository [README](https://github.com/poooi/plugin-ship-info#readme) for
workspace layout and commands (`pnpm run check`, `pnpm test`,
`pnpm run test:browser`, `pnpm run build`, `pnpm run pack`,
`pnpm run verify:package`) and
[docs/plugin-split-design.md](https://github.com/poooi/plugin-ship-info/blob/master/docs/plugin-split-design.md)
for the design behind the shared modules and the plugin split.

## License

MIT
