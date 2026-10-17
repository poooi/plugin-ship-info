---
"poi-plugin-ship-info": major
---

Move the built-in Deck Planner to the separate **Navy Staff** plugin
(`poi-plugin-navy-staff`). Ship Info continues to provide the ship information
table, filters, column settings, bookmarks, and CSV export.

The former planner area now explains the move. Install Navy Staff from poi's
**Settings → Plugins** list when available, or use **Install directly from npm**
with `poi-plugin-navy-staff` after the planner release is published.

Ship Info preserves the old planner data in its saved file. Navy Staff imports
that plan when it first creates an account file, leaving the Ship Info source
untouched. Users who rely on the planner need to install Navy Staff separately.
