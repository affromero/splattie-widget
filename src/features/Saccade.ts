import { expSmooth } from './GazeMath';

export interface SaccadeConfig {
  /** When false, update() always returns a zero offset. */
  enabled: boolean;
  /** Max offset magnitude in NDC units (the radius of the target disc). */
  amplitude: number;
  /** Dwell time between darts, in ms, sampled uniformly from [min, max]. */
  intervalMs: [number, number];
  /** Approximate duration of the quick move toward a new target, in ms. */
  moveMs: number;
}

export const DEFAULT_SACCADE_CONFIG: SaccadeConfig = {
  enabled: true,
  amplitude: 0.04,
  intervalMs: [600, 1800],
  moveMs: 35,
};

/**
 * Fixational micro-saccades: tiny, occasional eye darts that keep a gaze from
 * reading robotic. Produces an additive NDC offset to layer on top of the
 * cursor-driven gaze. The internal clock is driven by accumulated delta-time
 * (not performance.now) so behaviour is deterministic in tests; Math.random
 * only chooses targets and dwell times, all bounded by `amplitude`.
 */
export class Saccade {
  private cfg: SaccadeConfig;
  private offsetX = 0;
  private offsetY = 0;
  private targetX = 0;
  private targetY = 0;
  private timeMs = 0;
  private nextSwitchMs: number;

  constructor(config?: Partial<SaccadeConfig>) {
    this.cfg = { ...DEFAULT_SACCADE_CONFIG, ...config };
    this.nextSwitchMs = this.pickInterval();
  }

  private pickInterval(): number {
    const [lo, hi] = this.cfg.intervalMs;
    return lo + Math.random() * Math.max(0, hi - lo);
  }

  private pickTarget(): void {
    // Area-uniform point within the disc of radius `amplitude`.
    const r = this.cfg.amplitude * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    this.targetX = Math.cos(a) * r;
    this.targetY = Math.sin(a) * r;
  }

  /**
   * Advance the saccade and return the current eye offset in NDC units.
   * `suppression` in [0,1] attenuates the output (1 = cursor actively moving,
   * so the dart is fully suppressed — humans suppress micro-saccades during
   * smooth pursuit). The returned magnitude never exceeds `amplitude`.
   */
  update(dt: number, suppression = 0): { x: number; y: number } {
    if (!this.cfg.enabled) return { x: 0, y: 0 };

    this.timeMs += dt * 1000;
    if (this.timeMs >= this.nextSwitchMs) {
      this.pickTarget();
      this.nextSwitchMs = this.timeMs + this.cfg.moveMs + this.pickInterval();
    }

    const tau = Math.max(this.cfg.moveMs, 1) / 3000; // fast ease (~moveMs to settle)
    this.offsetX = expSmooth(this.offsetX, this.targetX, dt, tau);
    this.offsetY = expSmooth(this.offsetY, this.targetY, dt, tau);

    const gain = 1 - Math.max(0, Math.min(1, suppression));
    return { x: this.offsetX * gain, y: this.offsetY * gain };
  }
}
