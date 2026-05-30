import * as THREE from 'three';
import type { BoneInfo } from '../renderer/SparkSetup';

const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);

/** Local rotation that yaws about +Y then pitches about +X (look toward cursor). */
function yawPitch(yaw: number, pitch: number): THREE.Quaternion {
  return new THREE.Quaternion()
    .setFromAxisAngle(AXIS_Y, yaw)
    .multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_X, -pitch));
}

/**
 * Resting pose as LOCAL joint rotations. The backend now bakes the body into the
 * *photographed* pose at export time (the SMPL-X body pose puts the arms at the
 * sides) and ships the matching posed skeleton, so the rest pose is the IDENTITY —
 * no shoulder-down rotation, and therefore no LBS stretch of the lower arms.
 *
 * Kept as an (empty) map so the look-at / IK code can still ask for a joint's resting
 * rotation; every lookup falls back to identity (see Interpolator.restQuat).
 */
export const REST_POSE: ReadonlyMap<string, THREE.Quaternion> = new Map();

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
