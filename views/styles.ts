import { css } from 'styled-components'

/**
 * poi paints its window with `--poi-background-color` and, in vibrant mode,
 * swaps that variable for a translucent value so the desktop shows through
 * (see poi's `assets/css/blueprint-vibrant.css`). Blueprint 6 does the same for
 * control surfaces via `--bp-surface-background-color-default-*`.
 *
 * Anything in this plugin that fills a background with a flat colour of its own
 * punches an opaque hole through that vibrancy, so surfaces follow the
 * variables instead. Every helper keeps the plugin's previous flat colour as
 * the final fallback, which is what poi versions predating the variables get.
 */

/**
 * A surface that has to stay legible over whatever scrolls beneath it — a
 * sticky header, a pinned cell. The blur is a no-op while
 * `--poi-background-color` is opaque, and is what keeps the surface readable
 * once vibrant mode makes it translucent.
 */
export const stickySurface = (fallback: string) => css`
  background-color: var(--poi-background-color, ${fallback});
  backdrop-filter: blur(12px);
`

/**
 * A control that reads as a raised surface — the unchecked state of the
 * sidebar's chips and checkboxes. Mirrors how Blueprint's own buttons are
 * toned down under vibrancy.
 */
export const controlSurface = (
  state: 'rest' | 'hover' | 'active',
  fallback: string,
) => css`
  background-color: var(
    --bp-surface-background-color-default-${state},
    ${fallback}
  );
`
