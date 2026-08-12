/**
 * RebalanceCap lookup utility for admin rebalance operations.
 */

import { StrategyContext } from '../models/strategyContext.js';
import { ADMIN } from '../utils/constants.js';

/**
 * Find the RebalanceCap object owned by `address` and return its object ID.
 * Throws if no cap is found (wallet doesn't have permission to rebalance).
 */
export async function getRebalanceCap(address: string, context: StrategyContext): Promise<string> {
  // The type address is the package version that defined `RebalanceCap`, which is upgrade-invariant
  // and belongs to a package lineage no pool label points at — see ADMIN.ALPHA_FIRST_PACKAGE_ID.
  const rebalanceCapType = `${ADMIN.ALPHA_FIRST_PACKAGE_ID}::distributor::RebalanceCap`;
  const { objects } = await context.blockchain.suiGrpcClient.core.listOwnedObjects({
    owner: address,
    type: rebalanceCapType,
  });
  const objectId = objects[0]?.objectId;
  if (!objectId) {
    throw new Error('no rebalance cap found');
  }
  return objectId;
}
