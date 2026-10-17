---
"poi-plugin-ship-info": patch
"poi-plugin-navy-staff": patch
---

Package each plugin independently with Vite+ and tsdown. Bundle shared plugin
code while keeping poi-provided UI libraries external, and include each
plugin's own translations and resources.

Tie saved-state loading and queued writes to the plugin lifecycle. Add explicit
saved-file format versions and ordered migrations for older data; Ship Info
retains legacy planner data for Navy Staff to import.
