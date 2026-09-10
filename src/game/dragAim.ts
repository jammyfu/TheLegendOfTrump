/** Continuous turn input near a canvas edge, independent of mousemove events.
 * Coordinates are CSS pixels local to the canvas; outside values saturate. */
export function dragAimEdge(position: number, extent: number) {
  if (!Number.isFinite(position) || !Number.isFinite(extent) || extent <= 0) return 0;
  const band = Math.min(96, extent * 0.16);
  const left = position < band;
  const right = position > extent - band;
  if (!left && !right) return 0;
  const t = Math.max(0, Math.min(1, left ? (band - position) / band : (position - extent + band) / band));
  return (left ? -1 : 1) * t * t * (3 - 2 * t);
}
