/**
 * Slush WAL locked-loop pool admin operations.
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiMoveObject, type SuiObjectResponse } from '@mysten/sui/client';
import { Decimal } from 'decimal.js';
import { StrategyContext } from '../models/strategyContext.js';
import {
  ADMIN,
  ALPHALEND_LENDING_PROTOCOL_ID,
  CLOCK_PACKAGE_ID,
} from '../utils/constants.js';

// Mainnet WAL coin type
const WAL_COIN_TYPE =
  '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';

// WAL has 9 decimal places on Sui
const WAL_DECIMALS = 9;

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
  const pool = await context.blockchain.txBuildClient.getObject({
    id: ADMIN.ALPHA_SLUSH_WAL_LOOP_POOL_ID,
    options: { showContent: true },
  });

  if (!pool.data?.content || pool.data.content.dataType !== 'moveObject') {
    throw new Error('WAL locked pool object not found on chain.');
  }

  const content = pool.data.content as SuiMoveObject;
  const poolFields = content.fields as Record<string, unknown>;
  const externalRewardsInfo = poolFields.external_rewards_info as Record<string, unknown>;
  const rewardsInfo =
    ((externalRewardsInfo?.fields as Record<string, unknown>) ?? externalRewardsInfo) ?? null;

  if (!rewardsInfo) {
    throw new Error('external_rewards_info field not found in pool object.');
  }

  const endTimeMs = Number((rewardsInfo.end_time as string | undefined) ?? 0);
  if (endTimeMs === 0) return null;

  const rewardPerMsField = rewardsInfo.reward_per_ms as Record<string, unknown>;
  const rewardPerMsFields = rewardPerMsField?.fields as Record<string, unknown> | undefined;
  const rewardPerMsRaw: string =
    ((rewardPerMsFields?.value ?? rewardPerMsField?.value) as string | undefined) ?? '0';

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
  const suiClient = context.blockchain.txBuildClient;

  // Find AdminCap owned by this wallet
  const ownedCaps = await suiClient.getOwnedObjects({
    owner: address,
    filter: {
      MoveModule: {
        package: ADMIN.ALPHA_SLUSH_FIRST_PACKAGE_ID,
        module: 'alphalend_slush_pool',
      },
    },
    options: { showType: true },
  });

  const adminCapObject = ownedCaps.data.find((obj: SuiObjectResponse) =>
    obj.data?.type?.includes('::alphalend_slush_pool::AdminCap'),
  );
  const adminCapId = adminCapObject?.data?.objectId;
  if (!adminCapId) {
    throw new Error(
      `No AdminCap found for address ${address}. Ensure this wallet owns the locked loop AdminCap.`,
    );
  }

  const alphalendClient = context.alphalendClient;
  await alphalendClient.updatePrices(tx, [WAL_COIN_TYPE]);

  // Merge all WAL coins and split the reward amount
  const mergedWalCoin = await context.blockchain.getCoinObject(tx, WAL_COIN_TYPE, address);
  const [rewardCoin] = tx.splitCoins(mergedWalCoin, [tx.pure.u64(amount)]);
  tx.transferObjects([mergedWalCoin], address);

  tx.moveCall({
    target: `${ADMIN.ALPHA_SLUSH_LATEST_PACKAGE_ID}::alphalend_slush_locked_loop_pool::add_external_rewards`,
    typeArguments: [WAL_COIN_TYPE],
    arguments: [
      tx.object(adminCapId),
      tx.object(ADMIN.ALPHA_SLUSH_VERSION),
      tx.object(ADMIN.ALPHA_SLUSH_WAL_LOOP_POOL_ID),
      rewardCoin,
      tx.pure.u64(startTimeMs),
      tx.pure.u64(endTimeMs),
      tx.object(ALPHALEND_LENDING_PROTOCOL_ID),
      tx.object(CLOCK_PACKAGE_ID),
    ],
  });
}
