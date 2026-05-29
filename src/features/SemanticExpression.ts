/**
 * Maps friendly expression names to ARKit blendshape channels.
 *
 * The expression basis (`expression_basis.bin`) is the 52 true ARKit blendshapes
 * (exported from LAM's `flame_arkit_bs.npy`), so each channel is a real, named
 * expression — `mouthSmileLeft` IS a smile. Most ARKit names are left/right or
 * otherwise unfriendly, so the editor exposes these friendly names, each a small
 * blend of ARKit channels. Weights are [0,1]; the applier scales by 1.0, so a
 * coefficient of 1 = the full ARKit blendshape.
 *
 * `expandSemantic` turns a mixed weight map (friendly names, raw ARKit channels,
 * and bone/gaze keys like `neckTilt`/`gazeX`) into pure ARKit-channel weights for
 * the basis. Unknown keys pass through untouched: raw channels address blendshapes
 * directly, and bone/gaze keys (consumed elsewhere as joint rotations) match no
 * channel label so the applier ignores them.
 */
export const SEMANTIC_EXPRESSIONS: Record<string, Record<string, number>> = {
  smile: { mouthSmileLeft: 1, mouthSmileRight: 1 },
  mouthFrown: { mouthFrownLeft: 1, mouthFrownRight: 1 },
  jawOpen: { jawOpen: 1 },
  lipPucker: { mouthPucker: 1 },
  browRaise: { browInnerUp: 0.6, browOuterUpLeft: 1, browOuterUpRight: 1 },
  browFrown: { browDownLeft: 1, browDownRight: 1 },
  noseSneer: { noseSneerLeft: 1, noseSneerRight: 1 },
  cheekPuff: { cheekPuff: 1 },
  eyeWide: { eyeWideLeft: 1, eyeWideRight: 1 },
  eyeSquint: { eyeSquintLeft: 1, eyeSquintRight: 1 },
};

/** Friendly expression names, for the editor to build sliders from. */
export const SEMANTIC_EXPRESSION_NAMES: readonly string[] = Object.keys(SEMANTIC_EXPRESSIONS);

/**
 * Expand friendly expression weights into ARKit-channel weights. Pure: builds a
 * fresh map and accumulates additively when two names touch the same channel.
 */
export function expandSemantic(weights: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    if (!value) continue;
    const mapping = SEMANTIC_EXPRESSIONS[key];
    if (mapping) {
      for (const [channel, coeff] of Object.entries(mapping)) {
        out[channel] = (out[channel] ?? 0) + value * coeff;
      }
    } else {
      out[key] = (out[key] ?? 0) + value;
    }
  }
  return out;
}
