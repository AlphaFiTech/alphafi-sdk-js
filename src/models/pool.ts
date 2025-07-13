import { poolDetailsMap } from "../common/maps.js";
import { Blockchain } from "./blockchain.js";
import { ClmmPoolUtil, TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk";
import BN from "bn.js";
import { SuiClient } from "@mysten/sui/client";
import { BluefinPoolType, CetusPoolType } from "src/utils/poolTypes.js";

/**
 * Pool utility types and interfaces
 */
export interface LiquidityCalculationResult {
  coinAmountA: bigint;
  coinAmountB: bigint;
  liquidity: bigint;
}

export type PoolName = string;

/**
 * Pool utility class for liquidity calculations and pool operations
 */
export class PoolUtils {
  private blockchain: Blockchain;
  client: SuiClient;
  constructor(blockchain: Blockchain, client: SuiClient) {
    this.blockchain = blockchain;
    this.client = client;
  }

  async getParentPool(
    poolId: number
  ): Promise<CetusPoolType | BluefinPoolType> {
    try {
      const id = poolDetailsMap[poolId].parentPoolId;
      const o = await this.client.getObject({
        id: id,
        options: {
          showContent: true,
        },
      });
      const parentPool = o.data as CetusPoolType | BluefinPoolType;
      return parentPool;
    } catch (err) {
      console.error(`getParentPool failed for poolName: ${poolDetailsMap[poolId].poolName}`);
      throw err;
    }
  }

  /**
   * Calculate optimal amounts for deposit
   */
  async getAmounts(
    poolId: number,
    a2b: boolean,
    amount: string,
  ): Promise<[string, string]> {
    try {
      const liquidity = await this.getLiquidity(poolId, a2b, amount);
      const numA = liquidity.coinAmountA.toString();
      const numB = liquidity.coinAmountB.toString();
      return [numA, numB];
    } catch (error) {
      console.warn(`Error calculating amounts for pool ${poolId}:`, error);
      // Fallback to simple 50-50 split
      const halfAmount = (BigInt(amount) / BigInt(2)).toString();
      return a2b ? [amount, halfAmount] : [halfAmount, amount];
    }
  }

  /**
   * Get coin amounts from liquidity value
   */
  async getCoinAmountsFromLiquidity(
    poolId: number,
    liquidity: string
  ): Promise<[string, string]> {
    try {
      const parentPool = await this.getParentPool(poolId);
      const investor = await this.blockchain.getInvestor(poolId);

      const upper_bound = 443636;
      let lower_tick: number;
      let upper_tick: number;
      let current_sqrt_price: string;

      // Extract ticks based on investor type
      if ('lower_tick' in investor && 'upper_tick' in investor) {
        lower_tick = Number(investor.lower_tick);
        upper_tick = Number(investor.upper_tick);
      } else {
        throw new Error(`Unsupported investor type for pool ${poolId}`);
      }

      // Extract current sqrt price based on parent pool type
      if ('current_sqrt_price' in parentPool) {
        current_sqrt_price = parentPool.content.fields.current_sqrt_price;
      } else {
        throw new Error(`Unsupported parent pool type for pool ${poolId}`);
      }

      if (lower_tick > upper_bound) {
        lower_tick = -~(lower_tick - 1);
      }
      if (upper_tick > upper_bound) {
        upper_tick = -~(upper_tick - 1);
      }

      if (parentPool) {
        const liquidityInt = Math.floor(parseFloat(liquidity));
        
        // Simplified calculation - in production would use:
        // const coin_amounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
        //   new BN(`${liquidityInt}`),
        //   new BN(current_sqrt_price),
        //   TickMath.tickIndexToSqrtPriceX64(lower_tick),
        //   TickMath.tickIndexToSqrtPriceX64(upper_tick),
        //   true,
        // );
        
        return this.calculateCoinAmountsFromLiquidity(
          liquidityInt, 
          current_sqrt_price,
          lower_tick,
          upper_tick
        );
      } else {
        return ["0", "0"];
      }
    } catch (error) {
      console.warn(`Error calculating coin amounts from liquidity for pool ${poolId}:`, error);
      return ["0", "0"];
    }
  }

  /**
   * Simplified liquidity estimation (placeholder for ClmmPoolUtil)
   */
  private calculateLiquidityEstimate(
    amount: string,
    a2b: boolean,
    lower_tick: number,
    upper_tick: number,
    current_sqrt_price: bigint
  ): LiquidityCalculationResult {
    const amountBig = BigInt(Math.floor(parseFloat(amount)));
    
    // Simplified calculation based on tick range and price
    const tickRange = Math.abs(upper_tick - lower_tick);
    const priceImpact = Math.min(tickRange / 100000, 0.1); // Cap at 10%
    
    if (a2b) {
      // More of token A, adjusted for price impact
      const coinAmountA = (amountBig * BigInt(Math.floor((60 + priceImpact * 100)))) / BigInt(100);
      const coinAmountB = (amountBig * BigInt(Math.floor((40 - priceImpact * 100)))) / BigInt(100);
      const liquidity = (coinAmountA + coinAmountB) / BigInt(2);
      
      return {
        coinAmountA,
        coinAmountB,
        liquidity,
      };
    } else {
      // More of token B, adjusted for price impact
      const coinAmountA = (amountBig * BigInt(Math.floor((40 - priceImpact * 100)))) / BigInt(100);
      const coinAmountB = (amountBig * BigInt(Math.floor((60 + priceImpact * 100)))) / BigInt(100);
      const liquidity = (coinAmountA + coinAmountB) / BigInt(2);
      
      return {
        coinAmountA,
        coinAmountB,
        liquidity,
      };
    }
  }

  /**
   * Calculate coin amounts from liquidity (simplified)
   */
  private calculateCoinAmountsFromLiquidity(
    liquidityInt: number,
    currentSqrtPrice: string,
    lower_tick: number,
    upper_tick: number
  ): [string, string] {
    const liquidity = BigInt(liquidityInt);
    const priceRatio = BigInt(currentSqrtPrice) / BigInt(1e18); // Normalize price
    
    // Simplified calculation based on price and tick range
    const tickRange = Math.abs(upper_tick - lower_tick);
    const rangeFactor = BigInt(Math.max(1, tickRange / 1000));
    
    const coinA = (liquidity * BigInt(55)) / (BigInt(100) * rangeFactor);
    const coinB = (liquidity * BigInt(45)) / (BigInt(100) * rangeFactor);
    
    return [coinA.toString(), coinB.toString()];
  }

  /**
   * Get pool information by ID
   */
  getPoolInfo(poolId: number) {
    return poolDetailsMap[poolId];
  }

  /**
   * Get pool by name
   */
  getPoolByName(poolName: string) {
    const pools = Object.values(poolDetailsMap);
    return pools.find(pool => 
      pool.poolName === poolName || 
      pool.strategyType === poolName ||
      `${pool.poolName}`.includes(poolName)
    );
  }

  /**
   * Check if pool supports double asset operations
   */
  isDoubleAssetPool(poolId: number): boolean {
    const poolInfo = this.getPoolInfo(poolId);
    return poolInfo && 'token1' in poolInfo.assetTypes && 'token2' in poolInfo.assetTypes;
  }

  /**
   * Get pool asset types
   */
  getPoolAssetTypes(poolId: number): { token1?: string; token2?: string } {
    const poolInfo = this.getPoolInfo(poolId);
    if (poolInfo && 'token1' in poolInfo.assetTypes && 'token2' in poolInfo.assetTypes) {
      return {
        token1: poolInfo.assetTypes.token1,
        token2: poolInfo.assetTypes.token2
      };
    }
    return {};
  }

  async getLiquidity(
    poolId: number,
    a2b: boolean,
    amount: string,
  ) {
    
    try {
      const investor = await this.blockchain.getInvestor(poolId);
      const parentPool = await this.getParentPool(poolId);
      
      // Handle tick calculations for Cetus and Bluefin investors
      const upper_bound = 443636;
      let lower_tick: number;
      let upper_tick: number;
  
      // Extract ticks based on investor type
      if ('lower_tick' in investor && 'upper_tick' in investor) {
        lower_tick = Number(investor.lower_tick);
        upper_tick = Number(investor.upper_tick);
      } else {
        throw new Error(`Unsupported investor type for pool ${poolId}`);
      }
  
      if (lower_tick > upper_bound) {
        lower_tick = -~(lower_tick - 1);
      }
      if (upper_tick > upper_bound) {
        upper_tick = -~(upper_tick - 1);
      }
  
      const current_sqrt_price = new BN(
        parentPool.content.fields.current_sqrt_price,
      );
    
      const liquidity = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
        lower_tick,
        upper_tick,
        new BN(`${Math.floor(parseFloat(amount))}`),
        a2b,
        false,
        0.5,
        current_sqrt_price,
      );
      console.log("liquidity", liquidity);
      return liquidity;
      
    } catch (error) {
      console.warn(`Error calculating liquidity for pool ${poolId}:`, error);
      return {
        coinAmountA: 0n,
        coinAmountB: 0n,
        // tokenMaxA: 0n,
        // tokenMaxB: 0n,
        liquidity: 0n,
        // fix_amount_a: false,
    };
    }
  }
} 



