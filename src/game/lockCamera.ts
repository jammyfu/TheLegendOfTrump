/** Acquisition/release hysteresis lets an existing lock survive retreating. */
export const LOCK_CAMERA = {
  acquire: 22,
  release: 30,
  recover: 27,
  grace: 0.65,
  deadzone: Math.PI / 30,
  maxSpeed: Math.PI * 0.85,
};

export function lockRangeTime(distance: number, previous: number, dt: number) {
  if (distance < LOCK_CAMERA.recover) return 0;
  return distance > LOCK_CAMERA.release || previous > 0 ? previous + dt : 0;
}

/** Shortest arc, deadzone and a speed cap protect close passes behind us. */
export function followLockYaw(
  current: number,
  desired: number,
  distance: number,
  dt: number,
) {
  if (distance < 0.85) return current;
  const error = Math.atan2(
    Math.sin(desired - current),
    Math.cos(desired - current),
  );
  const overflow = Math.max(0, Math.abs(error) - LOCK_CAMERA.deadzone);
  const step = Math.min(
    overflow * (1 - Math.exp(-4.5 * dt)),
    LOCK_CAMERA.maxSpeed * dt,
  );
  return current + Math.sign(error) * step;
}
