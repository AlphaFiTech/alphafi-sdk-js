/**
 * Pool patrol: detect LP pools whose CLMM position is out of range.
 */

import BN from 'bn.js';
import { Decimal } from 'decimal.js';
import { TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { SuiClient } from '@mysten/sui/client';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel } from '../strategies/lp.js';

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

async function getActiveLpLabels(context: StrategyContext): Promise<LpPoolLabel[]> {
  const labels = await context.getPoolLabels();
  const result: LpPoolLabel[] = [];
  for (const [, label] of labels) {
    if (label.strategyType === 'Lp' && label.isActive && label.poolName !== 'ALPHA') {
      result.push(label as LpPoolLabel);
    }
  }
  return result;
}

async function fetchPoolSqrtPrice(parentPoolId: string, suiClient: SuiClient): Promise<string | null> {
  try {
    const obj = await suiClient.getObject({
      id: parentPoolId,
      options: { showContent: true },
    });
    return (obj.data?.content as any)?.fields?.current_sqrt_price ?? null;
  } catch {
    return null;
  }
}

async function fetchInvestorTicks(
  investorId: string,
  suiClient: SuiClient,
): Promise<{ lowerTick: number; upperTick: number } | null> {
  try {
    const obj = await suiClient.getObject({
      id: investorId,
      options: { showContent: true },
    });
    const fields = (obj.data?.content as any)?.fields;
    if (!fields) return null;
    const upperBound = 443636;
    let lowerTick = Number(fields.lower_tick);
    let upperTick = Number(fields.upper_tick);
    if (lowerTick > upperBound) lowerTick = -~(lowerTick - 1);
    if (upperTick > upperBound) upperTick = -~(upperTick - 1);
    return { lowerTick, upperTick };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns a map of pool name → current price (as string) for all active LP pools
 * that are managed by a CLMM protocol (Cetus or Bluefin).
 */
export async function getCurrentCetusPoolPrice(
  context: StrategyContext,
  suiClient: SuiClient,
): Promise<Map<string, string>> {
  const labels = await getActiveLpLabels(context);
  const result = new Map<string, string>();

  await Promise.all(
    labels.map(async (label) => {
      const sqrtPriceStr = await fetchPoolSqrtPrice(label.parentPoolId, suiClient);
      if (!sqrtPriceStr) return;

      const coinADecimals = await context.getCoinDecimals(label.assetA.type);
      const coinBDecimals = await context.getCoinDecimals(label.assetB.type);

      const price = TickMath.sqrtPriceX64ToPrice(
        new BN(sqrtPriceStr),
        coinADecimals,
        coinBDecimals,
      );
      result.set(label.poolName, price.toString());
    }),
  );

  return result;
}

/**
 * Returns the pool names of all active LP pools whose current CLMM price is
 * outside the investor's position range [lowerPrice, upperPrice].
 */
export async function poolPatrol(
  context: StrategyContext,
  suiClient: SuiClient,
): Promise<string[]> {
  const labels = await getActiveLpLabels(context);
  const broken: string[] = [];

  await Promise.all(
    labels.map(async (label) => {
      const sqrtPriceStr = await fetchPoolSqrtPrice(label.parentPoolId, suiClient);
      if (!sqrtPriceStr) return;

      const ticks = await fetchInvestorTicks(label.investorId, suiClient);
      if (!ticks) return;

      const coinADecimals = await context.getCoinDecimals(label.assetA.type);
      const coinBDecimals = await context.getCoinDecimals(label.assetB.type);

      const currentPrice = TickMath.sqrtPriceX64ToPrice(
        new BN(sqrtPriceStr),
        coinADecimals,
        coinBDecimals,
      );
      const lowerPrice = TickMath.tickIndexToPrice(ticks.lowerTick, coinADecimals, coinBDecimals);
      const upperPrice = TickMath.tickIndexToPrice(ticks.upperTick, coinADecimals, coinBDecimals);

      const curr = new Decimal(currentPrice.toString());
      const lower = new Decimal(lowerPrice.toString());
      const upper = new Decimal(upperPrice.toString());

      if (curr.lessThan(lower) || curr.greaterThan(upper)) {
        broken.push(label.poolName);
      }
    }),
  );

  return broken;
}
