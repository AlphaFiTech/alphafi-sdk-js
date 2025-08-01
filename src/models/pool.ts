import { PoolDetails, poolDetailsMap } from '../common/maps.js';
import { ClmmPoolUtil, LiquidityInput, TickMath } from '@cetusprotocol/cetus-sui-clmm-sdk';
import BN from 'bn.js';
import {
  AlphaPoolType,
  BluefinInvestorType,
  BluefinParentPoolType,
  DefaultPoolType,
  FungiblePoolType,
  InvestorType,
  NaviLoopInvestorType,
  ParentPoolType,
  PoolType,
} from 'src/utils/parsedTypes.ts';
import { Decimal } from 'decimal.js';
import { coinsList, coinsListByType } from 'src/common/coinsList.ts';
import { Blockchain } from './blockchain.ts';
import { SuiClient } from '@mysten/sui/client/client.js';
import { Transaction } from '@mysten/sui/transactions/index.js';
import { CoinStruct } from '@mysten/sui/client/index.js';

/**
 * Pool utility types and interfaces
 */
// export interface LiquidityCalculationResult {
//   coinAmountA: bigint;
//   coinAmountB: bigint;
//   liquidity: bigint;
// }

// export type PoolName = string;

export type PoolData = {
  apr: {
    parentApr: Decimal;
    alphaMiningApr: Decimal;
  };
  apy: Decimal;
  tvl: Decimal;
  parentTvl: Decimal;
  currentLPPoolPrice: Decimal | undefined;
  positionRange: { lowerPrice: Decimal; upperPrice: Decimal } | undefined;
};

export class Pool {
  pool: PoolType;
  parentPool: ParentPoolType | undefined;
  investor: InvestorType | undefined;
  poolDetails: PoolDetails;

  constructor(pool: PoolType, investor?: InvestorType, parentPool?: ParentPoolType) {
    this.pool = pool;
    this.investor = investor;
    this.parentPool = parentPool;
    this.poolDetails = poolDetailsMap[pool.id];
  }

  getPoolData(
    aprMap: Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>,
    priceMap: Map<string, Decimal>,
    naviTvlMap: Map<string, Decimal>,
    bucketTvl: Decimal,
  ): PoolData {
    return {
      apr: this.apr(aprMap),
      apy: this.apy(aprMap),
      tvl: this.tvl(priceMap),
      parentTvl: this.parentTvl(priceMap, naviTvlMap, bucketTvl),
      currentLPPoolPrice:
        this.poolDetails.assetTypes.length === 2 ? this.currentLPPoolPrice() : undefined,
      positionRange: this.poolDetails.assetTypes.length === 2 ? this.positionRange() : undefined,
    };
  }

  apy(aprMap: Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>): Decimal {
    const apr = this.apr(aprMap);
    return this.convertAprToApy(apr.parentApr.add(apr.alphaMiningApr));
  }

  apr(aprMap: Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>): {
    parentApr: Decimal;
    alphaMiningApr: Decimal;
  } {
    const apr = aprMap.get(this.pool.id);
    if (!apr) {
      throw new Error(`Apr not found for pool ${this.pool.id}`);
    }
    return apr;
  }

