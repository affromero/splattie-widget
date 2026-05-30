import type { CameraConfig, StateDefinition, WidgetConfig } from '../types';
import { DEFAULT_SACCADE_CONFIG } from '../features/Saccade';

const DEFAULT_CAMERA: CameraConfig = { theta: 0, phi: 75, radius: 2.5, lookAt: 'auto', fov: 50 };

const DEFAULT_STATE: StateDefinition = {
  ghost: { amplitude: 0.005, frequency: 0.5, wobble: 0.35, driftYaw: 0.012 },
  expression: {},
  camera: DEFAULT_CAMERA,
  rotation: [0, 0, 0],
  tracking: { eyes: 1.0, head: 0.0 },
};

export type AssetType = 'head' | 'body' | 'object';

const BODY_CAMERA: CameraConfig = { theta: 0, phi: 90, radius: 2.4, lookAt: 'auto', fov: 45 };

/** Body default config: head/torso look-at tracking, no FLAME expressions, framed
 * for a standing figure. Mirrors bundle.py's DEFAULT_STATES_BODY so a body bundle's
 * states.json (and the editor) resolve consistent defaults. */
function createBodyConfig(): WidgetConfig {
  return {
    defaults: {
      camera: BODY_CAMERA,
      // Bodies use head/torso look-at (BodyLookAt), not the eye-gaze system, but the
      // config type requires a gaze block; these defaults are inert for bodies.
      gaze: {
        intensity: 1.0,
        smoothingTau: 0.18,
        deadzone: 0.06,
        maxEyeYaw: 0.09,
        maxEyePitch: 0.04,
        maxNeckYaw: 0.08,
        maxNeckPitch: 0.05,
        saccade: { ...DEFAULT_SACCADE_CONFIG, intervalMs: [...DEFAULT_SACCADE_CONFIG.intervalMs] },
      },
    },
    states: {
      idle: {
        ghost: { amplitude: 0.004, frequency: 0.3, wobble: 0.2 },
        expression: {},
        camera: BODY_CAMERA,
        rotation: [0, 0, 0],
        tracking: { head: 1.0, torso: 0.3 },
      },
      hover: {
        ghost: { amplitude: 0.006, frequency: 0.5, wobble: 0.3 },
        expression: {},
        camera: { theta: 0, phi: 90, radius: 2.2, fov: 45 },
        rotation: [0, 0, 0],
        tracking: { head: 1.0, torso: 0.5 },
      },
      click: {
        ghost: { amplitude: 0.002, frequency: 0.8, wobble: 0.1 },
        expression: {},
        camera: { theta: 0, phi: 88, radius: 2.0, fov: 48 },
        rotation: [0, 0, 0],
        tracking: { head: 0.6, torso: 0.2 },
      },
    },
    transitions: {
      'idle->hover': { duration: 0.3, easing: 'ease-out' },
      'hover->idle': { duration: 0.5, easing: 'ease-in' },
      '*->click': { duration: 0.1, easing: 'snap' },
    },
  };
}

export function createDefaultConfig(assetType: AssetType = 'head'): WidgetConfig {
  if (assetType === 'body') return createBodyConfig();
  return {
    defaults: {
      camera: DEFAULT_CAMERA,
      autoBlink: { interval: [3000, 6500], duration: 120 },
      gaze: {
        intensity: 1.0,
        smoothingTau: 0.18,
        deadzone: 0.06,
        maxEyeYaw: 0.09,
        maxEyePitch: 0.04,
        maxNeckYaw: 0.08,
        maxNeckPitch: 0.05,
        saccade: { ...DEFAULT_SACCADE_CONFIG, intervalMs: [...DEFAULT_SACCADE_CONFIG.intervalMs] },
      },
    },
    states: {
      idle: {
        ...DEFAULT_STATE,
        expression: { browDownLeft: 0.12, browOuterUpRight: 0.15, eyeSquintLeft: 0.08 },
      },
      hover: {
        ghost: { amplitude: 0.008, frequency: 0.7, wobble: 0.5 },
        expression: { noseSneerLeft: 0.7, eyeSquintLeft: 0.5, mouthUpperUpLeft: 0.4, browDownLeft: 0.5, browInnerUp: 0.3, eyeWideLeft: 0.4, eyeWideRight: 0.3 },
        camera: { theta: 0, phi: 75, radius: 2.4 },
        rotation: [-3, 0, -2],
        tracking: { eyes: 1.0, head: 0.3 },
      },
      click: {
        ghost: { amplitude: 0.002, frequency: 1.0, wobble: 0.1 },
        expression: { eyeWideLeft: 0.8, eyeWideRight: 0.8, jawOpen: 0.3, browInnerUp: 0.6 },
        camera: { theta: 0, phi: 70, radius: 2.2 },
        rotation: [5, 0, 0],
        tracking: { eyes: 0.5, head: 0.0 },
      },
    },
    transitions: {
      'idle->hover': { duration: 0.3, easing: 'ease-out' },
      'hover->idle': { duration: 0.5, easing: 'ease-in' },
      '*->click': { duration: 0.1, easing: 'snap' },
    },
  };
}

export function mergeWithDefaults(partial: Partial<WidgetConfig>, assetType: AssetType = 'head'): WidgetConfig {
  const defaults = createDefaultConfig(assetType);
  return {
    defaults: {
      ...defaults.defaults,
      ...partial.defaults,
      // Deep-merge the nested gaze block so a partial config that sets `defaults`
      // doesn't wipe the gaze (and saccade) defaults.
      gaze: {
        ...defaults.defaults.gaze,
        ...partial.defaults?.gaze,
        saccade: {
          ...defaults.defaults.gaze.saccade,
          ...partial.defaults?.gaze?.saccade,
        },
      },
    },
    states: { ...defaults.states, ...partial.states },
    transitions: { ...defaults.transitions, ...partial.transitions },
  };
}

export async function loadConfig(url: string): Promise<WidgetConfig> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load config: ${res.statusText}`);
  const json = await res.json();
  return mergeWithDefaults(json);
}
