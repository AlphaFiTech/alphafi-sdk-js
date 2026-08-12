/**
 * Slush WAL locked-loop pool admin operations.
 */

import { Transaction } from '@mysten/sui/transactions';
import { Decimal } from 'decimal.js';
import { StrategyContext } from '../models/strategyContext.js';
import { SlushSingleAssetLoopingPoolLabel } from '../strategies/slushSingleAssetLooping.js';
import { ADMIN, ALPHALEND_LENDING_PROTOCOL_ID, CLOCK_PACKAGE_ID } from '../utils/constants.js';

// Mainnet WAL coin type
const WAL_COIN_TYPE =
  '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';

// WAL has 9 decimal places on Sui
const WAL_DECIMALS = 9;

const WAL_LOOP_POOL_NAME = 'ALPHALEND-SLUSH-WAL-SINGLE-LOOP';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface WalLockedRewardInfo {
  rewardPerMsHuman: number;
  startTimeMs: number;
  endTimeMs: number;
  isActive: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

function numberTypeToHuman(raw: string, tokenDecimals: number): number {
  const ten = new Decimal(10);
  return new Decimal(raw).div(ten.pow(18)).div(ten.pow(tokenDecimals)).toNumber();
}

/**
 * Resolve the WAL locked-loop pool label from the registry (`/public/config`).
 * The pool id, the call-target package id and the shared `Version` object all move on
 * redeploys/upgrades, so they are read from the registry instead of being hardcoded.
 */
async function getWalLoopLabel(
  context: StrategyContext,
): Promise<SlushSingleAssetLoopingPoolLabel> {
  const labels = await context.getPoolLabels();
  for (const [, label] of labels) {
    if (label.strategyType === 'SlushSingleAssetLooping' && label.poolName === WAL_LOOP_POOL_NAME) {
      return label as SlushSingleAssetLoopingPoolLabel;
    }
  }
  throw new Error(`${WAL_LOOP_POOL_NAME} pool label not found in registry`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Exported admin functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Read the current external rewards configuration from the WAL locked-loop pool.
 * Returns null when no rewards have been configured yet (endTimeMs === 0).
 */
export async function getWalLockedRewardInfo(
  context: StrategyContext,
): Promise<WalLockedRewardInfo | null> {
  const walLoop = await getWalLoopLabel(context);
  const { object } = await context.blockchain.suiGrpcClient.core.getObject({
    objectId: walLoop.poolId,
    include: { json: true },
  });

  const poolFields = object?.json as Record<string, unknown> | undefined;
  if (!poolFields) {
    throw new Error('WAL locked pool object not found on chain.');
  }

  const rewardsInfo = poolFields.external_rewards_info as Record<string, unknown> | undefined;
  if (!rewardsInfo) {
    throw new Error('external_rewards_info field not found in pool object.');
  }

  const endTimeMs = Number((rewardsInfo.end_time as string | undefined) ?? 0);
  if (endTimeMs === 0) return null;

  const rewardPerMs = rewardsInfo.reward_per_ms as Record<string, unknown> | undefined;
  const rewardPerMsRaw: string = (rewardPerMs?.value as string | undefined) ?? '0';

  return {
    rewardPerMsHuman: numberTypeToHuman(rewardPerMsRaw, WAL_DECIMALS),
    startTimeMs: Number((rewardsInfo.start_time as string | undefined) ?? 0),
    endTimeMs,
    isActive: endTimeMs > Date.now(),
  };
}

/**
 * Build a transaction that adds external WAL rewards to the locked-loop pool.
 *
 * @param tx          An existing transaction to append to.
 * @param address     Wallet address that holds the AdminCap and WAL coins.
 * @param amount      Raw WAL amount (bigint, in base units with WAL_DECIMALS precision).
 * @param startTimeMs Reward start epoch (milliseconds since epoch).
 * @param endTimeMs   Reward end epoch (milliseconds since epoch).
 */
export async function addExternalRewardsWalLockedTxb(
  tx: Transaction,
  address: string,
  amount: bigint,
  startTimeMs: number,
  endTimeMs: number,
  context: StrategyContext,
): Promise<void> {
  const walLoop = await getWalLoopLabel(context);
  if (!walLoop.versionId) {
    throw new Error(
      `${WAL_LOOP_POOL_NAME} label has no version_object_id; cannot build add_external_rewards`,
    );
  }

  // Find AdminCap owned by this wallet. The type address is the package version that *defined*
  // `AdminCap` (slush v1), not the current package — see ADMIN.ALPHA_SLUSH_FIRST_PACKAGE_ID.
  const { objects: ownedCaps } = await context.blockchain.suiGrpcClient.core.listOwnedObjects({
    owner: address,
    type: `${ADMIN.ALPHA_SLUSH_FIRST_PACKAGE_ID}::alphalend_slush_pool::AdminCap`,
  });

  const adminCapId = ownedCaps[0]?.objectId;
  if (!adminCapId) {
    throw new Error(
      `No AdminCap found for address ${address}. Ensure this wallet owns the locked loop AdminCap.`,
    );
  }

  const alphalendClient = context.alphalendClient;
  await alphalendClient.updatePrices(tx, [WAL_COIN_TYPE]);

  const rewardCoin = context.blockchain.getCoinObject(tx, WAL_COIN_TYPE, address, amount);

  tx.moveCall({
    target: `${walLoop.packageId}::alphalend_slush_locked_loop_pool::add_external_rewards`,
    typeArguments: [WAL_COIN_TYPE],
    arguments: [
      tx.object(adminCapId),
      tx.object(walLoop.versionId),
      tx.object(walLoop.poolId),
      rewardCoin,
      tx.pure.u64(startTimeMs),
      tx.pure.u64(endTimeMs),
      tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });
}
