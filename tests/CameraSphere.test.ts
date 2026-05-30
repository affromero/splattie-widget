import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraSphere } from '../src/dimensions/CameraSphere';

const makeCamera = () => new THREE.PerspectiveCamera(50, 1, 0.1, 100);

describe('CameraSphere.apply', () => {
  it('places the camera exactly `radius` from the look-at point', () => {
    const cam = makeCamera();
    const sphere = new CameraSphere();
    sphere.apply(cam, { theta: 37, phi: 60, radius: 4 });
    expect(cam.position.length()).toBeCloseTo(4, 6);
  });

  it('honours the look-at offset (sphere is centred on it)', () => {
    const cam = makeCamera();
    const sphere = new CameraSphere();
    sphere.setLookAt([1, 2, 3]);
    sphere.apply(cam, { theta: 110, phi: 75, radius: 5 });
    expect(cam.position.distanceTo(new THREE.Vector3(1, 2, 3))).toBeCloseTo(5, 6);
  });

  it('phi=0 looks straight down the +Y axis from the look-at point', () => {
    const cam = makeCamera();
    new CameraSphere().apply(cam, { theta: 0, phi: 0, radius: 3 });
    expect(cam.position.x).toBeCloseTo(0, 6);
    expect(cam.position.y).toBeCloseTo(3, 6);
    expect(cam.position.z).toBeCloseTo(0, 6);
  });

  it('points the camera back at the look-at point', () => {
    const cam = makeCamera();
    const sphere = new CameraSphere();
    sphere.setLookAt([0, 1, 0]);
    sphere.apply(cam, { theta: 220, phi: 65, radius: 6 });

    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    const toTarget = new THREE.Vector3(0, 1, 0).sub(cam.position).normalize();
    expect(forward.dot(toTarget)).toBeCloseTo(1, 5);
  });

  it('updates fov + projection only when it changes', () => {
    const cam = makeCamera();
    cam.updateProjectionMatrix();
    const before = cam.projectionMatrix.elements.slice();
    new CameraSphere().apply(cam, { theta: 0, phi: 90, radius: 3, fov: 50 }); // same fov
    expect(cam.projectionMatrix.elements).toEqual(before);

    new CameraSphere().apply(cam, { theta: 0, phi: 90, radius: 3, fov: 20 });
    expect(cam.fov).toBe(20);
    expect(cam.projectionMatrix.elements).not.toEqual(before);
  });
});