  tvl(priceMap: Map<string, Decimal>): Decimal {
    const coin = this.poolDetails.assetTypes[0];
    const price = priceMap.get(coin);
    if (!price) {
      throw new Error(`Price not found for coin ${coin}`);
    }

    if (
      this.poolDetails.parentProtocolName === 'NAVI' ||
      this.poolDetails.parentProtocolName === 'ALPHALEND'
    ) {
      if (!this.investor) {
        throw new Error(`Investor not found for pool ${this.pool.id}`);
      }
      if (this.poolDetails.strategyType === 'SINGLE-ASSET-LOOPING') {
        const liquidity = new Decimal((this.investor as NaviLoopInvestorType).tokensDeposited);
        const debtToSupplyRatio = new Decimal(
          (this.investor as NaviLoopInvestorType).current_debt_to_supply_ratio,
        );
        const tokensInvested = liquidity.mul(
          new Decimal(1).minus(debtToSupplyRatio.div(new Decimal(1e20))),
        );

        if (this.poolDetails.poolName == 'NAVI-LOOP-SUI-VSUI') {
          const vsuiPrice = priceMap.get(coinsList['VSUI'].type);
          if (vsuiPrice) return tokensInvested.div(1e9).mul(vsuiPrice);
        } else if (this.poolDetails.poolName == 'ALPHALEND-LOOP-SUI-STSUI') {
          const stsuiPrice = priceMap.get(coinsList['STSUI'].type);
          if (stsuiPrice) return tokensInvested.div(1e9).mul(stsuiPrice);
        }

        return tokensInvested.div(1e9).mul(price);
      } else {
        const tokensInvested = new Decimal(this.pool.tokensInvested).div(
          new Decimal(Math.pow(10, 9)),
        );
        return tokensInvested.mul(price);
      }
    } else if (this.poolDetails.parentProtocolName === 'BUCKET') {
      const tokensInvested = new Decimal(this.pool.tokensInvested).div(
        new Decimal(Math.pow(10, coinsListByType[coin].expo)),
      );
      return tokensInvested.mul(price);
    } else if (this.poolDetails.parentProtocolName === 'ALPHAFI') {
      const tokensInvested = new Decimal(this.pool.tokensInvested).div(
        new Decimal(Math.pow(10, 9)),
      );
      return tokensInvested.mul(price);
    } else if (
      this.poolDetails.parentProtocolName === 'CETUS' ||
      this.poolDetails.parentProtocolName === 'BLUEFIN'
    ) {
      return this.getV3PoolTVL(priceMap);
    }
    return new Decimal(0);
  }

  parentTvl(
    priceMap: Map<string, Decimal>,
    naviTvlMap: Map<string, Decimal>,
    bucketTvl: Decimal,
  ): Decimal {
    if (
      this.poolDetails.parentProtocolName === 'BLUEFIN' ||
      this.poolDetails.parentProtocolName === 'CETUS'
    ) {
      if (this.parentPool) {
        const amounts = [
          (this.parentPool as BluefinParentPoolType).coin_a,
          (this.parentPool as BluefinParentPoolType).coin_b,
        ];
        const [coin1, coin2] = this.poolDetails.assetTypes;

        const [priceOfCoin1, priceOfCoin2] = [priceMap.get(coin1), priceMap.get(coin2)];
        if (!priceOfCoin1 || !priceOfCoin2) {
          throw new Error(`Price not found for coin ${coin1} or ${coin2}`);
        }
        const coin1InUsd = priceOfCoin1
          .mul(amounts[0])
          .div(Math.pow(10, coinsListByType[coin1].expo));
        const coin2InUsd = priceOfCoin2
          .mul(amounts[1])
          .div(Math.pow(10, coinsListByType[coin2].expo));

        return coin1InUsd.add(coin2InUsd);
      }
      return new Decimal(0);
    } else if (this.poolDetails.parentProtocolName === 'ALPHAFI') {
      return this.tvl(priceMap);
    } else if (this.poolDetails.parentProtocolName === 'NAVI') {
      return naviTvlMap.get(this.pool.id) || new Decimal(0);
    } else if (this.poolDetails.parentProtocolName === 'BUCKET') {
      return bucketTvl;
    } else if (this.poolDetails.parentProtocolName === 'ALPHALEND') {
      return this.tvl(priceMap);
    }
    return new Decimal(0);
  }

  currentLPPoolPrice(): Decimal {
    const coinA = coinsListByType[this.poolDetails.assetTypes[0]];
    const coinB = coinsListByType[this.poolDetails.assetTypes[1]];

    if (this.parentPool) {
      const currentSqrtPrice = (this.parentPool as BluefinParentPoolType).current_sqrt_price;

      return TickMath.sqrtPriceX64ToPrice(new BN(currentSqrtPrice), coinA.expo, coinB.expo);
    }
    return new Decimal(0);
  }

