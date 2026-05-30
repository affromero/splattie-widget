export interface GhostConfig {
  amplitude: number;
  frequency: number;
  wobble: number;
  phase?: number;
  /** Slow idle head-yaw drift (rad), summed low-frequency sines. At-rest only. */
  driftYaw?: number;
}

export interface TrackingConfig {
  /** Head-only: how strongly the eyes track the cursor. */
  eyes?: number;
  /** How strongly the head turns toward the cursor (head + body look-at). */
  head: number;
  /** Body-only: how much the torso (spine) leans toward the cursor (look-at). */
  torso?: number;
}

export interface CameraConfig {
  theta: number;
  phi: number;
  radius: number;
  lookAt?: 'auto' | [number, number, number];
  fov?: number;
}

export interface StateDefinition {
  ghost: GhostConfig;
  expression: Record<string, number>;
  camera: CameraConfig;
  rotation: [number, number, number];
  tracking: TrackingConfig;
  /** Body-only: per-joint LOCAL rotation overrides (quaternion xyzw), authored via
   * IK in the editor and composed on top of the resting pose by the widget's FK. */
  pose?: Record<string, [number, number, number, number]>;
}

export interface TransitionConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'snap';
}

export interface AutoBlinkConfig {
  interval: [number, number];
  duration: number;
}

export interface SaccadeConfig {
  /** When false, the eyes produce no micro-saccade offset. */
  enabled: boolean;
  /** Max offset magnitude in NDC units (radius of the target disc). */
  amplitude: number;
  /** Dwell time between darts (ms), sampled uniformly from [min, max]. */
  intervalMs: [number, number];
  /** Approximate duration of the quick move toward a new target (ms). */
  moveMs: number;
}

export interface GazeConfig {
  /** Opt-in eye-follow strength multiplier (default 1.0). Applied to eyes only. */
  intensity: number;
  /** Cursor smoothing time-constant in seconds (larger = calmer). */
  smoothingTau: number;
  /** Radial deadzone radius in NDC (ignores tiny jitter near center). */
  deadzone: number;
  /** Max local eye yaw/pitch and neck yaw/pitch in radians (anatomical clamps). */
  maxEyeYaw: number;
  maxEyePitch: number;
  maxNeckYaw: number;
  maxNeckPitch: number;
  saccade: SaccadeConfig;
}

export interface WidgetConfig {
  defaults: {
    camera: CameraConfig;
    autoBlink?: AutoBlinkConfig;
    gaze: GazeConfig;
  };
  states: Record<string, StateDefinition>;
  transitions: Record<string, TransitionConfig>;
}

export interface SplattieManifest {
  format: 'splattie';
  formatVersion: string;
  assetType: 'head' | 'body' | 'object';
  generator: {
    method: string;
    methodVersion?: string;
    tool: string;
    createdAt: string;
  };
  avatar: {
    splat: {
      file: string;
      format: 'ply' | 'spz';
      numGaussians: number;
      topology: string;
    };
  };
  animation: {
    type: 'lbs' | 'blendshape' | 'neural';
    skeleton?: { file: string; rig: string };
    weights?: { file: string };
    expression?: { system: string; basis: string | null };
  };
  widget: { config: string };
  metadata?: {
    sourceImageHash?: string;
    license?: string;
    attribution?: string;
    author?: string;
    lastEditedAt?: string;
    editedBy?: string;
  };
}

export interface SplatWidgetEvents {
  splatload: CustomEvent;
  splathover: CustomEvent;
  splatclick: CustomEvent;
  splatleave: CustomEvent;
}
