import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { HitDetector } from '../src/interaction/HitDetector';

// Minimal WebGLRenderer stand-in: readPixels writes a fixed RGBA pixel.
const fakeRenderer = (pixel: [number, number, number, number], dpr = 1) => {
  const gl = {
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    readPixels: (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      _f: number,
      _t: number,
      out: Uint8Array,
    ) => {
      out.set(pixel);
    },
  };
  return { getContext: () => gl, getPixelRatio: () => dpr } as unknown as THREE.WebGLRenderer;
};

const W = 200;
const H = 200;
const CENTER = [W / 2, H / 2] as const;

describe('HitDetector.check', () => {
  it('is a hit when the sampled pixel differs from the background', () => {
    const det = new HitDetector(); // default bg (14,14,20)
    const renderer = fakeRenderer([200, 200, 200, 255]);
    expect(det.check(renderer, CENTER[0], CENTER[1], W, H)).toBe(true);
  });

  it('is a miss when the sampled pixel matches the background', () => {
    const det = new HitDetector();
    const renderer = fakeRenderer([14, 14, 20, 255]); // exactly the background
    expect(det.check(renderer, CENTER[0], CENTER[1], W, H)).toBe(false);
  });

  it('rejects points outside the circular boundary regardless of pixel', () => {
    const det = new HitDetector();
    const renderer = fakeRenderer([255, 255, 255, 255]); // would be a hit if sampled
    // Top-left corner is outside the inscribed circle of a 200x200 square.
    expect(det.check(renderer, 2, 2, W, H)).toBe(false);
  });

  it('honours a background colour set via hex', () => {
    const det = new HitDetector();
    det.setBackgroundColor(0x102030); // r=16 g=32 b=48
    const matches = fakeRenderer([16, 32, 48, 255]);
    expect(det.check(matches, CENTER[0], CENTER[1], W, H)).toBe(false);
    const differs = fakeRenderer([16, 32, 200, 255]); // blue far from 48
    expect(det.check(differs, CENTER[0], CENTER[1], W, H)).toBe(true);
  });
});
