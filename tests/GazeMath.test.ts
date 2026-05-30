import { describe, it, expect } from 'vitest';
import { expSmooth, applyDeadzone, clampAbs } from '../src/features/GazeMath';

describe('applyDeadzone', () => {
  it('returns zero strictly inside the radius', () => {
    expect(applyDeadzone(0.03, 0, 0.06)).toEqual([0, 0]);
    expect(applyDeadzone(0.04, 0.03, 0.06)).toEqual([0, 0]); // hypot 0.05 < 0.06
    expect(applyDeadzone(0, 0, 0.06)).toEqual([0, 0]);
  });

  it('is continuous at the boundary (output -> 0 as mag -> r+)', () => {
    const r = 0.06;
    const [x] = applyDeadzone(r + 1e-4, 0, r);
    expect(Math.abs(x)).toBeLessThan(1e-3);
  });

  it('restores full range at magnitude 1', () => {
    const [x, y] = applyDeadzone(1, 0, 0.06);
    expect(Math.hypot(x, y)).toBeCloseTo(1, 6);
  });

  it('preserves direction', () => {
    const [x, y] = applyDeadzone(0.6, 0.8, 0.1); // mag 1.0, angle atan2(0.8,0.6)
    expect(Math.atan2(y, x)).toBeCloseTo(Math.atan2(0.8, 0.6), 6);
  });
});

describe('expSmooth', () => {
  it('is frame-rate independent over equal wall-clock time', () => {
    const tau = 0.18;
    const total = 0.5;
    const analytic = 1 - Math.exp(-total / tau);

    const oneStep = expSmooth(0, 1, total, tau);

    let s60 = 0;
    for (let i = 0; i < 30; i++) s60 = expSmooth(s60, 1, total / 30, tau);

    let s120 = 0;
    for (let i = 0; i < 60; i++) s120 = expSmooth(s120, 1, total / 60, tau);

    expect(oneStep).toBeCloseTo(analytic, 6);
    expect(s60).toBeCloseTo(analytic, 6);
    expect(s120).toBeCloseTo(analytic, 6);
  });

  it('converges toward the target and never overshoots', () => {
    let s = 0;
    for (let i = 0; i < 600; i++) s = expSmooth(s, 1, 1 / 60, 0.18);
    expect(s).toBeGreaterThan(0.99);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe('clampAbs', () => {
  it('clamps to the symmetric range', () => {
    expect(clampAbs(10, 0.09)).toBe(0.09);
    expect(clampAbs(-10, 0.09)).toBe(-0.09);
    expect(clampAbs(0.05, 0.09)).toBe(0.05);
  });
});
