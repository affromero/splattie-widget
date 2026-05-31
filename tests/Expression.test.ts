import { describe, expect, it } from 'vitest';
import { Expression } from '../src/dimensions/Expression';

describe('Expression', () => {
  it('applies expression weights onto the target blendshape map', () => {
    const target = { jawOpen: 0.1, eyeSquint: 0.2 };
    new Expression().apply(target, { jawOpen: 0.7, browInnerUp: 0.4 });
    expect(target).toEqual({ jawOpen: 0.7, eyeSquint: 0.2, browInnerUp: 0.4 });
  });
});
