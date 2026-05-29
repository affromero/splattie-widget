import { describe, expect, it } from 'vitest';
import {
  SEMANTIC_EXPRESSIONS,
  SEMANTIC_EXPRESSION_NAMES,
  expandSemantic,
} from '../src/features/SemanticExpression';

describe('expandSemantic', () => {
  it('expands a friendly name into its ARKit channels, scaled by the weight', () => {
    // Derive expectations from the map so coefficient tuning doesn't break the test.
    const w = 0.5;
    const out = expandSemantic({ smile: w });
    for (const [channel, coeff] of Object.entries(SEMANTIC_EXPRESSIONS.smile)) {
      expect(out[channel]).toBeCloseTo(w * coeff, 6);
    }
    expect(out.smile).toBeUndefined(); // friendly name is consumed, not passed through
  });

  it('passes raw ARKit channels and bone/gaze keys through unchanged', () => {
    const out = expandSemantic({ jawForward: 0.4, neckTilt: 0.2, gazeX: -0.05 });
    expect(out.jawForward).toBeCloseTo(0.4, 6); // raw channel addresses a blendshape directly
    expect(out.neckTilt).toBeCloseTo(0.2, 6); // applier ignores non-channel keys
    expect(out.gazeX).toBeCloseTo(-0.05, 6);
  });

  it('accumulates additively when a name and a raw channel touch the same blendshape', () => {
    const extra = 0.5;
    const out = expandSemantic({ smile: 1, mouthSmileLeft: extra });
    expect(out.mouthSmileLeft).toBeCloseTo(SEMANTIC_EXPRESSIONS.smile.mouthSmileLeft + extra, 6);
  });

  it('drops zero-valued inputs and does not mutate its argument', () => {
    const input = { smile: 0, jawOpen: 1 };
    const out = expandSemantic(input);
    expect(out.mouthSmileLeft).toBeUndefined(); // smile was 0
    expect(out.jawOpen).toBeCloseTo(SEMANTIC_EXPRESSIONS.jawOpen.jawOpen, 6);
    expect(input).toEqual({ smile: 0, jawOpen: 1 }); // unchanged
  });

  it('every friendly name maps to at least one finite-coefficient channel', () => {
    expect(SEMANTIC_EXPRESSION_NAMES.length).toBeGreaterThan(0);
    for (const name of SEMANTIC_EXPRESSION_NAMES) {
      const mapping = SEMANTIC_EXPRESSIONS[name];
      expect(Object.keys(mapping).length).toBeGreaterThan(0);
      for (const coeff of Object.values(mapping)) {
        expect(Number.isFinite(coeff)).toBe(true);
      }
    }
  });
});
