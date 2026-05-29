import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { IK_CHAINS, solveTwoBoneIK } from '../src/dimensions/BodyIK';

/**
 * Apply the solved LOCAL rotations through the same FK math the widget uses
 * (world.quat = parent.quat * local; a bone vector is rotated by its joint's world
 * quat) and return the resulting end-effector position. Starts from identity
 * globals/locals + identity parent, so the bind vectors are (b-a) and (c-b).
 */
function endAfterSolve(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  target: THREE.Vector3,
): THREE.Vector3 {
  const I = new THREE.Quaternion();
  const sol = solveTwoBoneIK(a, b, c, target, I.clone(), I.clone(), I.clone(), I.clone());
  const rootGlobalNew = sol.rootLocal.clone(); // parent = identity
  const newB = a.clone().add(b.clone().sub(a).applyQuaternion(rootGlobalNew));
  const midGlobalNew = rootGlobalNew.clone().multiply(sol.midLocal);
  return newB.add(c.clone().sub(b).applyQuaternion(midGlobalNew));
}

describe('solveTwoBoneIK', () => {
  // Bent chain: upper bone along +x, lower bone along -y (bends about +z).
  const a = new THREE.Vector3(0, 0, 0);
  const b = new THREE.Vector3(1, 0, 0);
  const c = new THREE.Vector3(1, -1, 0);

  it('reaches a target inside the reachable range', () => {
    for (const target of [
      new THREE.Vector3(1.2, 0.5, 0),
      new THREE.Vector3(0.3, 1.1, 0),
      new THREE.Vector3(-0.5, 0.8, 0),
      new THREE.Vector3(1.5, -0.4, 0),
    ]) {
      const end = endAfterSolve(a, b, c, target);
      expect(end.distanceTo(target)).toBeLessThan(0.02);
    }
  });

  it('straightens toward an out-of-reach target (clamped to limb length)', () => {
    const target = new THREE.Vector3(5, 0, 0); // far beyond reach (max 2)
    const end = endAfterSolve(a, b, c, target);
    // End lands ~2 units from the root, pointing at the target (straight arm).
    expect(end.distanceTo(a)).toBeGreaterThan(1.95);
    expect(end.distanceTo(a)).toBeLessThan(2.0);
    expect(end.clone().normalize().dot(new THREE.Vector3(1, 0, 0))).toBeGreaterThan(0.99);
  });

  it('preserves bone lengths after solving', () => {
    const target = new THREE.Vector3(0.6, 0.9, 0.2);
    const I = new THREE.Quaternion();
    const sol = solveTwoBoneIK(a, b, c, target, I.clone(), I.clone(), I.clone(), I.clone());
    const rootGlobalNew = sol.rootLocal.clone();
    const newB = a.clone().add(b.clone().sub(a).applyQuaternion(rootGlobalNew));
    const midGlobalNew = rootGlobalNew.clone().multiply(sol.midLocal);
    const newC = newB.clone().add(c.clone().sub(b).applyQuaternion(midGlobalNew));
    expect(newB.distanceTo(a)).toBeCloseTo(b.distanceTo(a), 5); // upper length
    expect(newC.distanceTo(newB)).toBeCloseTo(c.distanceTo(b), 5); // lower length
  });

  it('reaches the target when the limb already has a non-identity rotation (authoring case)', () => {
    // Limb posed by Q (like REST_POSE rotating the shoulder), parent identity.
    const upperBind = new THREE.Vector3(1, 0, 0);
    const lowerBind = new THREE.Vector3(0, -1, 0);
    const Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.9);
    const root = new THREE.Vector3(0, 0, 0);
    const rootGlobal = Q.clone();
    const midGlobal = Q.clone();
    const mid = root.clone().add(upperBind.clone().applyQuaternion(rootGlobal));
    const end = mid.clone().add(lowerBind.clone().applyQuaternion(midGlobal));
    const target = new THREE.Vector3(0.5, 0.8, 0.1);
    const sol = solveTwoBoneIK(root, mid, end, target, rootGlobal, midGlobal, Q.clone(), new THREE.Quaternion());
    const newRootGlobal = sol.rootLocal.clone(); // parent identity
    const newMid = root.clone().add(upperBind.clone().applyQuaternion(newRootGlobal));
    const newMidGlobal = newRootGlobal.clone().multiply(sol.midLocal);
    const newEnd = newMid.clone().add(lowerBind.clone().applyQuaternion(newMidGlobal));
    expect(newEnd.distanceTo(target)).toBeLessThan(0.02);
  });

  it('exposes the four SMPL-X limb chains', () => {
    expect(Object.keys(IK_CHAINS)).toEqual(['L_arm', 'R_arm', 'L_leg', 'R_leg']);
    expect(IK_CHAINS.L_arm).toEqual({ root: 'L_Shoulder', mid: 'L_Elbow', end: 'L_Wrist' });
    expect(IK_CHAINS.R_leg).toEqual({ root: 'R_Hip', mid: 'R_Knee', end: 'R_Ankle' });
  });
});
