export type CharacterJointRotation = [number, number, number];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** A planted, counter-swinging gait for the pivot-rigged hero. */
export function locomotionPose(
  elapsed: number,
  moving: boolean,
  sprinting: boolean,
) {
  if (!moving)
    return {
      bob: 0,
      leftLeg: 0,
      rightLeg: 0,
      leftKnee: 0,
      rightKnee: 0,
      leftArm: 0,
      rightArm: 0,
      leftElbow: -0.12,
      rightElbow: -0.12,
      waist: [0, 0, 0] as CharacterJointRotation,
    };

  const cadence = sprinting ? 14.5 : 10.5;
  const stride = sprinting ? 1.02 : 0.68;
  const phase = Math.sin(elapsed * cadence);
  const leftLift = Math.max(0, -phase);
  const rightLift = Math.max(0, phase);
  return {
    // Sprint includes a visible flight phase between alternating contacts.
    bob:
      Math.max(0, Math.cos(elapsed * cadence * 2)) *
      (sprinting ? 0.24 : 0.07),
    leftLeg: phase * stride,
    rightLeg: -phase * stride,
    leftKnee: Math.pow(leftLift, 0.75) * (sprinting ? 1.42 : 0.96),
    rightKnee: Math.pow(rightLift, 0.75) * (sprinting ? 1.42 : 0.96),
    leftArm: -phase * stride * 0.72 - (sprinting ? 0.18 : 0),
    rightArm: phase * stride * 0.72 - (sprinting ? 0.18 : 0),
    leftElbow: -0.16 - rightLift * (sprinting ? 0.48 : 0.3),
    rightElbow: -0.16 - leftLift * (sprinting ? 0.48 : 0.3),
    waist: [
      sprinting ? 0.14 : 0.045,
      phase * (sprinting ? 0.105 : 0.065),
      phase * (sprinting ? 0.035 : 0.02),
    ] as CharacterJointRotation,
  };
}

/** Forward somersault around the pelvis, with anticipation, tuck and landing. */
export function rollPose(remaining: number, duration = 0.55) {
  const progress = clamp01(1 - remaining / duration);
  const rotationProgress = smooth(progress);
  const tuck = Math.pow(Math.sin(progress * Math.PI), 0.72);
  const landing = smooth((progress - 0.78) / 0.22);
  return {
    progress,
    rootPitch: Math.PI * 2 * rotationProgress,
    pivotHeight: 1.08 - landing * 0.08,
    waist: [0.22 + tuck * 0.32, 0, 0] as CharacterJointRotation,
    leftLeg: -0.42 - tuck * 0.52,
    rightLeg: -0.42 - tuck * 0.52,
    leftKnee: 0.65 + tuck * 1.05 - landing * 0.25,
    rightKnee: 0.65 + tuck * 1.05 - landing * 0.25,
    leftArm: -0.82 - tuck * 0.32,
    rightArm: -0.82 - tuck * 0.32,
    leftElbow: -0.62 - tuck * 0.35,
    rightElbow: -0.62 - tuck * 0.35,
    headPitch: -tuck * 0.28,
  };
}
