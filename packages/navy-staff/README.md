# poi-plugin-navy-staff

Navy Staff plugin for [poi](https://github.com/poooi/poi).

Plans which ship girls to send to each sortie area, with an area view and a ship
grid view, add/move/remove (including tag synchronization with the host), and
an image export in detached windows.

The main view shows the planner tabs directly. It owns its own plugin state and
saved file (`poi-plugin-navy-staff.json`) and imports an existing sortie plan
from Ship Info's legacy data the first time it runs.

## Install

Navy Staff has **not been published to npm yet**. Once it is released it can be
installed like any other poi plugin:

```sh
npm install poi-plugin-navy-staff
```

Until then, pack it from the workspace (`.cache/packages/poi-plugin-navy-staff-*.tgz`)
and install the local tarball. poi provides React, Redux, Blueprint and the other
host UI libraries at runtime; this package bundles the rest of its implementation.

## Development

Developed in the repository's pnpm workspace. See the repository
[README](https://github.com/poooi/plugin-ship-info#readme) for commands and
[docs/plugin-split-design.md](https://github.com/poooi/plugin-ship-info/blob/master/docs/plugin-split-design.md)
for the split design.

## License

MIT
