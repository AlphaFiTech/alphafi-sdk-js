/**
 * Pool Registry for DEX pools across multiple protocols.
 * Maps coin type pairs to their respective pool IDs on Bluefin, Cetus, and MMT.
 */

export type ProtocolPoolIds = {
  bluefin?: string;
  cetus?: string;
  mmt?: string;
};

/**
 * Creates a canonical key from two coin types by sorting them alphabetically.
 * This ensures the same key is returned regardless of the order of coin types.
 */
export function getCanonicalPairKey(coinTypeA: string, coinTypeB: string): string {
  return [coinTypeA, coinTypeB].sort().join('-');
}
