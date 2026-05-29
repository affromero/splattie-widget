import { describe, it, expect } from 'vitest';
import { toHalf, halfToFloat } from '../src/features/half';

describe('half-float round trip', () => {
  it('round-trips representative values within half precision', () => {
    // Head-coordinate range; half has ~3 decimal digits, so tolerate ~1e-3 relative.
    for (const v of [0, 0.5, -0.5, 0.123, -0.0163, 0.3, -0.28, 1, -1, 2.5]) {
      const back = halfToFloat(toHalf(v));
      expect(back).toBeCloseTo(v, 2);
    }
  });

  it('handles exact zero', () => {
    expect(halfToFloat(toHalf(0))).toBe(0);
  });

  it('decodes known half bit patterns', () => {
    expect(halfToFloat(0x3c00)).toBeCloseTo(1, 6); // 1.0
    expect(halfToFloat(0x4000)).toBeCloseTo(2, 6); // 2.0
    expect(halfToFloat(0xc000)).toBeCloseTo(-2, 6); // -2.0
    expect(halfToFloat(0x3800)).toBeCloseTo(0.5, 6); // 0.5
  });

  it('preserves sign through the round trip', () => {
    expect(halfToFloat(toHalf(-0.25))).toBeLessThan(0);
    expect(halfToFloat(toHalf(0.25))).toBeGreaterThan(0);
  });
});
