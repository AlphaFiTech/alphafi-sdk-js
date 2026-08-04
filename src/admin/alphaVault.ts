/**
 * Alpha Vault (Ember) admin operations.
 * These functions are exclusively for the ALPHA/AlphaVault pool.
 */

import { Transaction } from '@mysten/sui/transactions';
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
  amount: bigint,
  context: StrategyContext,
) {
  try {
    return context.blockchain.getCoinObject(tx, coinType, address, amount);
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
  const { object } = await context.blockchain.suiGrpcClient.core.getObject({
    objectId: label.poolId,
    include: { json: true },
  });
  const fields = object?.json as Record<string, unknown> | undefined;
  if (!fields) throw new Error('Alpha pool data not found');

  const unsuppliedAmount = String(fields.unsupplied_balance ?? '0');
  const withdrawRequestsField = fields.withdraw_requests as
    | { contents?: { key: string; value: { leftover_amount: string } }[] }
    | undefined;

  const withdrawRequests = (withdrawRequestsField?.contents ?? []).map((entry) => ({
    withdrawRequestAmount: String(entry.value.leftover_amount),
    settleRequestTime: String(entry.key),
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

  const coin = await tryGetCoinObject(tx, typeT, address, BigInt(amount), context);
  if (!coin) throw new Error('no coin available');

  tx.moveCall({
    target: `${label.packageId}::interface::process_withdraw_requests_manual`,
    typeArguments: [typeT],
    arguments: [tx.object(VERSIONS.ALPHA_EMBER), tx.object(label.poolId), coin],
  });
}

/**
 * Build a transaction that collects unsupplied balance from the ALPHA pool.
 */
export function collectUnsuppliedBalanceTxb(tx: Transaction, label: AlphaVaultPoolLabel): void {
  tx.moveCall({
    target: `${label.packageId}::interface::collect_unsupplied_balance`,
    typeArguments: [label.asset.type],
    arguments: [tx.object(VERSIONS.ALPHA_EMBER), tx.object(label.poolId)],
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

  const coin = await tryGetCoinObject(tx, typeR, address, BigInt(amount), context);
  if (!coin) throw new Error('no coin available');

  tx.moveCall({
    target: `${label.packageId}::interface::add_airdrop_coin`,
    typeArguments: [typeT, typeR],
    arguments: [tx.object(VERSIONS.ALPHA_EMBER), tx.object(label.poolId), coin],
  });
}
