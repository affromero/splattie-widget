import * as THREE from 'three';

export interface BodyLookAtPose {
  /** World-space rotation for the Spine_3 (torso) joint. */
  spine3: THREE.Quaternion;
  /** World-space rotation for the Neck joint (inherits torso). */
  neck: THREE.Quaternion;
  /** World-space rotation for the Head joint (inherits neck). */
  head: THREE.Quaternion;
}

/** Head + torso look-at toward the cursor — the body analog of the head's
 * eyes-follow-cursor. Distributes a gaze rotation down the spine chain: the torso
 * (Spine_3) leans subtly, the neck and head turn progressively more so the figure
 * faces the cursor. Returns WORLD-space (FK-composed) quaternions ready for Spark's
 * `setBoneQuatPos`. Rotations stay small, so each joint pivots about its rest
 * position (the A-pose the bundle bakes is rest for this upper chain). */
export class BodyLookAt {
  compute(ndcX: number, ndcY: number, headTrack: number, torsoTrack: number): BodyLookAtPose {
    const cx = Math.max(-1, Math.min(1, ndcX));
    const cy = Math.max(-1, Math.min(1, ndcY));

    const spine3 = yawPitch(cx * 0.12 * torsoTrack, cy * 0.06 * torsoTrack);
    const neck = spine3.clone().multiply(yawPitch(cx * 0.18 * headTrack, cy * 0.1 * headTrack));
    const head = neck.clone().multiply(yawPitch(cx * 0.27 * headTrack, cy * 0.15 * headTrack));
    return { spine3, neck, head };
  }
}

/** Quaternion that yaws about +Y then pitches about +X (look toward the cursor). */
function yawPitch(yaw: number, pitch: number): THREE.Quaternion {
  const q = new THREE.Quaternion();
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch));
  return q;
}
