/**
 * Converts a signed tick index to its unsigned 32-bit two's-complement
 * representation, which is what the Move u32 type expects on-chain.
 *
 * Positive ticks are returned as-is. Negative ticks are bit-cast to their
 * unsigned u32 equivalent (e.g. -1 → 4294967295).
 */
export function toTwosComplementU32(tick: number): number {
  if (tick < 0) {
    return (tick >>> 0) & 0xffffffff;
  }
  return tick;
}
