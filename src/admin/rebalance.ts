import { Transaction } from '@mysten/sui/transactions';
import { StrategyContext } from '../models/strategyContext.js';
import { AutobalanceLpPoolLabel, AutobalanceLpStrategy } from '../strategies/autobalanceLp.js';
import { FungibleLpPoolLabel, FungibleLpStrategy } from '../strategies/fungibleLp.js';
import { LpPoolLabel, LpStrategy } from '../strategies/lp.js';
import { LyfPoolLabel, LyfStrategy } from '../strategies/lyf.js';
import { getRebalanceCap } from './rebalanceCap.js';

/**
 * Build a manual rebalance transaction for the given pool.
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

  if (lowerTick === upperTick) {
    throw new Error(`lowerTick and upperTick must differ (got ${lowerTick})`);
  }

  const labels = await context.getPoolLabels();

  // If a pool name was passed instead of a pool ID, resolve it to the actual pool ID.
  const resolvedPoolId = await context.getPoolIdByPoolName(poolName);

  const label = labels.get(resolvedPoolId || '');
  if (!label) return undefined;

  const tx = new Transaction();

  switch (label.strategyType) {
    case 'Lp': {
      const lpLabel = label as LpPoolLabel;
      const strategy = new LpStrategy(lpLabel, {}, {}, {}, context);
      await strategy.rebalanceLp(
        tx,
        lpLabel,
        rebalanceCap,
        lowerTick,
        upperTick,
        loops,
        context,
        swap_using_bluefin,
        rebalance_using_base_pool,
      );
      break;
    }
    case 'AutobalanceLp': {
      const autobalanceLpLabel = label as AutobalanceLpPoolLabel;
      const strategy = new AutobalanceLpStrategy(autobalanceLpLabel, {}, {}, {}, context);
      await strategy.rebalanceLp(
        tx,
        rebalanceCap,
        lowerTick,
        upperTick,
        loops,
        context,
        swap_using_bluefin,
      );
      break;
    }
    case 'FungibleLp': {
      const fungibleLpLabel = label as FungibleLpPoolLabel;
      const strategy = new FungibleLpStrategy(fungibleLpLabel, {}, {}, {}, context);
      await strategy.rebalanceFungibleLp(
        tx,
        fungibleLpLabel,
        rebalanceCap,
        lowerTick,
        upperTick,
        context,
      );
      break;
    }
    case 'Lyf': {
      const lyfLabel = label as LyfPoolLabel;
      const strategy = new LyfStrategy(lyfLabel, {}, {}, context);
      await strategy.rebalanceLyf(tx, lyfLabel, rebalanceCap, lowerTick, upperTick, loops, context);
      break;
    }
    default:
      return undefined;
  }

  return tx;
}
