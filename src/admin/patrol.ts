/**
 * Pool patrol: detect LP pools whose CLMM position is out of range.
 */

import BN from 'bn.js';
import { Decimal } from 'decimal.js';
import { TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { SuiClient } from '@mysten/sui/client';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel } from '../strategies/lp.js';
import { LyfPoolLabel } from '../strategies/lyf.js';
import { AutobalanceLpPoolLabel } from '../strategies/autobalanceLp.js';
import { FungibleLpPoolLabel } from '../strategies/fungibleLp.js';

type ClmmPoolLabel = LpPoolLabel | LyfPoolLabel | AutobalanceLpPoolLabel | FungibleLpPoolLabel;

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

async function getActiveClmmLabels(context: StrategyContext): Promise<ClmmPoolLabel[]> {
  const labels = await context.getPoolLabels();
  const result: ClmmPoolLabel[] = [];
  for (const [, label] of labels) {
    if (
      (label.strategyType === 'Lp' || label.strategyType === 'Lyf' || label.strategyType === 'AutobalanceLp' || label.strategyType === 'FungibleLp') &&
      label.isActive &&
      label.poolName !== 'ALPHA'
    ) {
      const l = label as ClmmPoolLabel;
      if (!l.parentPoolId || !l.investorId) continue;
      result.push(l);
    }
  }
  return result;
}

function parseSqrtPrice(obj: any): string | null {
  return (obj?.data?.content as any)?.fields?.current_sqrt_price ?? null;
}

function parseTicks(obj: any): { lowerTick: number; upperTick: number } | null {
  const fields = (obj?.data?.content as any)?.fields;
  if (!fields) return null;
  const upperBound = 443636;
  let lowerTick = Number(fields.lower_tick);
  let upperTick = Number(fields.upper_tick);
  if (lowerTick > upperBound) lowerTick = -~(lowerTick - 1);
  if (upperTick > upperBound) upperTick = -~(upperTick - 1);
  return { lowerTick, upperTick };
}

// ──────────────────────────────────────────────────────────────────────────────
// Public functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns a map of pool name → current price (as string) for all active LP pools
 * that are managed by a CLMM protocol (Cetus or Bluefin).
 */
async function batchGetObjects(ids: string[], suiClient: SuiClient): Promise<Map<string, any>> {
  const uniqueIds = [...new Set(ids)];
  const objs = await suiClient.multiGetObjects({ ids: uniqueIds, options: { showContent: true } });
  const map = new Map<string, any>();
  uniqueIds.forEach((id, i) => map.set(id, objs[i]));
  return map;
}

export async function getCurrentCetusPoolPrice(
  context: StrategyContext,
  suiClient: SuiClient,
): Promise<Map<string, string>> {
  const labels = await getActiveClmmLabels(context);
  const result = new Map<string, string>();
  if (labels.length === 0) return result;

  const parentPoolMap = await batchGetObjects(labels.map(l => l.parentPoolId), suiClient);

  await Promise.all(
    labels.map(async (label) => {
      try {
        const sqrtPriceStr = parseSqrtPrice(parentPoolMap.get(label.parentPoolId));
        if (!sqrtPriceStr) return;
        const coinADecimals = await context.getCoinDecimals(label.assetA.type);
        const coinBDecimals = await context.getCoinDecimals(label.assetB.type);
        const price = TickMath.sqrtPriceX64ToPrice(new BN(sqrtPriceStr), coinADecimals, coinBDecimals);
        result.set(label.poolName, price.toString());
      } catch (err) {
        console.warn(`getCurrentCetusPoolPrice: skipping ${label.poolName} —`, err);
      }
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
  const labels = await getActiveClmmLabels(context);
  const broken: string[] = [];
  if (labels.length === 0) return broken;

  // Two deduplicated batch RPC calls — avoids 429 rate limiting and duplicate ID errors
  const [parentPoolMap, investorMap] = await Promise.all([
    batchGetObjects(labels.map(l => l.parentPoolId), suiClient),
    batchGetObjects(labels.map(l => l.investorId), suiClient),
  ]);

  await Promise.all(
    labels.map(async (label) => {
      try {
        const sqrtPriceStr = parseSqrtPrice(parentPoolMap.get(label.parentPoolId));
        if (!sqrtPriceStr) return;

        const ticks = parseTicks(investorMap.get(label.investorId));
        if (!ticks) return;

        const coinADecimals = await context.getCoinDecimals(label.assetA.type);
        const coinBDecimals = await context.getCoinDecimals(label.assetB.type);

        const currentPrice = TickMath.sqrtPriceX64ToPrice(new BN(sqrtPriceStr), coinADecimals, coinBDecimals);
        const lowerPrice = TickMath.tickIndexToPrice(ticks.lowerTick, coinADecimals, coinBDecimals);
        const upperPrice = TickMath.tickIndexToPrice(ticks.upperTick, coinADecimals, coinBDecimals);

        const curr = new Decimal(currentPrice.toString());
        const lower = new Decimal(lowerPrice.toString());
        const upper = new Decimal(upperPrice.toString());

        if (curr.lessThan(lower) || curr.greaterThan(upper)) {
          broken.push(label.poolName);
        }
      } catch (err) {
        console.warn(`poolPatrol: skipping ${label.poolName} —`, err);
      }
    }),
  );

  return broken;
}
