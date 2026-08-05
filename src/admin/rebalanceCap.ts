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
