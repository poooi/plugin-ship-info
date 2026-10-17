---
"poi-plugin-navy-staff": patch
---

Organize Navy Staff into Plan, Reference, and Share pages, with history and game updates inside Plan. Use compact navigation buttons and a view selector to distinguish plugin navigation from poi's tabs. Improve readability with responsive ship cards and roomier area panels, clarify area label choices, and fix share hints in poi's translation loader. Keep opened references independent from generated share text. Simplify sharing and reference layouts, place feedback beside the relevant controls, and fix text copying with newer Electron versions. Support kana, romaji, and fuzzy ship search. Unify image sharing with the decoded reference's area, list, and grid views, and replace the image renderer to support modern CSS colors and full-height captures in main and detached windows.

Group shared ship cards by captured area and omit visible ship IDs from all shared views and images.

Close the gap above the sticky planning filters so scrolled cards cannot peek through below the navigation.

Keep the planning list in stable level order, clear selection after applying assignments, and tint assigned rows. Add roomier page navigation and accessible icon-only view switches, clarify original/translated area labels, and tailor help to the selected view.

Suggest meaningful PNG filenames using the plan title, view, and save time.

Add area-color markers to planning list rows, rename the sharing entry to Start sharing, remove redundant area-label help, and add a Paste button to the reference form.

Keep list batch actions sticky with their filters. Show current fleet-number icons in every planning view without including them in history or sharing.
