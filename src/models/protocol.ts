/**
 * Core protocol manager that handles strategy initialization and data retrieval.
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

export class Protocol {
  strategyContext: StrategyContext;
  private strategies: Map<string, Strategy>;
  private lastInitializedAtByType: Map<StrategyType, number> = new Map();
  private initializationPromise: Promise<void> | null = null;
  private static readonly STRATEGIES_TTL_MS = 5 * 60 * 1000; // Strategy cache TTL

  constructor(strategyContext: StrategyContext) {
    this.strategyContext = strategyContext;
    this.strategies = new Map<string, Strategy>();
  }

  /** Get initialized strategies, optionally filtered by type. */
  async getStrategies(strategiesType?: StrategyType[]): Promise<Map<string, Strategy>> {
    await this.ensureInitialized(strategiesType);

    if (!strategiesType) {
      return this.strategies;
    }

    return new Map(
      Array.from(this.strategies.values())
        .filter((strategy) => strategiesType.includes(strategy.getPoolLabel().strategyType))
        .map((strategy) => [strategy.getPoolLabel().poolId, strategy]),
    );
  }

  /** Get pool data from strategies, optionally filtered by type. */
  async getPoolsData(strategiesType?: StrategyType[]): Promise<Map<string, PoolData>> {
    const strategies = await this.getStrategies(strategiesType);
    const poolsData = await Promise.all(
      Array.from(strategies.values()).map((strategy) => strategy.getData()),
    );
    return new Map(poolsData.map((poolData) => [poolData.poolId, poolData]));
  }

  /** Ensure strategies are initialized and refreshed if stale. Handles concurrent calls. */
  private async ensureInitialized(strategiesType?: StrategyType[]) {
    let typesToBuild = this.getTypesToBuild(strategiesType);

    if (typesToBuild.length === 0) {
      return;
    }

    this.clearStrategiesOfTypes(typesToBuild);

    // Handle concurrent initialization
    if (this.initializationPromise) {
      await this.initializationPromise;
      typesToBuild = this.getTypesToBuild(strategiesType);
      if (typesToBuild.length === 0) {
        return;
      }
      this.clearStrategiesOfTypes(typesToBuild);
    }

    this.initializationPromise = this.init(typesToBuild).finally(() => {
      this.initializationPromise = null;
    });

    return this.initializationPromise;
  }

  /** Build and cache strategies for specified types. */
  private async init(strategiesType: StrategyType[]) {
    const newStrategies = await this.buildPoolStrategies(strategiesType);

    newStrategies.forEach((strategy, poolId) => {
      this.strategies.set(poolId, strategy);
    });

    const now = Date.now();
    strategiesType.forEach((type) => this.lastInitializedAtByType.set(type, now));
  }

  /** Check if strategy type is within TTL. */
  private isTypeFresh(type: StrategyType): boolean {
    const lastInit = this.lastInitializedAtByType.get(type);
    if (!lastInit) return false;
    return Date.now() - lastInit < Protocol.STRATEGIES_TTL_MS;
  }

  /** Remove strategies of specified types from cache. */
  private clearStrategiesOfTypes(types: StrategyType[]) {
    const typeSet = new Set(types);
    for (const [poolId, strategy] of this.strategies) {
      if (typeSet.has(strategy.getPoolLabel().strategyType)) {
        this.strategies.delete(poolId);
      }
    }
    types.forEach((type) => this.lastInitializedAtByType.delete(type));
  }

  /** Get strategy types that need rebuilding (stale or never initialized). */
  private getTypesToBuild(strategiesType?: StrategyType[]): StrategyType[] {
    const requestedTypes =
      strategiesType ??
      Array.from(
        new Set(
          Array.from(this.strategyContext.poolLabels.values()).map((label) => label.strategyType),
        ),
      );
    return requestedTypes.filter((type) => !this.isTypeFresh(type));
  }

  /** Build strategies from on-chain data for specified types. */
  private async buildPoolStrategies(
    strategiesType: StrategyType[],
  ): Promise<Map<string, Strategy>> {
    const poolLabels: PoolLabel[] = Array.from(this.strategyContext.poolLabels.values()).filter(
      (poolLabel) => strategiesType.includes(poolLabel.strategyType),
    );

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
      }
    });
    return resMap;
  }
}
