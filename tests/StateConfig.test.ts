import { describe, it, expect } from 'vitest';
import { createDefaultConfig, mergeWithDefaults } from '../src/state/StateConfig';
import type { WidgetConfig } from '../src/types';

// Partial configs arrive from untyped JSON (.splattie states.json / loadConfig),
// so they may carry a shallow `defaults`. These tests pin the defensive deep-merge.
const loose = (o: object): Partial<WidgetConfig> => o as unknown as Partial<WidgetConfig>;

describe('createDefaultConfig', () => {
  it('ships subtle-but-alive gaze defaults', () => {
    const g = createDefaultConfig().defaults.gaze;
    expect(g.intensity).toBe(1.0);
    expect(g.deadzone).toBeGreaterThan(0);
    expect(g.saccade.enabled).toBe(true);
  });

  it('uses body-specific camera and tracking defaults for body bundles', () => {
    const body = createDefaultConfig('body');
    expect(body.defaults.camera).toMatchObject({ phi: 90, radius: 2.4, fov: 45 });
    expect(body.states.idle.tracking).toMatchObject({ head: 1.0, torso: 0.3 });
    expect(body.states.idle.expression).toEqual({});
  });
});

describe('mergeWithDefaults', () => {
  it('keeps full gaze defaults when a partial overrides only defaults.camera', () => {
    const merged = mergeWithDefaults(loose({ defaults: { camera: { theta: 10, phi: 80, radius: 3 } } }));
    expect(merged.defaults.gaze.intensity).toBe(1.0);
    expect(merged.defaults.gaze.maxEyeYaw).toBeCloseTo(0.09);
    expect(merged.defaults.gaze.saccade.amplitude).toBeCloseTo(0.04);
  });

  it('deep-merges a partial gaze.intensity without dropping saccade defaults', () => {
    const merged = mergeWithDefaults(loose({ defaults: { gaze: { intensity: 2 } } }));
    expect(merged.defaults.gaze.intensity).toBe(2);
    expect(merged.defaults.gaze.deadzone).toBeCloseTo(0.06);
    expect(merged.defaults.gaze.saccade.enabled).toBe(true);
  });
});
