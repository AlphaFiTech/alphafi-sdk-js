import { Protocol } from './protocol.js';
import { normalizeStructTag } from '@mysten/sui/utils/sui-types.js';
import { StrategyContext } from './strategyContext.js';
import { PoolBalance, UserPortfolioData } from './types.js';
import { Decimal } from 'decimal.js';
import { Strategy } from '../strategies/strategy.js';
import { AlphaVaultStrategy } from '../strategies/alphaVault.js';
import { AutobalanceLpStrategy } from '../strategies/autobalanceLp.js';
import { LendingStrategy } from '../strategies/lending.js';
import { LoopingStrategy } from '../strategies/looping.js';
import { LpStrategy } from '../strategies/lp.js';
import { LyfStrategy } from '../strategies/lyf.js';
import { SingleAssetLoopingStrategy } from '../strategies/singleAssetLooping.js';
import { FungibleLpPoolLabel, FungibleLpStrategy } from '../strategies/fungibleLp.js';
import { SlushLendingStrategy } from '../strategies/slushLending.js';

export class Portfolio {
  protocol: Protocol;
  strategyContext: StrategyContext;

  constructor(protocol: Protocol, strategyContext: StrategyContext) {
    this.protocol = protocol;
    this.strategyContext = strategyContext;
  }

  async getWalletCoins(userAddress: string): Promise<Map<string, string>> {
    const res = await this.strategyContext.blockchain.suiClient.getAllBalances({
      owner: userAddress,
    });

    const resMap: Map<string, string> = new Map();
    res.forEach((entry: { coinType: string; totalBalance: string }) => {
      resMap.set(normalizeStructTag(entry.coinType), entry.totalBalance);
    });
    return resMap;
  }

  async getUserPortfolio(userAddress: string): Promise<UserPortfolioData> {
    const strategies = await this.protocol.getAllStrategies();
    await this.updateStrategiesWithReceipts(userAddress, strategies);
    const balancesWithIds = await Promise.all(
      Array.from(strategies.entries()).map(async ([poolId, strategy]) => {
        const balance = await strategy.getBalance(userAddress);
        return [poolId, balance] as [string, PoolBalance];
      }),
    );
    const poolBalances: Map<string, PoolBalance> = new Map(balancesWithIds);
    return {
      netWorth: new Decimal(0),
      aggregatedApy: new Decimal(0),
      alphaRewardsToClaim: new Decimal(0),
      poolBalances,
    };
  }

  private async updateStrategiesWithReceipts(
    userAddress: string,
    strategies: Map<string, Strategy>,
  ) {
    const poolLabels = Array.from(this.strategyContext.poolLabels.values());
    const receiptTypes: string[] = [];
    poolLabels.forEach((poolLabel) => {
      switch (poolLabel.strategyType) {
        case 'AlphaVault':
        case 'AutobalanceLp':
        case 'Lending':
        case 'Looping':
        case 'Lp':
        case 'Lyf':
        case 'SingleAssetLooping':
          receiptTypes.push(poolLabel.receipt.type);
          break;
        case 'FungibleLp':
        case 'SlushLending':
          break;
        default:
          break;
      }
    });

    const [slushPositions, alphafiPositions, receiptObjects, coinBalances] = await Promise.all([
      this.strategyContext.getAllSlushPositions(userAddress),
      this.strategyContext.getPositionsFromAlphaFiReceipts(userAddress),
      this.strategyContext.blockchain.multiGetReceipts(userAddress, receiptTypes),
      this.getWalletCoins(userAddress),
    ]);

    strategies.forEach((strategy, poolId) => {
      switch (strategy.getPoolLabel().strategyType) {
        case 'AlphaVault':
          const alphaVaultStrategy = strategy as AlphaVaultStrategy;
          alphaVaultStrategy.updateReceipts(
            receiptObjects.get(alphaVaultStrategy.getPoolLabel().receipt.type) ?? [],
            alphafiPositions.get(poolId) ?? [],
          );
          break;
        case 'AutobalanceLp':
          const autobalanceLpStrategy = strategy as AutobalanceLpStrategy;
          autobalanceLpStrategy.updateReceipts(
            receiptObjects.get(autobalanceLpStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        case 'FungibleLp':
          const fungibleLpStrategy = strategy as FungibleLpStrategy;
          fungibleLpStrategy.updateReceipts(
            new Decimal(
              coinBalances.get(
                (strategy.getPoolLabel() as FungibleLpPoolLabel).fungibleCoin.type,
              ) ?? '0',
            ),
          );
          break;
        case 'Lending':
          const lendingStrategy = strategy as LendingStrategy;
          lendingStrategy.updateReceipts(
            receiptObjects.get(lendingStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        case 'Looping':
          const loopingStrategy = strategy as LoopingStrategy;
          loopingStrategy.updateReceipts(
            receiptObjects.get(loopingStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        case 'Lp':
          const lpStrategy = strategy as LpStrategy;
          lpStrategy.updateReceipts(
            receiptObjects.get(lpStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        case 'Lyf':
          const lyfStrategy = strategy as LyfStrategy;
          lyfStrategy.updateReceipts(
            receiptObjects.get(lyfStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        case 'SingleAssetLooping':
          const singleAssetLoopingStrategy = strategy as SingleAssetLoopingStrategy;
          singleAssetLoopingStrategy.updateReceipts(
            receiptObjects.get(singleAssetLoopingStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        case 'SlushLending':
          const slushLendingStrategy = strategy as SlushLendingStrategy;
          slushLendingStrategy.updateReceipts(slushPositions.get(poolId) ?? []);
          break;
      }
    });
  }
}
