/**
 * Pure math helpers for gaze taming. No THREE / DOM dependencies so they can
 * be unit-tested headlessly.
 */

/**
 * Frame-rate-independent exponential smoothing. Moves `current` toward
 * `target` with time-constant `tau` (seconds, the e-folding time). Using
 * `alpha = 1 - exp(-dt/tau)` makes the trajectory identical in wall-clock
 * time regardless of frame rate (unlike a constant per-frame lerp factor).
 */
export function expSmooth(current: number, target: number, dt: number, tau: number): number {
  if (tau <= 0 || dt <= 0) return tau <= 0 ? target : current;
  const alpha = 1 - Math.exp(-dt / tau);
  return current + (target - current) * alpha;
}

/**
 * Radial deadzone with smooth boundary rescale. Inside radius `r` (in [0,1))
 * the output is zero; outside, the magnitude is remapped [r,1] -> [0,1] so
 * there is no jump at the boundary (output -> 0 as mag -> r) and the full
 * range is restored at magnitude 1. Direction is preserved.
 */
export function applyDeadzone(x: number, y: number, r: number): [number, number] {
  const mag = Math.hypot(x, y);
  if (mag <= r) return [0, 0];
  if (r >= 1 || mag === 0) return [x, y];
  const scale = (mag - r) / (1 - r) / mag;
  return [x * scale, y * scale];
}

/** Clamp `v` to the symmetric range [-m, m]. */
export function clampAbs(v: number, m: number): number {
  return Math.max(-m, Math.min(m, v));
}
