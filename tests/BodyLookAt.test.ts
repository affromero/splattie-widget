import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BodyLookAt, forwardKinematics, REST_POSE } from '../src/dimensions/BodyLookAt';
import type { BoneInfo } from '../src/renderer/SparkSetup';

describe('BodyLookAt.localRotations', () => {
  const look = new BodyLookAt();

  it('returns identity rotations when the cursor is centered', () => {
    for (const q of look.localRotations(0, 0, 1, 1).values()) {
      expect(q.w).toBeCloseTo(1);
      expect(q.y).toBeCloseTo(0);
    }
  });

  it('yaws the head toward a cursor on the right (positive Y component)', () => {
    expect(look.localRotations(1, 0, 1, 0).get('Head')!.y).toBeGreaterThan(0);
  });

  it('does not turn the head when head tracking is 0', () => {
    expect(look.localRotations(1, 0, 0, 0).get('Head')!.y).toBeCloseTo(0);
  });

  it('clamps the cursor to [-1, 1]', () => {
    const beyond = look.localRotations(5, 0, 1, 0).get('Head')!.y;
    const edge = look.localRotations(1, 0, 1, 0).get('Head')!.y;
    expect(beyond).toBeCloseTo(edge);
  });
});

describe('forwardKinematics', () => {
  // A minimal chain: root -> mid -> tip, each 1 unit apart along +Y.
  const bones: BoneInfo[] = [
    { name: 'root', pos: [0, 0, 0], idx: 0, parentIdx: -1 },
    { name: 'mid', pos: [0, 1, 0], idx: 1, parentIdx: 0 },
    { name: 'tip', pos: [0, 2, 0], idx: 2, parentIdx: 1 },
  ];

  it('leaves world positions at rest under the identity pose', () => {
    const world = forwardKinematics(bones, new Map());
    expect(world.get(2)!.pos.toArray().map((v) => Math.round(v))).toEqual([0, 2, 0]);
  });

  it('swings a child about its parent when the parent rotates', () => {
    // Rotate 'mid' +90° about Z: the tip (offset [0,1,0]) swings to ~[-1,1,0].
    const pose = new Map([['mid', new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)]]);
    const tip = forwardKinematics(bones, pose).get(2)!.pos;
    expect(tip.x).toBeCloseTo(-1, 1);
    expect(tip.y).toBeCloseTo(1, 1);
  });
});

describe('REST_POSE', () => {
  it('is empty/identity (bodies are baked into their photographed rest pose)', () => {
    // The backend bakes the arms-down pose into the gaussians and ships the matching
    // posed skeleton, so the widget applies no rest rotation (FK from identity).
    expect(REST_POSE.size).toBe(0);
  });
});
