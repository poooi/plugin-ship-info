---
"poi-plugin-ship-info": patch
---

Make the ship-type and sally-area filter views reference-stable with narrow memoized inputs, so unrelated store updates no longer rebuild their derived objects and the current language is threaded through explicitly.

Pass the title-cell and per-cell styling flags as transient props and stop injecting the unused connection `dispatch`, so internal values no longer leak onto DOM elements.
