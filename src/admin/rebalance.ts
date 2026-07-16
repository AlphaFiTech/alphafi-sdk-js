import { Transaction } from '@mysten/sui/transactions';
import { StrategyContext } from '../models/strategyContext.js';
import { REBALANCE_GAS_BUDGET, fetchServerBuiltTx } from '../services/transactionsApi.js';
import { getRebalanceCap } from './rebalanceCap.js';

const REBALANCEABLE_STRATEGY_TYPES = new Set(['Lp', 'AutobalanceLp', 'FungibleLp', 'Lyf']);

/**
 * Build a manual rebalance transaction for the given pool.
 *
 * The transaction is built server-side by alphafi-api (the Rust SDK owns the
 * per-pool move-call matrix). The returned Transaction has no sender set —
 * the wallet supplies it at signing.
 *
 * Returns `undefined` when the pool name is not a rebalanceable strategy
 * (AlphaVault, lending pools, etc.) or when the pool is not found.
 */
export async function getManualRebalanceUsingTicksTxb(
  poolName: string,
  address: string,
  lowerTick: string,
  upperTick: string,
  loops: number,
  context: StrategyContext,
  swap_using_bluefin?: boolean,
  rebalance_using_base_pool?: boolean,
): Promise<Transaction | undefined> {
  const rebalanceCap = await getRebalanceCap(address, context);
  if (!rebalanceCap) {
    throw new Error('No rebalance cap found for address');
  }

  const lower = Number.parseInt(lowerTick, 10);
  const upper = Number.parseInt(upperTick, 10);
  if (!Number.isInteger(lower) || !Number.isInteger(upper)) {
    throw new Error(`ticks must be integers (got ${lowerTick}, ${upperTick})`);
  }
  if (lower === upper) {
    throw new Error(`lowerTick and upperTick must differ (got ${lowerTick})`);
  }

  const labels = await context.getPoolLabels();

  // If a pool name was passed instead of a pool ID, resolve it to the actual pool ID.
  const resolvedPoolId = await context.getPoolIdByPoolName(poolName);

  const label = labels.get(resolvedPoolId || '');
  if (!label || !REBALANCEABLE_STRATEGY_TYPES.has(label.strategyType)) return undefined;

  return fetchServerBuiltTx(
    context.apiBaseUrl,
    'rebalance',
    {
      poolId: resolvedPoolId,
      rebalanceCapId: rebalanceCap,
      lowerTick: lower,
      upperTick: upper,
      loops,
      swapUsingBluefin: swap_using_bluefin ?? false,
      rebalanceUsingBasePool: rebalance_using_base_pool ?? false,
    },
    REBALANCE_GAS_BUDGET,
  );
}
