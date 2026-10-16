# poi-plugin-navy-staff

Navy Staff plugin for [poi](https://github.com/poooi/poi).

Chinese display name: **作战参谋** (Simplified Chinese) / **作戰參謀**
(Traditional Chinese). The package name remains `poi-plugin-navy-staff`.

Plans which ship girls to send to each sortie area, with an area view and a ship
grid view, add/move/remove (including tag synchronization with the host), and
an image export in detached windows.

The main view shows the planner tabs directly. It owns its own plugin state and
saved file (`poi-plugin-navy-staff.json`) and imports an existing sortie plan
from Ship Info's legacy data the first time it runs.

## Install

The npm package `poi-plugin-navy-staff` already exists as a placeholder. The
planner implementation in this repository has not yet been released there.

Once the planner release is available and Navy Staff is added to poi's plugin
list, open **Settings → Plugins**, find **Navy Staff** and click **Install**.
For manual installation, use **Install directly from npm**, enter
`poi-plugin-navy-staff` and click **Install**. Manual installation also requires
the planner implementation to have been released.

poi provides React, Redux, Blueprint and the other host UI libraries at runtime;
this package bundles the rest of its implementation.

## Development

Developed in the repository's pnpm workspace. See the repository
[README](https://github.com/poooi/plugin-ship-info#readme) for commands and
[docs/plugin-split-design.md](https://github.com/poooi/plugin-ship-info/blob/master/docs/plugin-split-design.md)
for the split design.

## License

MIT