  positionRange(): { lowerPrice: Decimal; upperPrice: Decimal } {
    if (!this.investor) {
      throw new Error(`Investor not found for pool ${this.pool.id}`);
    }
    const coinA = coinsListByType[this.poolDetails.assetTypes[0]];
    const coinB = coinsListByType[this.poolDetails.assetTypes[1]];

    const upperBound = 443636;
    let lowerTick = Number((this.investor as BluefinInvestorType).lower_tick);
    let upperTick = Number((this.investor as BluefinInvestorType).upper_tick);
    if (lowerTick > upperBound) {
      lowerTick = -~(lowerTick - 1);
    }
    if (upperTick > upperBound) {
      upperTick = -~(upperTick - 1);
    }
    return {
      lowerPrice: TickMath.tickIndexToPrice(lowerTick, coinA.expo, coinB.expo),
      upperPrice: TickMath.tickIndexToPrice(upperTick, coinA.expo, coinB.expo),
    };
  }

  poolExchangeRate(
    priceMap: Map<string, Decimal>,
    naviLoopingPoolDebt: Map<string, string>,
  ): Decimal {
    let xTokenSupply = new Decimal(0);
    if (this.poolDetails.strategyType === 'FUNGIBLE-DOUBLE-ASSET-POOL') {
      xTokenSupply = new Decimal((this.pool as FungiblePoolType).treasury_cap.total_supply);
    } else {
      xTokenSupply = new Decimal((this.pool as DefaultPoolType).xTokenSupply);
    }

    let tokensInvested = new Decimal(this.pool.tokensInvested);
    if (this.poolDetails.poolName == 'ALPHA') {
      tokensInvested = new Decimal((this.pool as AlphaPoolType).alpha_bal);
    } else if (this.poolDetails.strategyType === 'SINGLE-ASSET-LOOPING') {
      if (!this.investor) {
        throw new Error(`Investor not found for pool ${this.pool.id}`);
      }
      if (
        this.poolDetails.poolName == 'NAVI-LOOP-USDC-USDT' ||
        this.poolDetails.poolName == 'NAVI-LOOP-USDT-USDC'
      ) {
        const supplyCoinPrice =
          priceMap.get(this.poolDetails.loopingPoolCoinMap?.supplyCoin || '') || new Decimal(0);
        const borrowCoinPrice =
          priceMap.get(this.poolDetails.loopingPoolCoinMap?.borrowCoin || '') || new Decimal(0);

        const currentDebt = naviLoopingPoolDebt.get(this.pool.id) || '0';
        const currentSupply = new Decimal((this.investor as NaviLoopInvestorType).tokensDeposited);
        const currentDebtInSupplyCoin = new Decimal(currentDebt)
          .mul(borrowCoinPrice)
          .div(supplyCoinPrice);

        tokensInvested = new Decimal(currentSupply).minus(currentDebtInSupplyCoin);
      } else {
        const liquidity = new Decimal((this.investor as NaviLoopInvestorType).tokensDeposited);
        const debtToSupplyRatio = new Decimal(
          (this.investor as NaviLoopInvestorType).current_debt_to_supply_ratio,
        );
        tokensInvested = liquidity.mul(
          new Decimal(1).minus(new Decimal(debtToSupplyRatio).div(1e20)),
        );
      }
    }

    // Check for division by zero
    if (xTokenSupply.eq(0)) {
      console.error('Division by zero error: tokensInvested is zero.');
      return new Decimal(0);
    }
    const poolExchangeRate = tokensInvested.div(xTokenSupply);
    return poolExchangeRate;
  }

