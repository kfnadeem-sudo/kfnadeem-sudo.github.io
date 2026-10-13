// The machines expose their turntable angle in slightly different ways. These two helpers hide that,
// so the flipbook and the live machine can hand over at exactly the same angle.
const norm = (a) => ((a % 360) + 360) % 360;

/** The machine's current angle in degrees, 0-360. */
export function readAngle(h) {
  const a = h?.state?.angle ?? h?._state?.().angle ?? 0;
  return norm(Number(a) || 0);
}

/** Jump (no turn animation) to an angle. */
export function jumpAngle(h, deg) {
  if (!h) return;
  if (typeof h._set === "function") h._set({ angle: deg });
  else if (typeof h.setAngle === "function") h.setAngle(deg, { instant: true });
}
