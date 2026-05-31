import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSparseLbsWeights } from '../src/renderer/SparkSetup';

function lbswBuffer(): ArrayBuffer {
  const numGaussians = 2;
  const jointCount = 3;
  const k = 2;
  const indices = [0, 1, 2, 0];
  const halfWeights = [0x3a00, 0x3400, 0x3800, 0x3800]; // 0.75, 0.25, 0.5, 0.5
  const count = numGaussians * k;
  const buffer = new ArrayBuffer(20 + count * 2 + count * 2);
  const bytes = new Uint8Array(buffer);
  bytes.set([...'LBSW'].map((c) => c.charCodeAt(0)), 0);
  const view = new DataView(buffer);
  view.setUint32(4, 1, true);
  view.setUint32(8, numGaussians, true);
  view.setUint32(12, jointCount, true);
  view.setUint32(16, k, true);
  const words = new Uint16Array(buffer, 20);
  words.set(indices, 0);
  words.set(halfWeights, count);
  return buffer;
}

function mockFetch(buffer: ArrayBuffer, ok = true): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? 'OK' : 'Not Found',
    arrayBuffer: async () => buffer,
  })));
}

describe('loadSparseLbsWeights', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads compact binary LBSW weights', async () => {
    mockFetch(lbswBuffer());
    const weights = await loadSparseLbsWeights('/weights.bin');

    expect(weights.numGaussians).toBe(2);
    expect(weights.jointCount).toBe(3);
    expect(weights.k).toBe(2);
    expect(Array.from(weights.indices)).toEqual([0, 1, 2, 0]);
    expect(Array.from(weights.weights)).toEqual([0.75, 0.25, 0.5, 0.5]);
  });

  it('keeps legacy JSON sparse weights loadable', async () => {
    const json = JSON.stringify({
      numGaussians: 1,
      jointCount: 2,
      k: 2,
      indices: [0, 1],
      weights: [0.6, 0.4],
    });
    mockFetch(new TextEncoder().encode(json).buffer);
    const weights = await loadSparseLbsWeights('/weights.json');

    expect(weights).toMatchObject({ numGaussians: 1, jointCount: 2, k: 2 });
    expect(weights.indices).toEqual([0, 1]);
    expect(weights.weights).toEqual([0.6, 0.4]);
  });

  it('rejects invalid binary sizes', async () => {
    mockFetch(lbswBuffer().slice(0, -2));
    await expect(loadSparseLbsWeights('/weights.bin')).rejects.toThrow('invalid LBSW weights file size');
  });
});