  coinAmountsFromLiquidity(liquidity: string): [Decimal, Decimal] {
    if (!this.investor) {
      throw new Error(`Investor not found for pool ${this.pool.id}`);
    }
    const upper_bound = 443636;
    let lower_tick = Number((this.investor as BluefinInvestorType).lower_tick);
    let upper_tick = Number((this.investor as BluefinInvestorType).upper_tick);

    if (lower_tick > upper_bound) {
      lower_tick = -~(lower_tick - 1);
    }
    if (upper_tick > upper_bound) {
      upper_tick = -~(upper_tick - 1);
    }

    if (this.parentPool) {
      const coin_amounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
        new BN(Math.floor(parseFloat(liquidity))),
        new BN((this.parentPool as BluefinParentPoolType).current_sqrt_price),
        TickMath.tickIndexToSqrtPriceX64(lower_tick),
        TickMath.tickIndexToSqrtPriceX64(upper_tick),
        true,
      );
      return [
        new Decimal(coin_amounts.coinA.toString()),
        new Decimal(coin_amounts.coinB.toString()),
      ];
    } else {
      return [new Decimal(0), new Decimal(0)];
    }
  }

  private getV3PoolTVL(priceMap: Map<string, Decimal>): Decimal {
    const coin1 = this.poolDetails.assetTypes[0];
    const coin2 = this.poolDetails.assetTypes[1];

    const [priceOfCoin1, priceOfCoin2] = [priceMap.get(coin1), priceMap.get(coin2)];

    if (priceOfCoin1 && priceOfCoin2 && this.parentPool && this.investor) {
      let upper_tick = (this.investor as BluefinInvestorType).upper_tick;
      let lower_tick = (this.investor as BluefinInvestorType).lower_tick;
      if (Math.abs(lower_tick - Math.pow(2, 32)) < lower_tick) {
        lower_tick = lower_tick - Math.pow(2, 32);
      }
      if (Math.abs(upper_tick - Math.pow(2, 32)) < upper_tick) {
        upper_tick = upper_tick - Math.pow(2, 32);
      }

      const upper_sqrt_price = TickMath.tickIndexToSqrtPriceX64(upper_tick);
      const lower_sqrt_price = TickMath.tickIndexToSqrtPriceX64(lower_tick);
      const { coinA, coinB } = ClmmPoolUtil.getCoinAmountFromLiquidity(
        new BN(this.pool.tokensInvested),
        new BN((this.parentPool as BluefinParentPoolType).current_sqrt_price),
        lower_sqrt_price,
        upper_sqrt_price,
        false,
      );
      let amount1 = new Decimal(coinA.toString());
      let amount2 = new Decimal(coinB.toString());

      amount1 = amount1.div(new Decimal(10).pow(coinsListByType[coin1].expo));
      amount2 = amount2.div(new Decimal(10).pow(coinsListByType[coin2].expo));
      const tvl = amount1.mul(priceOfCoin1).add(amount2.mul(priceOfCoin2));

      return tvl;
    }
    return new Decimal(0);
  }

  private convertAprToApy(apr: Decimal): Decimal {
    const n = 6 * 365; // 6 times a day
    return apr.div(100).div(n).add(1).pow(n).minus(1).mul(100);
  }
}

/**
 * Pool utility class for liquidity calculations and pool operations
 */
export class PoolUtils {
  private blockchain: Blockchain;
  suiClient: SuiClient;

  constructor(blockchain: Blockchain, suiClient: SuiClient) {
    this.blockchain = blockchain;
    this.suiClient = suiClient;
  }

  async getCoinFromWallet(tx: Transaction, address: string, coinType: string) {
    if (coinsListByType[coinType].name === 'SUI') {
      return tx.gas;
    }
    let coins: CoinStruct[] = [];
    let currentCursor: string | null | undefined = null;
    do {
      const response = await this.blockchain.client.getCoins({
        owner: address,
        coinType: coinType,
        cursor: currentCursor,
      });
      coins = coins.concat(response.data);

      // Check if there's a next page
      if (response.hasNextPage && response.nextCursor) {
        currentCursor = response.nextCursor;
      } else {
        // No more pages available
        break;
      }
    } while (true);

    let coin;
    [coin] = tx.splitCoins(tx.object(coins[0].coinObjectId), [0]);
    tx.mergeCoins(
      coin,
      coins.map((c) => c.coinObjectId),
    );

    return coin;
  }

  /**
   * Calculate optimal amounts for deposit
   */
  async getAmounts(poolId: string, isAmountA: boolean, amount: string): Promise<[string, string]> {
    const liquidity = await this.getLiquidity(poolId, isAmountA, amount);
    const numA = liquidity.coinAmountA.toString();
    const numB = liquidity.coinAmountB.toString();
    return [numA, numB];
  }

