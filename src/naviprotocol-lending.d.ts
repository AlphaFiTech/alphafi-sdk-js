// NAVI v2 (@naviprotocol/lending) ships ESM `.d.ts` files with extensionless
// relative re-exports, which don't resolve under `moduleResolution: NodeNext`
// (the runtime bundle is a single self-contained file and works fine). Declare
// the one symbol we use so it type-resolves. Remove if NAVI fixes their packaging.
declare module '@naviprotocol/lending' {
  export function getUserAvailableLendingRewards(
    address: string,
    options?: { client: unknown } & Record<string, unknown>,
  ): Promise<Array<{ assetCoinType: string; [key: string]: unknown }>>;
}
