export const PICKUP_DURATION = 1.6;
export type PickupItem = 'sword' | 'shield' | 'bow' | 'treasure' | 'wood-sword' | 'wood-shield';
export const PICKUP_LABELS: Record<PickupItem, string> = {
  'wood-sword': '获得木剑', 'wood-shield': '获得木盾',
  sword: '获得冒险剑', shield: '获得盾牌', bow: '获得冒险弓', treasure: '获得花园秘藏',
};
export function pickupEnvelope(remaining: number) {
  const elapsed = PICKUP_DURATION - remaining;
  const t = Math.max(0, Math.min(1, elapsed / .28, remaining / .4));
  return t*t*(3-2*t);
}
// Original short rising phrase, not a transcription of another game's cue.
export const PICKUP_NOTES = [392, 493.88, 659.25, 587.33, 783.99];
