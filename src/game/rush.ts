export type RushKind = 'thrust' | 'shield' | 'punch';
export const RUSH = {
  punch: { staminaThreshold: 24, cost: 16, duration: .66, launch: .12, end: .43, speed: 14 },
  thrust: { staminaThreshold: 60, cost: 26, duration: .9, launch: .4, end: .72, speed: 18 },
  shield: { staminaThreshold: 70, cost: 30, duration: .64, launch: .09, end: .46, speed: 13 },
} as const;
export const SHIELD_REBOUND = { duration: .3, speed: 5.5 } as const;
export function rushPose(kind: RushKind, remaining: number, rebounding = false) {
  if (kind === 'shield' && rebounding) {
    const t = 1-Math.max(0,Math.min(1,remaining/SHIELD_REBOUND.duration));
    return { elapsed: t*SHIELD_REBOUND.duration, active: false, flip: 0,
      lift: .09*Math.sin(t*Math.PI), speed: t < 1 ? -SHIELD_REBOUND.speed*(1-t)**1.5 : 0 };
  }
  const spec = RUSH[kind];
  const elapsed = Math.max(0, spec.duration-remaining);
  const active = elapsed >= spec.launch && elapsed < spec.end;
  const flip = kind === 'thrust' ? Math.max(0,Math.min(1,(elapsed-.04)/.36)) : 0;
  const smoothFlip = flip*flip*(3-2*flip);
  return { elapsed, active, flip: smoothFlip,
    lift: kind === 'thrust' ? Math.sin(flip*Math.PI)*.8 : 0,
    speed: active ? spec.speed*(1-.3*(elapsed-spec.launch)/(spec.end-spec.launch)) : 0 };
}
/** The same planted two-hand brace continues through impact and spring-back. */
export function shieldBracePose(remaining:number, rebounding:boolean) {
  const pose=rushPose('shield',remaining,rebounding);
  const t=rebounding ? Math.min(1,pose.elapsed/SHIELD_REBOUND.duration) : 0;
  const drive=rebounding ? 1-t : Math.min(1,pose.elapsed/RUSH.shield.launch,remaining/.18);
  const recoil=rebounding ? Math.sin(t*Math.PI) : 0;
  return { pitch:.4*drive-.45*recoil, crouch:.12*drive,
    lift:pose.lift, shieldForward:.7-.12*recoil,
    rightLeg:.65*drive-.3*recoil, leftLeg:-.5*drive+.25*recoil,
    knee:.3+.35*drive+.2*recoil };
}
/** Sideways strafing still attacks the lock; deliberate retreat overrides it. */
export function rushHeading(mx:number,mz:number,dx:number,dz:number) {
  const d = Math.hypot(dx,dz), length = Math.hypot(mx,mz);
  const assist = d>.15 && length>.1 && (mx*dx+mz*dz)/(length*d) >= -.45;
  return { assist, yaw: assist ? Math.atan2(dx,dz) : Math.atan2(mx,mz) };
}
