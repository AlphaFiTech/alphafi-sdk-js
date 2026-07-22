/**
 * Tick and price utilities for LP pool rebalance admin operations.
 * These are used by the Rebalance and PriceToTick admin UI components.
 */

import BN from 'bn.js';
import { Decimal } from 'decimal.js';
import { TickMath } from '@cetusprotocol/common-sdk';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel } from '../strategies/strategy.js';
import { LyfPoolLabel } from '../strategies/lyf.js';
import { AutobalanceLpPoolLabel } from '../strategies/autobalanceLp.js';
import { FungibleLpPoolLabel } from '../strategies/fungibleLp.js';

type ClmmLabel = LpPoolLabel | LyfPoolLabel | AutobalanceLpPoolLabel | FungibleLpPoolLabel;

/** GraphQL `contents.json` for CLMM parent pool (sqrt price). */
type ClmmParentPoolGraphqlJson = {
  current_sqrt_price: string;
};

/** GraphQL `contents.json` for LP-style investor position ticks. */
type LpInvestorTicksGraphqlJson = {
  lower_tick: number | string;
  upper_tick: number | string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Find an active CLMM pool label (Lp or Lyf) by pool name.
 * Both strategy types expose parentPoolId and investorId which are needed
 * by getCurrentTick, getPositionTicks, and getTickSpacing.
 */
async function getClmmLabelByName(
  poolName: string,
  context: StrategyContext,
): Promise<ClmmLabel> {
  const labels = await context.getPoolLabels();
  for (const [, label] of labels) {
    if (
      label.poolName === poolName &&
      (label.strategyType === 'Lp' ||
        label.strategyType === 'Lyf' ||
        label.strategyType === 'AutobalanceLp' ||
        label.strategyType === 'FungibleLp')
    ) {
      return label as ClmmLabel;
    }
  }
  throw new Error(`CLMM pool not found in registry: ${poolName}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Public functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Get the current CLMM tick index for a pool's parent pool (via GraphQL).
 */
export async function getCurrentTick(poolName: string, context: StrategyContext): Promise<number> {
  const label = await getClmmLabelByName(poolName, context);
  const json = (await context.blockchain.getObject(label.parentPoolId)) as
    | ClmmParentPoolGraphqlJson
    | undefined;
  const currentSqrtPrice = json?.current_sqrt_price;
  if (!currentSqrtPrice) {
    throw new Error(`Cannot read current_sqrt_price for parent pool ${poolName}`);
  }
  return TickMath.sqrtPriceX64ToTickIndex(new BN(currentSqrtPrice));
}

/**
 * Get the current lower and upper tick indexes from the investor object (via GraphQL).
 * Ticks stored on-chain as unsigned 32-bit two's complement for negative values.
 */
export async function getPositionTicks(
  poolName: string,
  context: StrategyContext,
): Promise<[number, number]> {
  const upperBound = 443636;
  const label = await getClmmLabelByName(poolName, context);
  const json = (await context.blockchain.getObject(label.investorId)) as
    | LpInvestorTicksGraphqlJson
    | undefined;
  if (json?.lower_tick === undefined || json?.upper_tick === undefined) {
    throw new Error(`Cannot read investor ticks for ${poolName}`);
  }
  let lowerTick = Number(json.lower_tick);
  let upperTick = Number(json.upper_tick);
  if (Number.isNaN(lowerTick) || Number.isNaN(upperTick)) {
    throw new Error(`Invalid tick values for ${poolName}`);
  }
  if (lowerTick > upperBound) lowerTick = -~(lowerTick - 1);
  if (upperTick > upperBound) upperTick = -~(upperTick - 1);
  return [lowerTick, upperTick];
}

/**
 * Convert a tick index to a human-readable price string.
 * coinADecimals and coinBDecimals should be fetched from StrategyContext first.
 */
export function getTickToPrice(tick: number, coinADecimals: number, coinBDecimals: number): string {
  const price = TickMath.tickIndexToPrice(tick, coinADecimals, coinBDecimals);
  return price.toString();
}

/**
 * Convert a price string to the nearest valid tick index, snapped to the
 * given tick spacing.  The rounding direction matches the legacy behaviour:
 * upper ticks are rounded up (away from zero), lower ticks are rounded down.
 *
 * coinADecimals and coinBDecimals should be fetched from StrategyContext first.
 */
export function getPriceToTick(
  price: string,
  tickSpacing: number,
  coinADecimals: number,
  coinBDecimals: number,
  isUpper: boolean = false,
): number {
  let tick = TickMath.priceToTickIndex(
    new Decimal(price),
    coinADecimals,
    coinBDecimals,
  );
  if (tick % tickSpacing) {
    if (isUpper === tick > 0) {
      tick = tick + tickSpacing - (tick % tickSpacing);
    } else {
      tick = tick - (tick % tickSpacing);
    }
  }
  return tick;
}

/**
 * Get the tick spacing for a pool's parent CLMM (via GraphQL).
 * Cetus pools: `tick_spacing` directly on pool fields.
 * Bluefin pools: nested under `ticks_manager.fields.tick_spacing` when present.
 */
export async function getTickSpacing(
  poolName: string,
  context: StrategyContext,
): Promise<number> {
  const label = await getClmmLabelByName(poolName, context);
  const json = await context.blockchain.getObject(label.parentPoolId);
  if (json == null || typeof json !== 'object') {
    throw new Error(`Cannot read parent pool JSON for ${label.poolName}`);
  }
  const j = json as Record<string, unknown>;

  if (label.parentProtocol === 'Cetus') {
    const v = j.tick_spacing;
    if (v === undefined || v === null) {
      throw new Error(`Missing tick_spacing for Cetus parent pool ${label.poolName}`);
    }
    return Number(v);
  }

  const tm = j.ticks_manager as Record<string, unknown> | undefined;
  const nested =
    (tm?.fields as Record<string, unknown> | undefined)?.tick_spacing ?? tm?.tick_spacing;
  const flat = j.tick_spacing;
  const n = Number(nested ?? flat ?? 1);
  if (!Number.isFinite(n)) {
    throw new Error(`Cannot read tick_spacing for Bluefin parent pool ${label.poolName}`);
  }
  return n;
}
