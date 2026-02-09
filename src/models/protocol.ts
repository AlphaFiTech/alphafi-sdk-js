/**
 * Core protocol manager that handles strategy initialization and data retrieval.
 * Uses per-pool caching for granular cache management.
 */
import { StrategyContext } from './strategyContext.js';
import { LpPoolLabel, LpStrategy } from '../strategies/lp.js';
import { LyfPoolLabel, LyfStrategy } from '../strategies/lyf.js';
import { AutobalanceLpPoolLabel, AutobalanceLpStrategy } from '../strategies/autobalanceLp.js';
import { FungibleLpPoolLabel, FungibleLpStrategy } from '../strategies/fungibleLp.js';
import { AlphaVaultPoolLabel, AlphaVaultStrategy } from '../strategies/alphaVault.js';
import { LendingPoolLabel, LendingStrategy } from '../strategies/lending.js';
import { SlushLendingStrategy } from '../strategies/slushLending.js';
import { LoopingPoolLabel, LoopingStrategy } from '../strategies/looping.js';
import {
  SingleAssetLoopingPoolLabel,
  SingleAssetLoopingStrategy,
} from '../strategies/singleAssetLooping.js';
import { PoolLabel, Strategy, StrategyType } from '../strategies/strategy.js';
import { PoolData } from './types.js';
import { Cache } from '../utils/cache.js';
import { CACHE_TTL } from '../utils/constants.js';
import { FungibleLendingStrategy } from '../strategies/fungibleLending.js';

export class Protocol {
  strategyContext: StrategyContext;
  private strategyCache: Cache<string, Strategy>;

  constructor(strategyContext: StrategyContext) {
    this.strategyContext = strategyContext;
    this.strategyCache = new Cache<string, Strategy>(CACHE_TTL.STRATEGY_CACHE);
  }

  /** Get pool data from strategies, optionally filtered by type. */
  async getPoolsData(strategiesType?: StrategyType[]): Promise<Map<string, PoolData>> {
    const strategies = await this.getStrategies(strategiesType);
    const poolsData = await Promise.all(
      Array.from(strategies.values()).map((strategy) => strategy.getData()),
    );
    return new Map(poolsData.map((poolData) => [poolData.poolId, poolData]));
  }

  /** Get initialized strategies, optionally filtered by type. */
  async getStrategies(strategiesType?: StrategyType[]): Promise<Map<string, Strategy>> {
    const poolLabels = await this.strategyContext.getPoolLabels();

    // Filter by strategy types if specified
    const filteredLabels = strategiesType
      ? Array.from(poolLabels.values()).filter((label) =>
          strategiesType.includes(label.strategyType),
        )
      : Array.from(poolLabels.values());

    // Get pool IDs that need to be built (not in cache or expired)
    const poolIdsToBuild: string[] = [];
    const cachedStrategies: Map<string, Strategy> = new Map();

    for (const label of filteredLabels) {
      const cached = this.strategyCache.get(label.poolId);
      if (cached) {
        cachedStrategies.set(label.poolId, cached);
      } else {
        poolIdsToBuild.push(label.poolId);
      }
    }

    // Build strategies for pools not in cache
    if (poolIdsToBuild.length > 0) {
      const labelsToBuild = poolIdsToBuild
        .map((id) => poolLabels.get(id))
        .filter((label): label is PoolLabel => label !== undefined);

      const newStrategies = await this.buildPoolStrategies(labelsToBuild);

      // Cache the new strategies
      newStrategies.forEach((strategy, poolId) => {
        this.strategyCache.set(poolId, strategy);
        cachedStrategies.set(poolId, strategy);
      });
    }

    return cachedStrategies;
  }

  /** Get a single pool strategy by poolId. Uses cache with lazy loading and promise memoization. */
  async getSinglePoolStrategy(poolId: string): Promise<Strategy> {
    return this.strategyCache.getOrFetch(poolId, async () => {
      const poolLabel = await this.strategyContext.getPoolLabel(poolId);
      if (!poolLabel) {
        throw new Error(`Pool label not found for poolId: ${poolId}`);
      }

      const strategies = await this.buildPoolStrategies([poolLabel]);
      const strategy = strategies.get(poolId);

      if (!strategy) {
        throw new Error(`Failed to build strategy for poolId: ${poolId}`);
      }

      return strategy;
    });
  }

