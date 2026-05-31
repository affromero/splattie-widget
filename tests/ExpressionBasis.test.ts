import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExpressionBasisApplier, loadExpressionBasis } from '../src/features/ExpressionBasis';
import { halfToFloat, toHalf } from '../src/features/half';

function makeBasisBuffer(numVertices: number, numExpressions: number, values: number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(12 + values.length * 2);
  const view = new DataView(buffer);
  view.setUint8(0, 'E'.charCodeAt(0));
  view.setUint8(1, 'X'.charCodeAt(0));
  view.setUint8(2, 'P'.charCodeAt(0));
  view.setUint8(3, 'H'.charCodeAt(0));
  view.setUint32(4, numVertices, true);
  view.setUint32(8, numExpressions, true);
  const halves = new Uint16Array(buffer, 12);
  values.forEach((value, index) => {
    halves[index] = toHalf(value);
  });
  return buffer;
}

describe('loadExpressionBasis', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the EXPH half-float basis and sidecar labels', async () => {
    const buffer = makeBasisBuffer(1, 2, [0.125, -0.25, 0.5, 1, 0, -1]);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('.json')) {
        return { json: async () => ({ labels: ['smile', 'blink'] }) };
      }
      return { arrayBuffer: async () => buffer };
    }));

    const basis = await loadExpressionBasis('/basis.bin');
    expect(basis.numVertices).toBe(1);
    expect(basis.numExpressions).toBe(2);
    expect(basis.labels).toEqual(['smile', 'blink']);
    expect(Array.from(basis.basis)).toEqual([0.125, -0.25, 0.5, 1, 0, -1]);
  });

  it('rejects files with the wrong magic header', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      arrayBuffer: async () => new ArrayBuffer(12),
    })));

    await expect(loadExpressionBasis('/bad.bin')).rejects.toThrow(/Invalid expression basis magic/);
  });
});

describe('ExpressionBasisApplier', () => {
  it('writes weighted expression offsets back into Spark packed positions', () => {
    const basis = {
      numVertices: 2,
      numExpressions: 2,
      labels: ['smile', 'blink'],
      basis: new Float32Array([
        0.1, 0, 0,
        0, 0.2, 0,
        1, 0, 0,
        0, 1, 0,
      ]),
    };
    const baseline = new Float32Array([
      1, 2, 3,
      4, -1, -0.2,
    ]);
    const packed = new Uint32Array(8);
    packed[6] = 0xabcd0000;

    const applier = new ExpressionBasisApplier(basis, baseline, 0);
    expect(applier.apply(packed, { smile: 0.5, expr_1: 0.25 }, 2)).toBe(true);

    expect(halfToFloat(packed[1] & 0xffff)).toBeCloseTo(1.1, 2);
    expect(halfToFloat((packed[1] >>> 16) & 0xffff)).toBeCloseTo(2.1, 2);
    expect(halfToFloat(packed[2] & 0xffff)).toBeCloseTo(3, 2);
    expect(packed[5]).toBe(0);
    expect(packed[6]).toBe(0xabcd0000);
    expect(applier.apply(packed, { smile: 0.5, expr_1: 0.25 }, 2)).toBe(false);
  });
});
