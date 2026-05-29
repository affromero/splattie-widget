import { describe, it, expect } from 'vitest';
import { Saccade } from '../src/features/Saccade';

describe('Saccade', () => {
  it('never exceeds the configured amplitude', () => {
    const amplitude = 0.04;
    const s = new Saccade({ amplitude });
    for (let i = 0; i < 3000; i++) {
      const { x, y } = s.update(1 / 60, 0);
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(amplitude + 1e-6);
    }
  });

  it('is fully suppressed at suppression = 1', () => {
    const s = new Saccade({ amplitude: 0.04 });
    for (let i = 0; i < 500; i++) {
      const { x, y } = s.update(1 / 60, 1);
      expect(Math.hypot(x, y)).toBe(0);
    }
  });

  it('produces no offset when disabled', () => {
    const s = new Saccade({ enabled: false, amplitude: 0.04 });
    for (let i = 0; i < 500; i++) {
      const { x, y } = s.update(1 / 60, 0);
      expect(Math.hypot(x, y)).toBe(0);
    }
  });

  it('actually moves the eyes over time when active', () => {
    const s = new Saccade({ amplitude: 0.04, intervalMs: [100, 100], moveMs: 30 });
    let maxMag = 0;
    for (let i = 0; i < 600; i++) {
      const { x, y } = s.update(1 / 60, 0);
      maxMag = Math.max(maxMag, Math.hypot(x, y));
    }
    expect(maxMag).toBeGreaterThan(0);
  });
});
