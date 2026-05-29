import * as THREE from 'three';

/** A two-bone limb: root → mid → end (e.g. shoulder → elbow → wrist). */
export interface IKChain {
  root: string;
  mid: string;
  end: string;
}

/** SMPL-X limbs reachable by two-bone IK (end-effectors are the wrists / ankles). */
export const IK_CHAINS: Record<string, IKChain> = {
  L_arm: { root: 'L_Shoulder', mid: 'L_Elbow', end: 'L_Wrist' },
  R_arm: { root: 'R_Shoulder', mid: 'R_Elbow', end: 'R_Wrist' },
  L_leg: { root: 'L_Hip', mid: 'L_Knee', end: 'L_Ankle' },
  R_leg: { root: 'R_Hip', mid: 'R_Knee', end: 'R_Ankle' },
};

export interface TwoBoneSolution {
  rootLocal: THREE.Quaternion;
  midLocal: THREE.Quaternion;
}

const clampCos = (x: number): number => Math.max(-1, Math.min(1, x));

/** World-space axis expressed in the bone's local frame. */
function toLocalAxis(globalRot: THREE.Quaternion, worldAxis: THREE.Vector3): THREE.Vector3 {
  return worldAxis.clone().applyQuaternion(globalRot.clone().invert());
}

/**
 * Analytic two-bone IK (Daniel Holden's two-joint formulation). Given the current
 * world positions of the root/mid/end joints, the current world (global) and local
 * rotations of the root + mid joints, and a world-space target, returns updated
 * LOCAL rotations for the root and mid so the end effector reaches the target
 * (or points at it, clamped, when out of reach). The limb bends in its current
 * plane, so the mid joint keeps its natural bend direction.
 */
export function solveTwoBoneIK(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  target: THREE.Vector3,
  rootGlobal: THREE.Quaternion,
  midGlobal: THREE.Quaternion,
  rootLocal: THREE.Quaternion,
  midLocal: THREE.Quaternion,
  eps = 0.01,
): TwoBoneSolution {
  const lab = b.distanceTo(a);
  const lcb = b.distanceTo(c);
  const lat = THREE.MathUtils.clamp(target.distanceTo(a), eps, lab + lcb - eps);

  const ca = c.clone().sub(a);
  const ba = b.clone().sub(a);
  const ab = a.clone().sub(b);
  const cb = c.clone().sub(b);
  const ta = target.clone().sub(a);

  // Interior angles now, and the angles needed to reach the target (law of cosines).
  const acAb0 = Math.acos(clampCos(ca.clone().normalize().dot(ba.clone().normalize())));
  const baBc0 = Math.acos(clampCos(ab.clone().normalize().dot(cb.clone().normalize())));
  const acAt0 = Math.acos(clampCos(ca.clone().normalize().dot(ta.clone().normalize())));
  const acAb1 = Math.acos(clampCos((lab * lab + lat * lat - lcb * lcb) / (2 * lab * lat)));
  const baBc1 = Math.acos(clampCos((lab * lab + lcb * lcb - lat * lat) / (2 * lab * lcb)));

  // Bend plane normal; fall back to a stable axis if the limb is nearly straight.
  let axis0 = ca.clone().cross(ba);
  if (axis0.lengthSq() < 1e-8) axis0 = ca.clone().cross(new THREE.Vector3(0, 0, 1));
  if (axis0.lengthSq() < 1e-8) axis0 = ca.clone().cross(new THREE.Vector3(0, 1, 0));
  axis0.normalize();
  // Aim plane normal (rotate root→end onto root→target).
  let axis1 = ca.clone().cross(ta);
  if (axis1.lengthSq() < 1e-8) axis1 = axis0.clone();
  axis1.normalize();

  const r0 = new THREE.Quaternion().setFromAxisAngle(toLocalAxis(rootGlobal, axis0), acAb1 - acAb0);
  const r1 = new THREE.Quaternion().setFromAxisAngle(toLocalAxis(midGlobal, axis0), baBc1 - baBc0);
  const r2 = new THREE.Quaternion().setFromAxisAngle(toLocalAxis(rootGlobal, axis1), acAt0);

  return {
    rootLocal: rootLocal.clone().multiply(r0).multiply(r2),
    midLocal: midLocal.clone().multiply(r1),
  };
}