  // /**
  //  * Get coin amounts from liquidity value
  //  */
  // async getCoinAmountsFromLiquidity(
  //   poolId: number,
  //   liquidity: string,
  // ): Promise<[string, string]> {
  //   try {
  //     const parentPool = await this.blockchain.getParentPool(poolId);
  //     const investor = await this.blockchain.getInvestor(poolId);

  //     const upper_bound = 443636;
  //     let lower_tick: number;
  //     let upper_tick: number;
  //     let current_sqrt_price: string;

  //     // Extract ticks based on investor type
  //     if ("lower_tick" in investor && "upper_tick" in investor) {
  //       lower_tick = Number(investor.lower_tick);
  //       upper_tick = Number(investor.upper_tick);
  //     } else {
  //       throw new Error(`Unsupported investor type for pool ${poolId}`);
  //     }

  //     // Extract current sqrt price based on parent pool type
  //     if ("current_sqrt_price" in parentPool) {
  //       current_sqrt_price = parentPool.current_sqrt_price;
  //     } else {
  //       throw new Error(`Unsupported parent pool type for pool ${poolId}`);
  //     }

  //     if (lower_tick > upper_bound) {
  //       lower_tick = -~(lower_tick - 1);
  //     }
  //     if (upper_tick > upper_bound) {
  //       upper_tick = -~(upper_tick - 1);
  //     }

  //     if (parentPool) {
  //       const liquidityInt = Math.floor(parseFloat(liquidity));

  //       // Simplified calculation - in production would use:
  //       // const coin_amounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
  //       //   new BN(`${liquidityInt}`),
  //       //   new BN(current_sqrt_price),
  //       //   TickMath.tickIndexToSqrtPriceX64(lower_tick),
  //       //   TickMath.tickIndexToSqrtPriceX64(upper_tick),
  //       //   true,
  //       // );

  //       return this.calculateCoinAmountsFromLiquidity(
  //         liquidityInt,
  //         current_sqrt_price,
  //         lower_tick,
  //         upper_tick,
  //       );
  //     } else {
  //       return ["0", "0"];
  //     }
  //   } catch (error) {
  //     console.warn(
  //       `Error calculating coin amounts from liquidity for pool ${poolId}:`,
  //       error,
  //     );
  //     return ["0", "0"];
  //   }
  // }

  // /**
  //  * Simplified liquidity estimation (placeholder for ClmmPoolUtil)
  //  */
  // private calculateLiquidityEstimate(
  //   amount: string,
  //   a2b: boolean,
  //   lower_tick: number,
  //   upper_tick: number,
  //   current_sqrt_price: bigint,
  // ): LiquidityCalculationResult {
  //   const amountBig = BigInt(Math.floor(parseFloat(amount)));

  //   // Simplified calculation based on tick range and price
  //   const tickRange = Math.abs(upper_tick - lower_tick);
  //   const priceImpact = Math.min(tickRange / 100000, 0.1); // Cap at 10%

  //   if (a2b) {
  //     // More of token A, adjusted for price impact
  //     const coinAmountA =
  //       (amountBig * BigInt(Math.floor(60 + priceImpact * 100))) / BigInt(100);
  //     const coinAmountB =
  //       (amountBig * BigInt(Math.floor(40 - priceImpact * 100))) / BigInt(100);
  //     const liquidity = (coinAmountA + coinAmountB) / BigInt(2);

  //     return {
  //       coinAmountA,
  //       coinAmountB,
  //       liquidity,
  //     };
  //   } else {
  //     // More of token B, adjusted for price impact
  //     const coinAmountA =
  //       (amountBig * BigInt(Math.floor(40 - priceImpact * 100))) / BigInt(100);
  //     const coinAmountB =
  //       (amountBig * BigInt(Math.floor(60 + priceImpact * 100))) / BigInt(100);
  //     const liquidity = (coinAmountA + coinAmountB) / BigInt(2);

  //     return {
  //       coinAmountA,
  //       coinAmountB,
  //       liquidity,
  //     };
  //   }
  // }