  /** Build strategies from on-chain data for specified pool labels. */
  private async buildPoolStrategies(poolLabels: PoolLabel[]): Promise<Map<string, Strategy>> {
    if (poolLabels.length === 0) {
      return new Map();
    }

    const poolIds = poolLabels.map((poolLabel) => poolLabel.poolId);
    const investorIds = poolLabels
      .filter((poolLabel) => 'investorId' in poolLabel && poolLabel.investorId)
      .map((poolLabel) => (poolLabel as any).investorId);
    const parentPoolIds = poolLabels
      .filter((poolLabel) => 'parentPoolId' in poolLabel && poolLabel.parentPoolId)
      .map((poolLabel) => (poolLabel as any).parentPoolId);

    const [poolObjects, investorObjects, parentPoolObjects] = await Promise.all([
      this.strategyContext.blockchain.multiGetObjects(poolIds),
      this.strategyContext.blockchain.multiGetObjects(investorIds),
      this.strategyContext.blockchain.multiGetObjects(parentPoolIds),
    ]);

    const resMap: Map<string, Strategy> = new Map();
    poolLabels.forEach((poolLabel) => {
      switch (poolLabel.strategyType) {
        case 'Lp':
          resMap.set(
            poolLabel.poolId,
            new LpStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              investorObjects.get((poolLabel as LpPoolLabel).investorId),
              parentPoolObjects.get((poolLabel as LpPoolLabel).parentPoolId),
              this.strategyContext,
            ),
          );
          break;
        case 'Lyf':
          resMap.set(
            poolLabel.poolId,
            new LyfStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              parentPoolObjects.get((poolLabel as LyfPoolLabel).parentPoolId),
              this.strategyContext,
            ),
          );
          break;
        case 'AutobalanceLp':
          resMap.set(
            poolLabel.poolId,
            new AutobalanceLpStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              investorObjects.get((poolLabel as AutobalanceLpPoolLabel).investorId),
              parentPoolObjects.get((poolLabel as AutobalanceLpPoolLabel).parentPoolId),
              this.strategyContext,
            ),
          );
          break;
        case 'FungibleLp':
          resMap.set(
            poolLabel.poolId,
            new FungibleLpStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              investorObjects.get((poolLabel as FungibleLpPoolLabel).investorId),
              parentPoolObjects.get((poolLabel as FungibleLpPoolLabel).parentPoolId),
              this.strategyContext,
            ),
          );
          break;
        case 'AlphaVault':
          resMap.set(
            poolLabel.poolId,
            new AlphaVaultStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              investorObjects.get((poolLabel as AlphaVaultPoolLabel).investorId),
              this.strategyContext,
            ),
          );
          break;
        case 'Lending':
          resMap.set(
            poolLabel.poolId,
            new LendingStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              investorObjects.get((poolLabel as LendingPoolLabel).investorId),
              parentPoolObjects.get((poolLabel as LendingPoolLabel).parentPoolId),
              this.strategyContext,
            ),
          );
          break;
        case 'SlushLending':
          resMap.set(
            poolLabel.poolId,
            new SlushLendingStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              this.strategyContext,
            ),
          );
          break;
        case 'Looping':
          resMap.set(
            poolLabel.poolId,
            new LoopingStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              investorObjects.get((poolLabel as LoopingPoolLabel).investorId),
              this.strategyContext,
            ),
          );
          break;
        case 'SingleAssetLooping':
          resMap.set(
            poolLabel.poolId,
            new SingleAssetLoopingStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              investorObjects.get((poolLabel as SingleAssetLoopingPoolLabel).investorId),
              this.strategyContext,
            ),
          );
          break;
        case 'FungibleLending':
          resMap.set(
            poolLabel.poolId,
            new FungibleLendingStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              this.strategyContext,
            ),
          );
          break;
      }
    });
    return resMap;
  }

  /** Clear the strategy cache. */
  clearCache(): void {
    this.strategyCache.clear();
  }

  /** Clear cache for a specific pool. */
  clearPoolCache(poolId: string): void {
    this.strategyCache.delete(poolId);
  }
}
