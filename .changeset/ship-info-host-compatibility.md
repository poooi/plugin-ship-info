---
"poi-plugin-ship-info": patch
---

Update the ship table to TanStack Table 9 and refresh its virtualization and
state dependencies. Keep column controls aligned with poi's Blueprint styling
by using the host's class names, and remove obsolete derived table data so
filters and rows use the current host state directly.
