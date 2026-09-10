export const BOSS_VFX = { duration: 1.05, layers: 3, delay: .105, rippleDuration: .8 } as const;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
/** A stronger, short hammer-only impulse; the camera's opt-out remains in charge. */
export const hammerShake=(distance:number)=>2.8*clamp(1-distance/15);
/** Decorative slam ripples are not extra damage waves. Delays make the fluid
 * crest separate from the brief golden contact flash instead of one white disc. */
export function slamRipple(age:number,layer:number) {
  const local=age-layer*BOSS_VFX.delay;
  const t=clamp(local/BOSS_VFX.rippleDuration);
  return { visible:local>=0&&t<1, radius:.55+(1-(1-t)**2)*(5.3-layer*.55),
    width:.35+.65*(1-t), height:Math.sin(t*Math.PI)*.26,
    opacity:Math.sin(Math.PI*clamp(local/.07)*.5)*(1-t)**1.4*(.68-layer*.12) };
}
export function slamBurst(age:number) {
  const t=clamp(age/BOSS_VFX.duration);
  return { size:2.4+3*(1-(1-clamp(age/.24))**3),
    opacity:(1-t)**2*.85, flash:Math.max(0,1-age/.2)**2*.7 };
}
