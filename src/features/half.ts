/**
 * IEEE-754 half-float (binary16) <-> float32 conversion. Spark's PackedSplats
 * store positions as half-floats, and the float16 expression basis is stored the
 * same way, so both the SPZ baseline decode and the basis loader share these.
 */

const _f32 = new Float32Array(1);
const _i32 = new Int32Array(_f32.buffer);

/** Encode a float32 to a 16-bit half (returned in the low 16 bits of the result). */
export function toHalf(f: number): number {
  _f32[0] = f;
  const i = _i32[0];
  const s = (i >>> 16) & 0x8000;
  const e = ((i >>> 23) & 0xff) - 112;
  const m = i & 0x7fffff;
  if (e <= 0) return s;
  if (e > 30) return s | 0x7c00;
  return s | (e << 10) | (m >>> 13);
}

/** Decode a 16-bit half (low 16 bits of `h`) back to a float32 number. */
export function halfToFloat(h: number): number {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const m = h & 0x03ff;
  const sign = s ? -1 : 1;
  if (e === 0) return sign * Math.pow(2, -14) * (m / 1024); // subnormal / zero
  if (e === 0x1f) return m ? NaN : sign * Infinity;
  return sign * Math.pow(2, e - 15) * (1 + m / 1024);
}
