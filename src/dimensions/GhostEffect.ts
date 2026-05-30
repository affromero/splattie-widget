import type { GhostConfig } from '../types';

export class GhostEffect {
  apply(
    mesh: { position: { y: number }; rotation: { x: number; y: number; z: number } },
    ghost: GhostConfig,
    time: number,
  ): void {
    const phase = ghost.phase ?? 0;
    mesh.position.y += Math.sin(time * ghost.frequency * Math.PI * 2 + phase) * ghost.amplitude;

    if (ghost.wobble > 0) {
      mesh.rotation.x += Math.sin(time * 0.7 + phase) * ghost.wobble * 0.01;
      mesh.rotation.z += Math.cos(time * 0.5 + phase) * ghost.wobble * 0.008;
    }

    const driftYaw = ghost.driftYaw ?? 0;
    if (driftYaw > 0) {
      // Summed low-frequency sines -> slow, non-periodic head turn at rest.
      mesh.rotation.y +=
        (Math.sin(time * 0.13 + phase) * 0.6 + Math.sin(time * 0.31 + phase * 1.7) * 0.4) * driftYaw;
    }
  }
}
