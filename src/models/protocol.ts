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
import { Strategy } from '../strategies/strategy.js';
import { PoolData } from './types.js';

export class Protocol {
  strategyContext: StrategyContext;
  private strategies: Map<string, Strategy>;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private lastInitializedAt: number | null = null;
  private static readonly STRATEGIES_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(strategyContext: StrategyContext) {
    this.strategyContext = strategyContext;
    this.strategies = new Map<string, Strategy>();
  }

  /**
   * Ensure strategies are initialized and refreshed at most every STRATEGIES_TTL_MS.
   */
  async ensureInitialized() {
    const now = Date.now();
    const isFresh =
      this.isInitialized &&
      this.lastInitializedAt !== null &&
      now - this.lastInitializedAt < Protocol.STRATEGIES_TTL_MS;

    if (isFresh) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.init().finally(() => {
      this.initializationPromise = null;
    });

    return this.initializationPromise;
  }

  async getAllStrategies(): Promise<Map<string, Strategy>> {
    await this.ensureInitialized();
    return this.strategies;
  }

  async getAllPoolsData(): Promise<PoolData[]> {
    await this.ensureInitialized();
    return Promise.all(Array.from(this.strategies.values()).map((strategy) => strategy.getData()));
  }

  /**
   * Build and cache all strategies keyed by poolId.
   */
  private async init() {
    this.strategies = await this.buildAllPoolStrategies();
    this.isInitialized = true;
    this.lastInitializedAt = Date.now();
  }

  /**
   * Internal helper to construct strategies map from on-chain data.
   */
  private async buildAllPoolStrategies(): Promise<Map<string, Strategy>> {
    const poolIds = Array.from(this.strategyContext.poolLabels.values()).map(
      (poolLabel) => poolLabel.poolId,
    );
    const investorIds = Array.from(this.strategyContext.poolLabels.values())
      .filter((poolLabel) => 'investorId' in poolLabel && poolLabel.investorId)
      .map((poolLabel) => (poolLabel as any).investorId);
    const parentPoolIds = Array.from(this.strategyContext.poolLabels.values())
      .filter((poolLabel) => 'parentPoolId' in poolLabel && poolLabel.parentPoolId)
      .map((poolLabel) => (poolLabel as any).parentPoolId);

    const [poolObjects, investorObjects, parentPoolObjects] = await Promise.all([
      this.strategyContext.blockchain.multiGetObjects(poolIds),
      this.strategyContext.blockchain.multiGetObjects(investorIds),
      this.strategyContext.blockchain.multiGetObjects(parentPoolIds),
    ]);

    const resMap: Map<string, Strategy> = new Map();
    this.strategyContext.poolLabels.forEach((poolLabel) => {
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
