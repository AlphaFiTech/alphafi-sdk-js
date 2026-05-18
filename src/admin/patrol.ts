/**
 * Pool patrol: detect LP pools whose CLMM position is out of range.
 */

import BN from 'bn.js';
import { Decimal } from 'decimal.js';
import { TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { StrategyContext } from '../models/strategyContext.js';
import { LpPoolLabel } from '../strategies/lp.js';
import { LyfPoolLabel } from '../strategies/lyf.js';
import { AutobalanceLpPoolLabel } from '../strategies/autobalanceLp.js';
import { FungibleLpPoolLabel } from '../strategies/fungibleLp.js';

type ClmmPoolLabel = LpPoolLabel | LyfPoolLabel | AutobalanceLpPoolLabel | FungibleLpPoolLabel;

/**
 * `asMoveObject.contents.json` for Cetus / Bluefin CLMM parent pool Move objects
 * (same field names as on-chain; see e.g. `LpStrategy.parseParentPoolObject`).
 */
type ClmmParentPoolGraphqlJson = {
  current_sqrt_price: string;
};

/**
 * `asMoveObject.contents.json` for AlphaFi LP-style investor objects exposing
 * `lower_tick` / `upper_tick` (see `LpStrategy.parseInvestorObject`).
 */
type LpInvestorTicksGraphqlJson = {
  lower_tick: number | string;
  upper_tick: number | string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

async function getClmmLabels(
  context: StrategyContext,
  activeOnly: boolean,
): Promise<ClmmPoolLabel[]> {
  const labels = await context.getPoolLabels();
  const result: ClmmPoolLabel[] = [];
  for (const [, label] of labels) {
    if (
      !(
        label.strategyType === 'Lp' ||
        label.strategyType === 'Lyf' ||
        label.strategyType === 'AutobalanceLp' ||
        label.strategyType === 'FungibleLp'
      )
    ) {
      continue;
    }
    if (label.poolName === 'ALPHA') continue;
    if (activeOnly && !label.isActive) continue;
    const l = label as ClmmPoolLabel;
    if (!l.parentPoolId || !l.investorId) continue;
    result.push(l);
  }
  return result;
}

function tickRangeFromInvestorJson(
  json: LpInvestorTicksGraphqlJson | undefined,
): { lowerTick: number; upperTick: number } | null {
  if (json === undefined) return null;
  const upperBound = 443636;
  let lowerTick = Number(json.lower_tick);
  let upperTick = Number(json.upper_tick);
  if (Number.isNaN(lowerTick) || Number.isNaN(upperTick)) return null;
  if (lowerTick > upperBound) lowerTick = -~(lowerTick - 1);
  if (upperTick > upperBound) upperTick = -~(upperTick - 1);
  return { lowerTick, upperTick };
}

// ──────────────────────────────────────────────────────────────────────────────
// Public functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns a map of pool name → current price (as string) for all LP pools with
 * CLMM parent pool state (Cetus or Bluefin), including **inactive** pools, so
 * admin UIs that list retired strategies still get a spot price. Uses GraphQL
 * via `context.blockchain.multiGetObjects` for parent pool state.
 */
export async function getCurrentPoolPrice(context: StrategyContext): Promise<Map<string, string>> {
  const labels = await getClmmLabels(context, false);
  const result = new Map<string, string>();
  if (labels.length === 0) return result;

  const parentPoolIds = [...new Set(labels.map((l) => l.parentPoolId))];
  const parentPoolMap = await context.blockchain.multiGetObjects(parentPoolIds);

  await Promise.all(
    labels.map(async (label) => {
      try {
        const poolJson = parentPoolMap.get(label.parentPoolId) as
          | ClmmParentPoolGraphqlJson
          | undefined;
        const sqrtPriceStr = poolJson?.current_sqrt_price;
        if (!sqrtPriceStr) return;
        const coinADecimals = await context.getCoinDecimals(label.assetA.type);
        const coinBDecimals = await context.getCoinDecimals(label.assetB.type);
        const price = TickMath.sqrtPriceX64ToPrice(
          new BN(sqrtPriceStr),
          coinADecimals,
          coinBDecimals,
        );
        result.set(label.poolName, price.toString());
      } catch (err) {
        console.warn(`getCurrentPoolPrice: skipping ${label.poolName} —`, err);
      }
    }),
  );

  return result;
}

/**
 * Returns the pool names of all active LP pools whose current CLMM price is
 * outside the investor's position range [lowerPrice, upperPrice].
 * Uses GraphQL via `context.blockchain.multiGetObjects` for parent pools and investors.
 */
export async function poolPatrol(context: StrategyContext): Promise<string[]> {
  const labels = await getClmmLabels(context, true);
  const broken: string[] = [];
  if (labels.length === 0) return broken;

  const parentPoolIds = [...new Set(labels.map((l) => l.parentPoolId))];
  const investorIds = [...new Set(labels.map((l) => l.investorId))];

  const [parentPoolMap, investorMap] = await Promise.all([
    context.blockchain.multiGetObjects(parentPoolIds),
    context.blockchain.multiGetObjects(investorIds),
  ]);

  await Promise.all(
    labels.map(async (label) => {
      try {
        const poolJson = parentPoolMap.get(label.parentPoolId) as
          | ClmmParentPoolGraphqlJson
          | undefined;
        const sqrtPriceStr = poolJson?.current_sqrt_price;
        if (!sqrtPriceStr) return;

        const invJson = investorMap.get(label.investorId) as LpInvestorTicksGraphqlJson | undefined;
        const ticks = tickRangeFromInvestorJson(invJson);
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
      } catch (err) {
        console.warn(`poolPatrol: skipping ${label.poolName} —`, err);
      }
    }),
  );

  return broken;
}
