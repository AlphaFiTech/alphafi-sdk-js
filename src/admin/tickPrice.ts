/**
 * Tick and price utilities for LP pool rebalance admin operations.
 * These are used by the Rebalance and PriceToTick admin UI components.
 */

import BN from 'bn.js';
import { Decimal } from 'decimal.js';
import { TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { SuiClient } from '@mysten/sui/client';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel } from '../strategies/strategy.js';

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

async function getLpLabelByName(
  poolName: string,
  context: StrategyContext,
): Promise<LpPoolLabel> {
  const labels = await context.getPoolLabels();
  for (const [, label] of labels) {
    if (label.poolName === poolName && label.strategyType === 'Lp') {
      return label as LpPoolLabel;
    }
  }
  throw new Error(`LP pool not found in registry: ${poolName}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Public functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Get the current CLMM tick index for a pool's parent pool.
 */
export async function getCurrentTick(
  poolName: string,
  context: StrategyContext,
  suiClient: SuiClient,
): Promise<number> {
  const label = await getLpLabelByName(poolName, context);
  const pool = await suiClient.getObject({
    id: label.parentPoolId,
    options: { showContent: true },
  });
  const fields = (pool.data?.content as any)?.fields;
  if (!fields) throw new Error(`Cannot read parent pool fields for ${poolName}`);
  const currentSqrtPrice = fields.current_sqrt_price as string;
  return TickMath.sqrtPriceX64ToTickIndex(new BN(currentSqrtPrice));
}

/**
 * Get the current lower and upper tick indexes from the investor object.
 * Ticks stored on-chain as unsigned 32-bit two's complement for negative values.
 */
export async function getPositionTicks(
  poolName: string,
  context: StrategyContext,
  suiClient: SuiClient,
): Promise<[number, number]> {
  const upperBound = 443636;
  const label = await getLpLabelByName(poolName, context);
  const investor = await suiClient.getObject({
    id: label.investorId,
    options: { showContent: true },
  });
  const fields = (investor.data?.content as any)?.fields;
  if (!fields) throw new Error(`Cannot read investor fields for ${poolName}`);
  let lowerTick = Number(fields.lower_tick);
  let upperTick = Number(fields.upper_tick);
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
 * Get the tick spacing for a pool's parent CLMM.
 * Cetus pools: `tick_spacing` directly on pool fields.
 * Bluefin pools: nested under `ticks_manager.fields.tick_spacing`.
 */
export async function getTickSpacing(
  poolName: string,
  context: StrategyContext,
  suiClient: SuiClient,
): Promise<number> {
  const label = await getLpLabelByName(poolName, context);
  const pool = await suiClient.getObject({
    id: label.parentPoolId,
    options: { showContent: true },
  });
  const fields = (pool.data?.content as any)?.fields;
  if (!fields) throw new Error(`Cannot read parent pool fields for ${poolName}`);

  if (label.parentProtocol === 'Cetus') {
    return Number(fields.tick_spacing);
  }
  // Bluefin
  return Number(fields.ticks_manager?.fields?.tick_spacing ?? fields.tick_spacing ?? 1);
}
