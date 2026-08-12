// Shared plumbing for the glyph-grid candidates (K and L) — the ones that
// render the wave field as a field of characters rather than dots, after
// Alessandro's Processing "kraftwerk" sketch.
//
// The whole reason this file exists is `ctx.font`. Assigning it forces a
// font-shorthand parse, and a 26×26 grid would do that 676 times a frame.
// Instead we quantize glyph size into a fixed ramp of steps, then draw one
// step at a time — the font is set once per step, not once per cell.

/**
 * The app's mono stack, resolved from the CSS custom property so the canvas
 * matches the surrounding chrome. `ctx.font` can't read `var()` itself.
 */
export function monoFontStack(): string {
  const declared = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-mono")
    .trim();
  return declared
    ? `${declared}, ui-monospace, monospace`
    : "ui-monospace, monospace";
}

/**
 * Pre-built `ctx.font` strings, smallest to largest. Index into this with
 * `sizeStep()` and assign once per step while drawing.
 */
export function buildFontRamp(
  minPx: number,
  maxPx: number,
  steps: number,
): string[] {
  const family = monoFontStack();
  const ramp: string[] = [];
  for (let s = 0; s < steps; s++) {
    const px = minPx + ((maxPx - minPx) * s) / (steps - 1);
    ramp.push(`${px.toFixed(1)}px ${family}`);
  }
  return ramp;
}

/** Quantize a 0–1 magnitude to a ramp index. */
export function sizeStep(t: number, steps: number): number {
  const s = Math.round(t * (steps - 1));
  return s < 0 ? 0 : s > steps - 1 ? steps - 1 : s;
}
