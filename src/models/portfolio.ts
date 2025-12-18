/**
 * User portfolio manager that calculates balances, net worth, and aggregated APY.
 */

import { Protocol } from './protocol.js';
import { normalizeStructTag } from '@mysten/sui/utils/sui-types.js';
import { StrategyContext } from './strategyContext.js';
import { PoolBalance, UserPortfolioData } from './types.js';
import { Decimal } from 'decimal.js';
import { Strategy, StrategyType } from '../strategies/strategy.js';
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

  /** Get all coin balances in user's wallet. */
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

  /** Calculate user's complete portfolio including net worth, aggregated APY, and alpha rewards. */
  async getUserPortfolio(
    userAddress: string,
    strategiesType?: StrategyType[],
  ): Promise<UserPortfolioData> {
    const strategies = await this.protocol.getStrategies(strategiesType);
    await this.updateStrategiesWithReceipts(userAddress, strategies);

    const balancesWithIds = await Promise.all(
      Array.from(strategies.entries()).map(async ([poolId, strategy]) => {
        const balance = await strategy.getBalance(userAddress);
        return [poolId, balance] as [string, PoolBalance];
      }),
    );
    const poolBalances: Map<string, PoolBalance> = new Map(balancesWithIds);

    let [netWorth, aggregatedApy] = [new Decimal(0), new Decimal(0)];
    Array.from(poolBalances.entries()).forEach(([poolId, balance]) => {
      const balanceUsd =
        'stakedAlphaUsdValue' in balance ? balance.stakedAlphaUsdValue : balance.usdValue;

      // Cap retired pool APY at 1000%
      let apy = new Decimal(this.strategyContext.getAprData(poolId).apy);
      const isActive = (strategies.get(poolId)?.getPoolLabel() as any)?.isActive;
      if (isActive === false && apy.gt(1000)) {
        apy = new Decimal(1000);
      }

      netWorth = netWorth.add(balanceUsd);
      aggregatedApy = aggregatedApy.add(balanceUsd.mul(apy));
    });
    aggregatedApy = netWorth.isZero() ? new Decimal(0) : aggregatedApy.div(netWorth);

    // Sum alpha rewards across all strategies
    const distributor = this.strategyContext.getDistributorObject();
    let alphaRewardsToClaim = new Decimal(0);
    if (distributor) {
      for (const strategy of strategies.values()) {
        alphaRewardsToClaim = alphaRewardsToClaim.add(
          strategy.getAlphaMiningRewardsToClaim(distributor),
        );
      }
    }

    return { netWorth, aggregatedApy, alphaRewardsToClaim, poolBalances };
  }

  /** Update strategies with user's receipt objects and positions. */
  private async updateStrategiesWithReceipts(
    userAddress: string,
    strategies: Map<string, Strategy>,
  ) {
    const poolLabels = Array.from(strategies.values()).map((strategy) => strategy.getPoolLabel());
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
        case 'AlphaVault': {
          const alphaVaultStrategy = strategy as AlphaVaultStrategy;
          alphaVaultStrategy.updateReceipts(
            receiptObjects.get(alphaVaultStrategy.getPoolLabel().receipt.type) ?? [],
            alphafiPositions.get(poolId) ?? [],
          );
          break;
        }
        case 'AutobalanceLp': {
          const autobalanceLpStrategy = strategy as AutobalanceLpStrategy;
          autobalanceLpStrategy.updateReceipts(
            receiptObjects.get(autobalanceLpStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        }
        case 'FungibleLp': {
          const fungibleLpStrategy = strategy as FungibleLpStrategy;
          fungibleLpStrategy.updateReceipts(
            new Decimal(
              coinBalances.get(
                (strategy.getPoolLabel() as FungibleLpPoolLabel).fungibleCoin.type,
              ) ?? '0',
            ),
          );
          break;
        }
        case 'Lending': {
          const lendingStrategy = strategy as LendingStrategy;
          lendingStrategy.updateReceipts(
            receiptObjects.get(lendingStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        }
        case 'Looping': {
          const loopingStrategy = strategy as LoopingStrategy;
          loopingStrategy.updateReceipts(
            receiptObjects.get(loopingStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        }
        case 'Lp': {
          const lpStrategy = strategy as LpStrategy;
          lpStrategy.updateReceipts(
            receiptObjects.get(lpStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        }
        case 'Lyf': {
          const lyfStrategy = strategy as LyfStrategy;
          lyfStrategy.updateReceipts(
            receiptObjects.get(lyfStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        }
        case 'SingleAssetLooping': {
          const singleAssetLoopingStrategy = strategy as SingleAssetLoopingStrategy;
          singleAssetLoopingStrategy.updateReceipts(
            receiptObjects.get(singleAssetLoopingStrategy.getPoolLabel().receipt.type) ?? [],
          );
          break;
        }
        case 'SlushLending': {
          const slushLendingStrategy = strategy as SlushLendingStrategy;
          slushLendingStrategy.updateReceipts(slushPositions.get(poolId) ?? []);
          break;
        }
      }
    });
  }
}