  // /**
  //  * Calculate coin amounts from liquidity (simplified)
  //  */
  // private calculateCoinAmountsFromLiquidity(
  //   liquidityInt: number,
  //   currentSqrtPrice: string,
  //   lower_tick: number,
  //   upper_tick: number,
  // ): [string, string] {
  //   const liquidity = BigInt(liquidityInt);
  //   const priceRatio = BigInt(currentSqrtPrice) / BigInt(1e18); // Normalize price

  //   // Simplified calculation based on price and tick range
  //   const tickRange = Math.abs(upper_tick - lower_tick);
  //   const rangeFactor = BigInt(Math.max(1, tickRange / 1000));

  //   const coinA = (liquidity * BigInt(55)) / (BigInt(100) * rangeFactor);
  //   const coinB = (liquidity * BigInt(45)) / (BigInt(100) * rangeFactor);

  //   return [coinA.toString(), coinB.toString()];
  // }

  async getLiquidity(poolId: string, a2b: boolean, amount: string): Promise<LiquidityInput> {
    const investor = await this.blockchain.getInvestor(poolId);
    const parentPool = await this.blockchain.getParentPool(poolId);

    // Handle tick calculations for Cetus and Bluefin investors
    const upper_bound = 443636;
    let lower_tick: number = (investor as BluefinInvestorType).lower_tick;
    let upper_tick: number = (investor as BluefinInvestorType).upper_tick;

    if (lower_tick > upper_bound) {
      lower_tick = -~(lower_tick - 1);
    }
    if (upper_tick > upper_bound) {
      upper_tick = -~(upper_tick - 1);
    }

    const current_sqrt_price = new BN((parentPool as BluefinParentPoolType).current_sqrt_price);

    const liquidity = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lower_tick,
      upper_tick,
      new BN(`${Math.floor(parseFloat(amount))}`),
      a2b,
      false,
      0.5,
      current_sqrt_price,
    );

    return liquidity;
  }

  // /**
  //  * Get all available pools
  //  * @returns Array of all pool information
  //  */
  // getAllPools(): PoolDetails[] {
  //   return Object.keys(poolDetailsMap)
  //     .map(Number)
  //     .filter((poolId) => !isNaN(poolId))
  //     .map((poolId) => this.getPoolInfo(poolId))
  //     .filter((pool): pool is PoolDetails => pool !== null);
  // }

  // // Helper functions to differentiate between NAVI-LOOP and single asset NAVI pools

  // /**
  //  * Checks if a pool is a NAVI-LOOP pool using strategy type
  //  * @param poolDetails - The pool details to check
  //  * @returns true if the pool is a NAVI-LOOP pool
  //  */
  // isNaviLoopPool(poolDetails: PoolDetails): boolean {
  //   return (
  //     poolDetails.parentProtocolName === "NAVI" &&
  //     poolDetails.strategyType === "SINGLE-ASSET-LOOPING"
  //   );
  // }

  // /**
  //  * Checks if a pool is a single asset NAVI pool (non-looping)
  //  * @param poolDetails - The pool details to check
  //  * @returns true if the pool is a single asset NAVI pool
  //  */
  // isSingleAssetNaviPool(poolDetails: PoolDetails): boolean {
  //   return (
  //     poolDetails.parentProtocolName === "NAVI" &&
  //     poolDetails.strategyType === "SINGLE-ASSET-POOL"
  //   );
  // }

  // /**
  //  * Categorizes a NAVI pool as either looping or single asset
  //  * @param poolDetails - The pool details to categorize
  //  * @returns "looping" | "single-asset" | "not-navi"
  //  */
  // categorizeNaviPool(
  //   poolDetails: PoolDetails,
  // ): "looping" | "single-asset" | "not-navi" {
  //   if (poolDetails.parentProtocolName !== "NAVI") {
  //     return "not-navi";
  //   }

  //   if (this.isNaviLoopPool(poolDetails)) {
  //     return "looping";
  //   }

  //   if (this.isSingleAssetNaviPool(poolDetails)) {
  //     return "single-asset";
  //   }

  //   return "not-navi";
  // }
}
