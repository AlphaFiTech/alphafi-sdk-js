/**
 * RebalanceCap lookup utility for admin rebalance operations.
 */

import { StrategyContext } from '../models/strategyContext.js';
import { ADMIN } from '../utils/constants.js';

/**
 * Find the RebalanceCap object owned by `address` and return its object ID.
 * Throws if no cap is found (wallet doesn't have permission to rebalance).
 * Uses JSON-RPC via `context.blockchain.txBuildClient` (same as tx building).
 */
export async function getRebalanceCap(address: string, context: StrategyContext): Promise<string> {
  const rpc = context.blockchain.txBuildClient;
  const rebalanceCapType = `${ADMIN.ALPHA_FIRST_PACKAGE_ID}::distributor::RebalanceCap`;
  const data = await rpc.getOwnedObjects({
    owner: address,
    filter: { StructType: rebalanceCapType },
  });
  if (!data.data[0]?.data) {
    throw new Error('no rebalance cap found');
  }
  return data.data[0].data.objectId;
}
