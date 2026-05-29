export interface GhostConfig {
  amplitude: number;
  frequency: number;
  wobble: number;
  phase?: number;
  /** Slow idle head-yaw drift (rad), summed low-frequency sines. At-rest only. */
  driftYaw?: number;
}

export interface TrackingConfig {
  eyes: number;
  head: number;
  body?: number;
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
}

export interface TransitionConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'snap';
}

export interface AutoBlinkConfig {
  interval: [number, number];
  duration: number;
}

export interface WidgetConfig {
  defaults: {
    camera: CameraConfig;
    autoBlink?: AutoBlinkConfig;
  };
  states: Record<string, StateDefinition>;
  transitions: Record<string, TransitionConfig>;
}

export interface SplattieManifest {
  format: 'splattie';
  formatVersion: string;
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
