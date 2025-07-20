import { PoolDetails, poolDetailsMap } from "../common/maps.js";
import { Blockchain } from "./blockchain.js";
import { ClmmPoolUtil, TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk";
import BN from "bn.js";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { getConf } from "../common/constants.js";
import {
  BluefinInvestorType,
  BluefinParentPoolType,
  InvestorType,
  NaviLoopInvestorType,
  ParentPoolType,
  PoolType,
} from "src/utils/parsedTypes.ts";
import { Decimal } from "decimal.js";
import { coinsList, coinsListByType } from "src/common/coinsList.ts";

/**
 * Pool utility types and interfaces
 */
export interface LiquidityCalculationResult {
  coinAmountA: bigint;
  coinAmountB: bigint;
  liquidity: bigint;
}

export type PoolName = string;

export class Pool {
  pool: PoolType;
  parentPool: ParentPoolType | undefined;
  investor: InvestorType;
  poolDetails: PoolDetails;

  constructor(
    pool: PoolType,
    investor: InvestorType,
    parentPool?: ParentPoolType
  ) {
    this.pool = pool;
    this.investor = investor;
    this.parentPool = parentPool;
    this.poolDetails = poolDetailsMap[pool.id];
  }

  getApr(
    aprMap: Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>
  ): {
    parentApr: Decimal;
    alphaMiningApr: Decimal;
  } {
    const apr = aprMap.get(this.pool.id);
    if (!apr) {
      throw new Error(`Apr not found for pool ${this.pool.id}`);
    }
    return apr;
  }

  getApy(
    aprMap: Map<string, { parentApr: Decimal; alphaMiningApr: Decimal }>
  ): Decimal {
    const apr = this.getApr(aprMap);
    return this.convertAprToApy(apr.parentApr.add(apr.alphaMiningApr));
  }

  getTvl(priceMap: Map<string, Decimal>): string {
    const coin = this.poolDetails.assetTypes[0];
    const price = priceMap.get(coin);
    if (!price) {
      throw new Error(`Price not found for coin ${coin}`);
    }

    if (
      this.poolDetails.parentProtocolName === "NAVI" ||
      this.poolDetails.parentProtocolName === "ALPHALEND"
    ) {
      if (this.poolDetails.strategyType === "SINGLE-ASSET-LOOPING") {
        const liquidity = new Decimal(
          (this.investor as NaviLoopInvestorType).tokensDeposited
        );
        const debtToSupplyRatio = new Decimal(
          (this.investor as NaviLoopInvestorType).current_debt_to_supply_ratio
        );
        const tokensInvested = liquidity.mul(
          new Decimal(1).minus(debtToSupplyRatio.div(new Decimal(1e20)))
        );

        if (this.poolDetails.poolName == "NAVI-LOOP-SUI-VSUI") {
          const vsuiPrice = priceMap.get(coinsList["VSUI"].type);
          if (vsuiPrice)
            return tokensInvested.div(1e9).mul(vsuiPrice).toString();
        } else if (this.poolDetails.poolName == "ALPHALEND-LOOP-SUI-STSUI") {
          const stsuiPrice = priceMap.get(coinsList["STSUI"].type);
          if (stsuiPrice)
            return tokensInvested.div(1e9).mul(stsuiPrice).toString();
        }

        return tokensInvested.div(1e9).mul(price).toString();
      } else {
        const tokensInvested = new Decimal(this.pool.tokensInvested).div(
          new Decimal(Math.pow(10, 9))
        );
        return tokensInvested.mul(price).toString();
      }
    } else if (this.poolDetails.parentProtocolName === "BUCKET") {
      const tokensInvested = new Decimal(this.pool.tokensInvested).div(
        new Decimal(Math.pow(10, coinsListByType[coin].expo))
      );
      return tokensInvested.mul(price).toString();
    } else if (this.poolDetails.parentProtocolName === "ALPHAFI") {
      const tokensInvested = new Decimal(this.pool.tokensInvested).div(
        new Decimal(Math.pow(10, 9))
      );
      return tokensInvested.mul(price).toString();
    } else if (
      this.poolDetails.parentProtocolName === "CETUS" ||
      this.poolDetails.parentProtocolName === "BLUEFIN"
    ) {
      return this.getV3PoolTVL(priceMap);
    }
    return "0";
  }

  getParentTvl(
    priceMap: Map<string, Decimal>,
    naviTvlMap?: Map<string, Decimal>,
    bucketTvl?: Decimal
  ): string {
    if (
      this.poolDetails.parentProtocolName === "BLUEFIN" ||
      this.poolDetails.parentProtocolName === "CETUS"
    ) {
      if (this.parentPool) {
        const amounts = [this.parentPool.coin_a, this.parentPool.coin_b];
        const [coin1, coin2] = this.poolDetails.assetTypes;

        const [priceOfCoin1, priceOfCoin2] = [
          priceMap.get(coin1),
          priceMap.get(coin2),
        ];
        if (!priceOfCoin1 || !priceOfCoin2) {
          throw new Error(`Price not found for coin ${coin1} or ${coin2}`);
        }
        const coin1InUsd =
          (Number(amounts[0]) * Number(priceOfCoin1)) /
          Math.pow(10, coinsListByType[coin1].expo);
        const coin2InUsd =
          (Number(amounts[1]) * Number(priceOfCoin2)) /
          Math.pow(10, coinsListByType[coin2].expo);

        return (coin1InUsd + coin2InUsd).toString();
      }
      return "0";
    } else if (this.poolDetails.parentProtocolName === "ALPHAFI") {
      return this.getTvl(priceMap);
    } else if (this.poolDetails.parentProtocolName === "NAVI") {
      return naviTvlMap?.get(this.pool.id)?.toString() || "0";
    } else if (this.poolDetails.parentProtocolName === "BUCKET") {
      return bucketTvl?.toString() || "0";
    } else if (this.poolDetails.parentProtocolName === "ALPHALEND") {
      return this.getTvl(priceMap);
    }
    return "0";
  }

  getCurrentLPPoolPrice(): Decimal {
    const coinA = coinsListByType[this.poolDetails.assetTypes[0]];
    const coinB = coinsListByType[this.poolDetails.assetTypes[1]];

    if (this.parentPool) {
      const currentSqrtPrice = (this.parentPool as BluefinParentPoolType)
        .current_sqrt_price;

      return TickMath.sqrtPriceX64ToPrice(
        new BN(currentSqrtPrice),
        coinA.expo,
        coinB.expo
      );
    }
    return new Decimal(0);
  }

  getPositionRange(): { lowerPrice: Decimal; upperPrice: Decimal } {
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

  private getV3PoolTVL(priceMap: Map<string, Decimal>): string {
    const coin1 = this.poolDetails.assetTypes[0];
    const coin2 = this.poolDetails.assetTypes[1];

    const [priceOfCoin0, priceOfCoin1] = [
      priceMap.get(coin1),
      priceMap.get(coin2),
    ];

    if (priceOfCoin0 && priceOfCoin1 && this.parentPool) {
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
        new BN(this.parentPool.current_sqrt_price),
        lower_sqrt_price,
        upper_sqrt_price,
        false
      );
      let amount0 = new Decimal(coinA.toString());
      let amount1 = new Decimal(coinB.toString());

      amount0 = amount0.div(new Decimal(10).pow(coinsListByType[coin1].expo));
      amount1 = amount1.div(new Decimal(10).pow(coinsListByType[coin2].expo));
      const tvl = amount0.mul(priceOfCoin0).add(amount1.mul(priceOfCoin1));

      return tvl.toString();
    }
    return "0";
  }

  private convertAprToApy(apr: Decimal): Decimal {
    const n = 6 * 365; // 6 times a day
    return apr.div(100).div(n).add(1).pow(n).minus(1).mul(100);
  }
}

/**
 * Pool utility class for liquidity calculations and pool operations
 */
// export class PoolUtils {
//   private blockchain: Blockchain;
//   client: SuiClient;
//   constructor(blockchain: Blockchain, client: SuiClient) {
//     this.blockchain = blockchain;
//     this.client = client;
//   }

//   /**
//    * Calculate optimal amounts for deposit
//    */
//   async getAmounts(
//     poolId: number,
//     a2b: boolean,
//     amount: string,
//   ): Promise<[string, string]> {
//     try {
//       const liquidity = await this.getLiquidity(poolId, a2b, amount);
//       const numA = liquidity.coinAmountA.toString();
//       const numB = liquidity.coinAmountB.toString();
//       return [numA, numB];
//     } catch (error) {
//       console.warn(`Error calculating amounts for pool ${poolId}:`, error);
//       // Fallback to simple 50-50 split
//       const halfAmount = (BigInt(amount) / BigInt(2)).toString();
//       return a2b ? [amount, halfAmount] : [halfAmount, amount];
//     }
//   }

//   /**
//    * Get coin amounts from liquidity value
//    */
//   async getCoinAmountsFromLiquidity(
//     poolId: number,
//     liquidity: string,
//   ): Promise<[string, string]> {
//     try {
//       const parentPool = await this.blockchain.getParentPool(poolId);
//       const investor = await this.blockchain.getInvestor(poolId);

//       const upper_bound = 443636;
//       let lower_tick: number;
//       let upper_tick: number;
//       let current_sqrt_price: string;

//       // Extract ticks based on investor type
//       if ("lower_tick" in investor && "upper_tick" in investor) {
//         lower_tick = Number(investor.lower_tick);
//         upper_tick = Number(investor.upper_tick);
//       } else {
//         throw new Error(`Unsupported investor type for pool ${poolId}`);
//       }

//       // Extract current sqrt price based on parent pool type
//       if ("current_sqrt_price" in parentPool) {
//         current_sqrt_price = parentPool.current_sqrt_price;
//       } else {
//         throw new Error(`Unsupported parent pool type for pool ${poolId}`);
//       }

//       if (lower_tick > upper_bound) {
//         lower_tick = -~(lower_tick - 1);
//       }
//       if (upper_tick > upper_bound) {
//         upper_tick = -~(upper_tick - 1);
//       }

//       if (parentPool) {
//         const liquidityInt = Math.floor(parseFloat(liquidity));

//         // Simplified calculation - in production would use:
//         // const coin_amounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
//         //   new BN(`${liquidityInt}`),
//         //   new BN(current_sqrt_price),
//         //   TickMath.tickIndexToSqrtPriceX64(lower_tick),
//         //   TickMath.tickIndexToSqrtPriceX64(upper_tick),
//         //   true,
//         // );

//         return this.calculateCoinAmountsFromLiquidity(
//           liquidityInt,
//           current_sqrt_price,
//           lower_tick,
//           upper_tick,
//         );
//       } else {
//         return ["0", "0"];
//       }
//     } catch (error) {
//       console.warn(
//         `Error calculating coin amounts from liquidity for pool ${poolId}:`,
//         error,
//       );
//       return ["0", "0"];
//     }
//   }

//   /**
//    * Simplified liquidity estimation (placeholder for ClmmPoolUtil)
//    */
//   private calculateLiquidityEstimate(
//     amount: string,
//     a2b: boolean,
//     lower_tick: number,
//     upper_tick: number,
//     current_sqrt_price: bigint,
//   ): LiquidityCalculationResult {
//     const amountBig = BigInt(Math.floor(parseFloat(amount)));

//     // Simplified calculation based on tick range and price
//     const tickRange = Math.abs(upper_tick - lower_tick);
//     const priceImpact = Math.min(tickRange / 100000, 0.1); // Cap at 10%

//     if (a2b) {
//       // More of token A, adjusted for price impact
//       const coinAmountA =
//         (amountBig * BigInt(Math.floor(60 + priceImpact * 100))) / BigInt(100);
//       const coinAmountB =
//         (amountBig * BigInt(Math.floor(40 - priceImpact * 100))) / BigInt(100);
//       const liquidity = (coinAmountA + coinAmountB) / BigInt(2);

//       return {
//         coinAmountA,
//         coinAmountB,
//         liquidity,
//       };
//     } else {
//       // More of token B, adjusted for price impact
//       const coinAmountA =
//         (amountBig * BigInt(Math.floor(40 - priceImpact * 100))) / BigInt(100);
//       const coinAmountB =
//         (amountBig * BigInt(Math.floor(60 + priceImpact * 100))) / BigInt(100);
//       const liquidity = (coinAmountA + coinAmountB) / BigInt(2);

//       return {
//         coinAmountA,
//         coinAmountB,
//         liquidity,
//       };
//     }
//   }

//   /**
//    * Calculate coin amounts from liquidity (simplified)
//    */
//   private calculateCoinAmountsFromLiquidity(
//     liquidityInt: number,
//     currentSqrtPrice: string,
//     lower_tick: number,
//     upper_tick: number,
//   ): [string, string] {
//     const liquidity = BigInt(liquidityInt);
//     const priceRatio = BigInt(currentSqrtPrice) / BigInt(1e18); // Normalize price

//     // Simplified calculation based on price and tick range
//     const tickRange = Math.abs(upper_tick - lower_tick);
//     const rangeFactor = BigInt(Math.max(1, tickRange / 1000));

//     const coinA = (liquidity * BigInt(55)) / (BigInt(100) * rangeFactor);
//     const coinB = (liquidity * BigInt(45)) / (BigInt(100) * rangeFactor);

//     return [coinA.toString(), coinB.toString()];
//   }

//   /**
//    * Get pool information by ID
//    */
//   getPoolInfo(poolId: number): PoolDetails | null {
//     return poolDetailsMap[poolId];
//   }

//   /**
//    * Check if pool supports double asset operations
//    */
//   isDoubleAssetPool(poolId: number): boolean | null {
//     const poolInfo = this.getPoolInfo(poolId);
//     return (
//       poolInfo &&
//       "token1" in poolInfo.assetTypes &&
//       "token2" in poolInfo.assetTypes
//     );
//   }

//   /**
//    * Get pool asset types
//    */
//   getPoolAssetTypes(poolId: number): { token1?: string; token2?: string } {
//     const poolInfo = this.getPoolInfo(poolId);
//     if (poolInfo && poolInfo.assetTypes.length === 2) {
//       return {
//         token1: poolInfo.assetTypes[0],
//         token2: poolInfo.assetTypes[1],
//       };
//     }
//     return {};
//   }

//   async getLiquidity(poolId: number, a2b: boolean, amount: string) {
//     try {
//       const investor = await this.blockchain.getInvestor(poolId);
//       const parentPool = await this.blockchain.getParentPool(poolId);

//       // Handle tick calculations for Cetus and Bluefin investors
//       const upper_bound = 443636;
//       let lower_tick: number;
//       let upper_tick: number;

//       // Extract ticks based on investor type
//       if ("lower_tick" in investor && "upper_tick" in investor) {
//         lower_tick = Number(investor.lower_tick);
//         upper_tick = Number(investor.upper_tick);
//       } else {
//         throw new Error(`Unsupported investor type for pool ${poolId}`);
//       }

//       if (lower_tick > upper_bound) {
//         lower_tick = -~(lower_tick - 1);
//       }
//       if (upper_tick > upper_bound) {
//         upper_tick = -~(upper_tick - 1);
//       }

//       const current_sqrt_price = new BN(parentPool.current_sqrt_price);

//       const liquidity = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
//         lower_tick,
//         upper_tick,
//         new BN(`${Math.floor(parseFloat(amount))}`),
//         a2b,
//         false,
//         0.5,
//         current_sqrt_price,
//       );

//       return liquidity;
//     } catch (error) {
//       console.warn(`Error calculating liquidity for pool ${poolId}:`, error);
//       return {
//         coinAmountA: 0n,
//         coinAmountB: 0n,
//         // tokenMaxA: 0n,
//         // tokenMaxB: 0n,
//         liquidity: 0n,
//         // fix_amount_a: false,
//       };
//     }
//   }

//   /**
//    * Get all available pools
//    * @returns Array of all pool information
//    */
//   getAllPools(): PoolDetails[] {
//     return Object.keys(poolDetailsMap)
//       .map(Number)
//       .filter((poolId) => !isNaN(poolId))
//       .map((poolId) => this.getPoolInfo(poolId))
//       .filter((pool): pool is PoolDetails => pool !== null);
//   }

//   // Helper functions to differentiate between NAVI-LOOP and single asset NAVI pools

//   /**
//    * Checks if a pool is a NAVI-LOOP pool using strategy type
//    * @param poolDetails - The pool details to check
//    * @returns true if the pool is a NAVI-LOOP pool
//    */
//   isNaviLoopPool(poolDetails: PoolDetails): boolean {
//     return (
//       poolDetails.parentProtocolName === "NAVI" &&
//       poolDetails.strategyType === "SINGLE-ASSET-LOOPING"
//     );
//   }

//   /**
//    * Checks if a pool is a single asset NAVI pool (non-looping)
//    * @param poolDetails - The pool details to check
//    * @returns true if the pool is a single asset NAVI pool
//    */
//   isSingleAssetNaviPool(poolDetails: PoolDetails): boolean {
//     return (
//       poolDetails.parentProtocolName === "NAVI" &&
//       poolDetails.strategyType === "SINGLE-ASSET-POOL"
//     );
//   }

//   /**
//    * Categorizes a NAVI pool as either looping or single asset
//    * @param poolDetails - The pool details to categorize
//    * @returns "looping" | "single-asset" | "not-navi"
//    */
//   categorizeNaviPool(
//     poolDetails: PoolDetails,
//   ): "looping" | "single-asset" | "not-navi" {
//     if (poolDetails.parentProtocolName !== "NAVI") {
//       return "not-navi";
//     }

//     if (this.isNaviLoopPool(poolDetails)) {
//       return "looping";
//     }

//     if (this.isSingleAssetNaviPool(poolDetails)) {
//       return "single-asset";
//     }

//     return "not-navi";
//   }

//   updateSingleTokenPrice(
//     pythPriceInfo: string,
//     feedId: string,
//     tx?: Transaction,
//   ): Transaction {
//     console.log("Updating single token price", { pythPriceInfo, feedId });

//     const transaction = tx || new Transaction();

//     transaction.moveCall({
//       target:
//         "0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83::oracle_pro::update_single_price",
//       arguments: [
//         transaction.object(getConf().CLOCK_PACKAGE_ID),
//         transaction.object(getConf().NAVI_ORACLE_CONFIG),
//         transaction.object(getConf().PRICE_ORACLE),
//         transaction.object(getConf().SUPRA_ORACLE_HOLDER),
//         transaction.object(pythPriceInfo),
//         transaction.pure.address(feedId),
//       ],
//     });

//     console.log("Single token price update added to transaction");
//     return transaction;
//   }
// }
