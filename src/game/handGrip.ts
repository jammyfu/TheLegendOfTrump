import { Object3D, Quaternion, Vector3 } from 'three';
const origin=new Vector3(), tip=new Vector3(), desired=new Vector3();
const turn=new Quaternion(), parent=new Quaternion(), local=new Quaternion();
/** Rotate the existing arm joints; never detach or translate the hand mesh. */
export function fitHand(shoulder:Object3D, elbow:Object3D, wrist:Object3D, target:Vector3) {
  for(let pass=0;pass<12;pass++) {
    for(const joint of [elbow,shoulder]) {
      joint.updateWorldMatrix(true,true);
      joint.getWorldPosition(origin); wrist.getWorldPosition(tip);
      tip.sub(origin); desired.copy(target).sub(origin);
      if(tip.lengthSq()<1e-8 || desired.lengthSq()<1e-8) continue;
      turn.setFromUnitVectors(tip.normalize(),desired.normalize());
      joint.parent!.getWorldQuaternion(parent);
      local.copy(parent).invert().multiply(turn).multiply(parent);
      joint.quaternion.premultiply(local).normalize();
    }
  }
  shoulder.updateWorldMatrix(true,true);
}
const shieldTarget=new Vector3(), shieldOrientation=new Quaternion();
/** Wrist anchors leave the fists wrapped around the rear strap, not in the face. */
export const SHIELD_HANDS = { left: [.2,.16,-.18], right: [-.2,.16,-.18] } as const;
export function fitShieldHand(shoulder:Object3D, elbow:Object3D, wrist:Object3D,
  shield:Object3D, side:keyof typeof SHIELD_HANDS) {
  const [x, y, z] = SHIELD_HANDS[side];
  shieldTarget.set(x, y, z);
  shield.localToWorld(shieldTarget);
  fitHand(shoulder,elbow,wrist,shieldTarget);
  wrist.parent!.getWorldQuaternion(parent).invert();
  shield.getWorldQuaternion(shieldOrientation);
  wrist.quaternion.copy(parent).multiply(shieldOrientation);
}
