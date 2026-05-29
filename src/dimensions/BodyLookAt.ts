import * as THREE from 'three';
import type { BoneInfo } from '../renderer/SparkSetup';

const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

/** Local rotation that yaws about +Y then pitches about +X (look toward cursor). */
function yawPitch(yaw: number, pitch: number): THREE.Quaternion {
  return new THREE.Quaternion()
    .setFromAxisAngle(AXIS_Y, yaw)
    .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_X, -pitch));
}

/**
 * Resting pose as LOCAL joint rotations. LHM bakes the body in the SMPL-X zero pose
 * (arms straight out, a T). FK rotates the shoulders down so the arms relax at the
 * sides — applied as a local rotation about the forward (Z) axis at each shoulder.
 */
export const REST_POSE: ReadonlyMap<string, THREE.Quaternion> = new Map([
  // Rotate the (baked T-pose) arms down to the sides (~1.25 rad). The photo-mesh arms
  // stretch under this rotation, so bodies are framed head-to-hips by default, which
  // crops the stretched lower-arms; zoom out (editor radius) to pose, accepting the
  // softness on extended limbs.
  ['L_Shoulder', new THREE.Quaternion().setFromAxisAngle(AXIS_Z, -1.25)],
  ['R_Shoulder', new THREE.Quaternion().setFromAxisAngle(AXIS_Z, 1.25)],
  ['L_Elbow', new THREE.Quaternion().setFromAxisAngle(AXIS_Z, -0.15)],
  ['R_Elbow', new THREE.Quaternion().setFromAxisAngle(AXIS_Z, 0.15)],
]);

export interface PosedBone {
  quat: THREE.Quaternion;
  pos: THREE.Vector3;
}

/**
 * SMPL-X forward kinematics: compose per-joint LOCAL rotations down the tree into
 * WORLD (rotation, position) per bone, ready for Spark's `setBoneQuatPos`. Bones
 * arrive in skeleton order (parent index < child index), so a single pass suffices.
 * A joint's local rotation rotates its descendants about it — exactly what LBS needs.
 */
export function forwardKinematics(
  bones: BoneInfo[],
  localRots: ReadonlyMap<string, THREE.Quaternion>,
): Map<number, PosedBone> {
  const world = new Map<number, PosedBone>();
  const identity = new THREE.Quaternion();
  for (const bone of bones) {
    const local = localRots.get(bone.name) ?? identity;
    if (bone.parentIdx < 0) {
      world.set(bone.idx, { quat: local.clone(), pos: new THREE.Vector3(...bone.pos) });
      continue;
    }
    const parent = world.get(bone.parentIdx);
    if (!parent) continue; // out-of-order parent (shouldn't happen for SMPL-X)
    const parentBone = bones[bone.parentIdx];
    const offset = new THREE.Vector3(...bone.pos).sub(new THREE.Vector3(...parentBone.pos)).applyQuaternion(parent.quat);
    world.set(bone.idx, {
      quat: parent.quat.clone().multiply(local),
      pos: parent.pos.clone().add(offset),
    });
  }
  return world;
}

/**
 * Head + torso look-at toward the cursor, as LOCAL joint rotations (FK composes
 * them, so the head turns as a whole and the jaw/eyes inherit it automatically).
 * The turn is split across neck + head for a natural arc; the torso leans subtly.
 */
export class BodyLookAt {
  localRotations(ndcX: number, ndcY: number, headTrack: number, torsoTrack: number): Map<string, THREE.Quaternion> {
    const cx = Math.max(-1, Math.min(1, ndcX));
    const cy = Math.max(-1, Math.min(1, ndcY));
    return new Map<string, THREE.Quaternion>([
      ['Spine_3', yawPitch(cx * 0.1 * torsoTrack, cy * 0.05 * torsoTrack)],
      ['Neck', yawPitch(cx * 0.22 * headTrack, cy * 0.12 * headTrack)],
      ['Head', yawPitch(cx * 0.22 * headTrack, cy * 0.12 * headTrack)],
    ]);
  }
}
