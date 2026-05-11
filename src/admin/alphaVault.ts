/**
 * Alpha Vault (Ember) admin operations.
 * These functions are exclusively for the ALPHA/AlphaVault pool.
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiMoveObject } from '@mysten/sui/client';
import { StrategyContext } from '../models/strategyContext.js';
import { AlphaVaultPoolLabel } from '../strategies/alphaVault.js';
import { VERSIONS } from '../utils/constants.js';

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

async function getAlphaLabel(context: StrategyContext): Promise<AlphaVaultPoolLabel> {
  const labels = await context.getPoolLabels();
  for (const [, label] of labels) {
    if (label.strategyType === 'AlphaVault') {
      return label as AlphaVaultPoolLabel;
    }
  }
  throw new Error('AlphaVault pool label not found in registry');
}

/** Like blockchain.getCoinObject but returns undefined instead of throwing when no coins exist. */
async function tryGetCoinObject(
  tx: Transaction,
  coinType: string,
  address: string,
  context: StrategyContext,
) {
  try {
    return await context.blockchain.getCoinObject(tx, coinType, address);
  } catch {
    return undefined;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Exported admin functions
// ──────────────────────────────────────────────────────────────────────────────

export interface WithdrawRequestsAndUnsuppliedAmount {
  unsuppliedAmount: string;
  withdrawRequests: {
    withdrawRequestAmount: string;
    settleRequestTime: string;
  }[];
}

/**
 * Read unsupplied balance and pending withdraw requests from the ALPHA pool.
 */
export async function getWithdrawRequestsAndUnsuppliedAmount(
  context: StrategyContext,
): Promise<WithdrawRequestsAndUnsuppliedAmount> {
  const label = await getAlphaLabel(context);
  const pool = await context.blockchain.txBuildClient.getObject({
    id: label.poolId,
    options: { showContent: true },
  });
  if (!pool.data?.content) throw new Error('Alpha pool data not found');

  const fields = (pool.data.content as SuiMoveObject).fields as Record<string, unknown>;
  const unsuppliedAmount = String(fields.unsupplied_balance ?? '0');
  const rawRequests = (fields.withdraw_requests as any)?.fields?.contents ?? [];

  const withdrawRequests = rawRequests.map((entry: any) => ({
    withdrawRequestAmount: entry.fields.value.fields.leftover_amount.toString(),
    settleRequestTime: entry.fields.key.toString(),
  }));

  return { unsuppliedAmount, withdrawRequests };
}

/**
 * Build a transaction that processes pending manual withdraw requests.
 * The wallet must hold enough of the alpha-pool's underlying coin.
 *
 * @param tx   An existing transaction to append to.
 * @param amount   Amount in base units (e.g. raw lamports).
 * @param address  Wallet address that holds the coin.
 */
export async function processWithdrawRequestsManualTxb(
  tx: Transaction,
  amount: string,
  address: string,
  context: StrategyContext,
): Promise<void> {
  const label = await getAlphaLabel(context);
  const typeT = label.asset.type;

  const coin = await tryGetCoinObject(tx, typeT, address, context);
  if (!coin) throw new Error('no coin available');

  const finalCoin = tx.splitCoins(coin, [amount]);
  tx.transferObjects([coin], address);

  tx.moveCall({
    target: `${label.packageId}::interface::process_withdraw_requests_manual`,
    typeArguments: [typeT],
    arguments: [
      tx.object(VERSIONS.ALPHA_EMBER),
      tx.object(label.poolId),
      tx.object(finalCoin),
    ],
  });
}

/**
 * Build a transaction that collects unsupplied balance from the ALPHA pool.
 */
export function collectUnsuppliedBalanceTxb(
  tx: Transaction,
  label: AlphaVaultPoolLabel,
): void {
  tx.moveCall({
    target: `${label.packageId}::interface::collect_unsupplied_balance`,
    typeArguments: [label.asset.type],
    arguments: [
      tx.object(VERSIONS.ALPHA_EMBER),
      tx.object(label.poolId),
    ],
  });
}

/**
 * Convenience wrapper: resolves the ALPHA label then calls collectUnsuppliedBalanceTxb.
 */
export async function collectUnsuppliedBalance(
  tx: Transaction,
  context: StrategyContext,
): Promise<void> {
  const label = await getAlphaLabel(context);
  collectUnsuppliedBalanceTxb(tx, label);
}

/**
 * Build a transaction that adds a SUI airdrop coin to the ALPHA pool.
 *
 * @param tx       An existing transaction to append to.
 * @param amount   SUI amount in MIST (base units).
 * @param address  Wallet address that holds the SUI.
 */
export async function addAirdropCoinTxb(
  tx: Transaction,
  amount: string,
  address: string,
  context: StrategyContext,
): Promise<void> {
  const label = await getAlphaLabel(context);
  const typeT = label.asset.type;
  const typeR = '0x2::sui::SUI';

  const coin = await tryGetCoinObject(tx, typeR, address, context);
  if (!coin) throw new Error('no coin available');

  const finalCoin = tx.splitCoins(coin, [amount]);
  tx.transferObjects([coin], address);

  tx.moveCall({
    target: `${label.packageId}::interface::add_airdrop_coin`,
    typeArguments: [typeT, typeR],
    arguments: [
      tx.object(VERSIONS.ALPHA_EMBER),
      tx.object(label.poolId),
      tx.object(finalCoin),
    ],
  });
}
