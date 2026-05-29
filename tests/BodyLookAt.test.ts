import { describe, expect, it } from 'vitest';
import { BodyLookAt } from '../src/dimensions/BodyLookAt';

describe('BodyLookAt', () => {
  const look = new BodyLookAt();

  it('returns identity rotations when the cursor is centered', () => {
    const p = look.compute(0, 0, 1, 1);
    for (const q of [p.spine3, p.neck, p.head]) {
      expect(q.w).toBeCloseTo(1);
      expect(q.x).toBeCloseTo(0);
      expect(q.y).toBeCloseTo(0);
      expect(q.z).toBeCloseTo(0);
    }
  });

  it('turns the head toward a cursor on the right (positive yaw), more than the torso', () => {
    const p = look.compute(1, 0, 1, 0); // full head tracking, no torso
    expect(p.head.y).toBeGreaterThan(0);
    expect(Math.abs(p.head.y)).toBeGreaterThan(Math.abs(p.spine3.y));
  });

  it('does not turn the head when head tracking is 0', () => {
    const p = look.compute(1, 0, 0, 0);
    expect(p.head.y).toBeCloseTo(0);
  });

  it('leans the torso only when torso tracking is on', () => {
    const noTorso = look.compute(1, 0, 1, 0);
    const withTorso = look.compute(1, 0, 1, 1);
    expect(Math.abs(withTorso.spine3.y)).toBeGreaterThan(Math.abs(noTorso.spine3.y));
  });

  it('pitches the head down for a cursor below center', () => {
    const up = look.compute(0, 1, 1, 0);
    const down = look.compute(0, -1, 1, 0);
    // pitch is about X; opposite cursor Y gives opposite-sign x components
    expect(Math.sign(up.head.x)).toBe(-Math.sign(down.head.x));
  });

  it('clamps the cursor to [-1, 1]', () => {
    const beyond = look.compute(5, 0, 1, 0);
    const edge = look.compute(1, 0, 1, 0);
    expect(beyond.head.y).toBeCloseTo(edge.head.y);
  });
});
