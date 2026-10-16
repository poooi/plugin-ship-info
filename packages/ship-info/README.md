# poi-plugin-ship-info

Ship Girls Info plugin for [poi](https://github.com/poooi/poi).

Shows detailed information about every owned ship girl: a sortable, filterable
table with configurable columns, repair/condition status, equipment details and
CSV export, plus the built-in sortie (deck) planner.

## Install

Install the published package in poi's plugin manager, or from npm:

```sh
npm install poi-plugin-ship-info
```

poi provides React, Redux, Blueprint and the other host UI libraries at runtime;
this package bundles the rest of its implementation.

## Development

The plugin is developed inside the repository's pnpm workspace. See the
repository [README](https://github.com/poooi/plugin-ship-info#readme) for
workspace layout and commands (`pnpm run check`, `pnpm test`,
`pnpm run test:browser`, `pnpm run build`, `pnpm run pack`,
`pnpm run verify:package`) and
[docs/plugin-split-design.md](https://github.com/poooi/plugin-ship-info/blob/master/docs/plugin-split-design.md)
for the design behind the shared modules and the planned plugin split.

## License

MIT
