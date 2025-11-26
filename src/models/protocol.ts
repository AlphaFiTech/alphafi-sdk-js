import { Blockchain } from './blockchain.js';
import { SuiClient } from '@mysten/sui/client';
import { StrategyContext } from './strategy_context.js';
import { PoolLabel } from '../strategies/strategy.js';
import { LpPoolLabel, LpStrategy } from '../strategies/lp.js';
import { LyfPoolLabel, LyfStrategy } from '../strategies/lyf.js';
import { AutobalanceLpPoolLabel, AutobalanceLpStrategy } from '../strategies/autobalanceLp.js';
import { FungibleLpPoolLabel, FungibleLpStrategy } from '../strategies/fungibleLp.js';
import { AlphaStrategy } from '../strategies/alpha.js';
import { LendingPoolLabel, LendingStrategy } from '../strategies/lending.js';
import { LoopingPoolLabel, LoopingStrategy } from '../strategies/looping.js';
import {
  SingleAssetLoopingPoolLabel,
  SingleAssetLoopingStrategy,
} from '../strategies/singleAssetLooping.js';

export class Protocol {
  suiClient: SuiClient;
  blockchain: Blockchain;
  strategyContext: StrategyContext;
  poolLabels: Map<string, PoolLabel>;

  constructor(
    suiClient: SuiClient,
    network: 'mainnet' | 'testnet' | 'devnet' | 'localnet',
    strategyContext: StrategyContext,
    poolLabels: Map<string, PoolLabel>,
  ) {
    this.suiClient = suiClient;
    this.blockchain = new Blockchain(suiClient, network);
    this.strategyContext = strategyContext;
    this.poolLabels = poolLabels;
  }

  async getAllPoolStrategies() {
    const poolIds = Array.from(this.poolLabels.values()).map((poolLabel) => poolLabel.poolId);
    const investorIds = Array.from(this.poolLabels.values())
      .filter((poolLabel) => 'investorId' in poolLabel && poolLabel.investorId)
      .map((poolLabel) => (poolLabel as any).investorId);
    const parentPoolIds = Array.from(this.poolLabels.values())
      .filter((poolLabel) => 'parentPoolId' in poolLabel && poolLabel.parentPoolId)
      .map((poolLabel) => (poolLabel as any).parentPoolId);
    const [poolObjects, investorObjects, parentPoolObjects] = await Promise.all([
      this.blockchain.multiGetObjects(poolIds),
      this.blockchain.multiGetObjects(investorIds),
      this.blockchain.multiGetObjects(parentPoolIds),
    ]);

    const resMap: Map<string, any> = new Map();
    this.poolLabels.forEach((poolLabel) => {
      switch (poolLabel.strategyType) {
        case 'Lp':
          resMap.set(
            poolLabel.poolId,
            new LpStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              investorObjects.get((poolLabel as LpPoolLabel).investorId),
              parentPoolObjects.get((poolLabel as LpPoolLabel).parentPoolId),
              [],
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
              [],
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
              [],
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
              '0',
              this.strategyContext,
            ),
          );
          break;
        case 'AlphaVault':
          resMap.set(
            poolLabel.poolId,
            new AlphaStrategy(
              poolLabel,
              poolObjects.get(poolLabel.poolId),
              [],
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
              [],
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
              [],
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
              [],
              this.strategyContext,
            ),
          );
          break;
      }
    });
    return resMap;
  }

  async getAllPoolsData() {
    const strategies = await this.getAllPoolStrategies();
    return Promise.all(Object.values(strategies).map((strategy) => strategy.getData()));
  }
}
