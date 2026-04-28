/**
 * RebalanceCap lookup utility for admin rebalance operations.
 */

import { SuiClient } from '@mysten/sui/client';
import { ADMIN } from '../utils/constants.js';

/**
 * Find the RebalanceCap object owned by `address` and return its object ID.
 * Throws if no cap is found (wallet doesn't have permission to rebalance).
 */
export async function getRebalanceCap(address: string, suiClient: SuiClient): Promise<string> {
  const rebalanceCapType = `${ADMIN.ALPHA_FIRST_PACKAGE_ID}::distributor::RebalanceCap`;
  const data = await suiClient.getOwnedObjects({
    owner: address,
    filter: { StructType: rebalanceCapType },
  });
  if (!data.data[0]?.data) {
    throw new Error('no rebalance cap found');
  }
  return data.data[0].data.objectId;
}
