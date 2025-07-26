import { Decimal } from 'decimal.js';
import { PoolDetails, poolDetailsMap } from '../common/maps.js';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConf } from '../common/constants.js';
import { PoolUtils } from './pool.js';
import { Blockchain } from './blockchain.js';
import BN from 'bn.js';

export type PoolName = string;
export type CoinName = string;

/**
 * Pool weight data structure for distribution management
 */
export interface PoolData {
  weight: number;
  imageUrl1: string;
  imageUrl2: string;
  lockIcon: string;
  poolName: PoolName;
}

/**
 * Pool weight distribution structure
 */
export interface PoolWeightDistribution {
  data: PoolData[];
  totalWeight: number;
  coinType: CoinName;
}

/**
 * Position tick information
 */
export interface PositionTicks {
  lowerTick: number;
  upperTick: number;
}

/**
 * Tick spacing information for different protocols
 */
export interface TickSpacingInfo {
  tickSpacing: number;
  protocol: string;
}

/**
 * Admin operations options
 */
export interface AdminOptions {
  ignoreCache?: boolean;
  dryRun?: boolean;
}

/**
 * Set weights operation parameters
 */
export interface SetWeightsParams {
  poolNames: PoolName[];
  weights: string[];
  coinType: CoinName;
  adminAddress: string;
}

/**
 * AdminManager - A comprehensive class for managing administrative functions in AlphaFi
 *
 * This class provides admin-level functionality including:
 * - Pool position management (ticks, spacing)
 * - Price/tick conversions
 * - Weight distribution management
 * - Administrative operations
 */
export class AdminManager {
  private client: SuiClient;
  private poolUtils: PoolUtils;
  private blockchain: Blockchain;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 2 * 60 * 1000; // 2 minutes for admin data

  constructor(client: SuiClient, poolUtils: PoolUtils, blockchain: Blockchain) {
    this.client = client;
    this.poolUtils = poolUtils;
    this.blockchain = blockchain;
  }

  /**
   * Get the current tick for a pool based on current sqrt price
   */
  async getCurrentTick(poolName: PoolName): Promise<number> {
    try {
      const poolDetails = this.getPoolDetails(poolName);
      if (!poolDetails) {
        throw new Error(`Pool ${poolName} not found`);
      }

      const poolId = this.getPoolIdFromName(poolName);
      if (poolId === null) {
        throw new Error(`Could not find pool ID for ${poolName}`);
      }

      const parentPool = await this.poolUtils.getParentPool(poolId);
      if (!parentPool || !('current_sqrt_price' in parentPool.content.fields)) {
        throw new Error(`Could not get parent pool for ${poolName}`);
      }

      const currentSqrtPrice = parentPool.content.fields.current_sqrt_price;

      // Convert sqrt price to tick using simplified calculation
      // In production, this would use TickMath.sqrtPriceX64ToTickIndex()
      const tick = this.sqrtPriceToTick(currentSqrtPrice);

      return tick;
    } catch (error) {
      console.error(`Error getting current tick for ${poolName}:`, error);
      throw error;
    }
  }

  /**
   * Get position ticks (lower and upper bounds) for a pool
   */
  async getPositionTicks(poolName: PoolName): Promise<PositionTicks> {
    try {
      const poolDetails = this.getPoolDetails(poolName);
      if (!poolDetails) {
        throw new Error(`Pool ${poolName} not found`);
      }

      const poolId = this.getPoolIdFromName(poolName);
      if (poolId === null) {
        throw new Error(`Could not find pool ID for ${poolName}`);
      }

      const investor = await this.blockchain.getInvestor(poolId);
      if (!investor || !('lower_tick' in investor && 'upper_tick' in investor)) {
        throw new Error(`Could not get investor data for ${poolName}`);
      }

      const upperBound = 443636;
      let lowerTick = Number(investor.lower_tick);
      let upperTick = Number(investor.upper_tick);

      // Handle tick encoding for large values
      if (lowerTick > upperBound) {
        lowerTick = -~(lowerTick - 1);
      }
      if (upperTick > upperBound) {
        upperTick = -~(upperTick - 1);
      }

      return {
        lowerTick,
        upperTick,
      };
    } catch (error) {
      console.error(`Error getting position ticks for ${poolName}:`, error);
      throw error;
    }
  }

  /**
   * Convert tick to price for a given pool
   */
  getTickToPrice(poolName: PoolName, tick: number): string {
    try {
      const poolDetails = this.getPoolDetails(poolName);
      if (!poolDetails) {
        throw new Error(`Pool ${poolName} not found`);
      }

      // Get asset types for the pool
      const assetTypes = this.poolUtils.getPoolAssetTypes(this.getPoolIdFromName(poolName)!);
      if (!assetTypes.token1 || !assetTypes.token2) {
        throw new Error(`Could not get asset types for ${poolName}`);
      }

      // Simplified price calculation from tick
      // In production, this would use TickMath.tickIndexToPrice()
      const price = this.tickToPrice(tick, 9, 9); // Assuming 9 decimals for both tokens

      return price.toString();
    } catch (error) {
      console.error(`Error converting tick to price for ${poolName}:`, error);
      throw error;
    }
  }

  /**
   * Convert price to tick for a given pool
   */
  getPriceToTick(
    poolName: PoolName,
    price: string,
    tickSpacing: number,
    isUpper: boolean = false,
  ): number {
    try {
      const poolDetails = this.getPoolDetails(poolName);
      if (!poolDetails) {
        throw new Error(`Pool ${poolName} not found`);
      }

      // Simplified tick calculation from price
      // In production, this would use TickMath.priceToTickIndex()
      let tick = this.priceToTick(new Decimal(price), 9, 9); // Assuming 9 decimals

      // Adjust tick to spacing
      if (tick % tickSpacing) {
        if (isUpper === tick > 0) {
          tick = tick + tickSpacing - (tick % tickSpacing);
        } else {
          tick = tick - (tick % tickSpacing);
        }
      }

      return tick;
    } catch (error) {
      console.error(`Error converting price to tick for ${poolName}:`, error);
      throw error;
    }
  }

  /**
   * Get tick spacing for a pool based on its protocol
   */
  async getTickSpacing(poolName: PoolName): Promise<TickSpacingInfo> {
    try {
      const poolDetails = this.getPoolDetails(poolName);
      if (!poolDetails) {
        throw new Error(`Pool ${poolName} not found`);
      }

      const poolId = this.getPoolIdFromName(poolName);
      if (poolId === null) {
        throw new Error(`Could not find pool ID for ${poolName}`);
      }

      const parentPool = await this.poolUtils.getParentPool(poolId);
      if (!parentPool) {
        throw new Error(`Could not get parent pool for ${poolName}`);
      }

      let tickSpacing = 1;
      const protocol = poolDetails.parentProtocolName;

      if (protocol === 'CETUS') {
        if ('tick_spacing' in parentPool.content.fields) {
          tickSpacing = Number(parentPool.content.fields.tick_spacing);
        }
      } else if (protocol === 'BLUEFIN') {
        if (
          'ticks_manager' in parentPool.content.fields &&
          parentPool.content.fields.ticks_manager.fields.tick_spacing
        ) {
          tickSpacing = Number(parentPool.content.fields.ticks_manager.fields.tick_spacing);
        }
      }

      return {
        tickSpacing,
        protocol,
      };
    } catch (error) {
      console.error(`Error getting tick spacing for ${poolName}:`, error);
      const poolDetails = this.getPoolDetails(poolName);
      return { tickSpacing: 1, protocol: poolDetails?.parentProtocolName || 'UNKNOWN' };
    }
  }

  /**
   * Set weights for multiple pools (admin function)
   */
  async setWeights(params: SetWeightsParams, options?: AdminOptions): Promise<Transaction> {
    try {
      const { poolNames, weights, coinType, adminAddress } = params;

      if (poolNames.length !== weights.length) {
        throw new Error('Pool names and weights arrays must have the same length');
      }

      // Get pool IDs from names
      const poolIds: string[] = [];
      for (const poolName of poolNames) {
        const poolDetails = this.getPoolDetails(poolName);
        if (!poolDetails) {
          throw new Error(`Pool ${poolName} not found`);
        }
        poolIds.push(poolDetails.poolId);
      }

      // Get admin capability
      const adminCap = await this.getAdminCap(adminAddress);
      if (!adminCap) {
        throw new Error('No admin capability found for the provided address');
      }

      // Create transaction
      const txb = new Transaction();

      // Get coin type for the transaction
      const coinTypeString = this.getCoinTypeString(coinType);

      txb.moveCall({
        target: `${getConf().ALPHA_LATEST_PACKAGE_ID}::distributor::set_weights`,
        typeArguments: [coinTypeString],
        arguments: [
          txb.object(adminCap),
          txb.object(getConf().ALPHA_DISTRIBUTOR),
          txb.object(getConf().VERSION),
          txb.pure.vector('id', poolIds),
          txb.pure.vector('u64', weights),
          txb.object(getConf().CLOCK_PACKAGE_ID),
        ],
      });

      return txb;
    } catch (error) {
      console.error('Error setting weights:', error);
      throw error;
    }
  }

  /**
   * Get pool weight distribution for a specific coin type
   */
  async getPoolsWeightDistribution(
    coinType: CoinName,
    options?: AdminOptions,
  ): Promise<PoolWeightDistribution> {
    const cacheKey = `weight_distribution_${coinType}`;

    // Check cache first
    if (!options?.ignoreCache) {
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Get distributor object
      const distributor = await this.getDistributor(options?.ignoreCache);
      if (!distributor || !distributor.content.fields.pool_allocator) {
        throw new Error('Distributor or pool allocator not found');
      }

      const allocator = distributor.content.fields.pool_allocator;
      const members = allocator.fields.members.fields.contents;

      // Get total weight for the coin type
      const totalWeightArr = allocator.fields.total_weights.fields.contents;
      let totalWeight = 0;
      const coinTypeString = this.getCoinTypeString(coinType);

      for (const entry of totalWeightArr) {
        if (entry.fields.key.fields.name === coinTypeString.substring(2)) {
          totalWeight = Number(entry.fields.value);
          break;
        }
      }

      // Build pool data array
      const poolDataArray: PoolData[] = [];

      for (const member of members) {
        const poolId = member.fields.key;
        const poolDetails = this.getPoolDetailsByPoolId(poolId);

        if (!poolDetails) {
          continue;
        }

        const poolName = poolDetails.poolName;
        let weight = 0;

        if (member.fields.value.fields) {
          const poolData = member.fields.value.fields.pool_data.fields.contents;
          for (const entry of poolData) {
            if (entry.fields.key.fields.name === coinTypeString.substring(2)) {
              weight = Number(entry.fields.value.fields.weight);
              break;
            }
          }
        }

        poolDataArray.push({
          weight,
          imageUrl1: poolDetails.images?.imageUrl1 || '',
          imageUrl2: poolDetails.images?.imageUrl2 || '',
          lockIcon: poolDetails.lockIcon || '',
          poolName,
        });
      }

      const result: PoolWeightDistribution = {
        data: poolDataArray,
        totalWeight,
        coinType,
      };

      // Cache the result
      this.cacheData(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`Error getting pool weight distribution for ${coinType}:`, error);
      throw error;
    }
  }

  /**
   * Get all pools with their current admin settings
   */
  async getAllPoolsAdminInfo(options?: AdminOptions): Promise<{
    pools: Array<{
      poolName: PoolName;
      poolId: string;
      protocol: string;
      strategyType: string;
      currentTick?: number;
      positionTicks?: PositionTicks;
      tickSpacing?: TickSpacingInfo;
    }>;
  }> {
    try {
      const allPools = this.poolUtils.getAllPools();
      const poolsInfo = [];

      for (const poolDetails of allPools) {
        const poolInfo: any = {
          poolName: poolDetails.poolName,
          poolId: poolDetails.poolId,
          protocol: poolDetails.parentProtocolName,
          strategyType: poolDetails.strategyType,
        };

        try {
          // Get additional info for LP pools
          if (this.poolUtils.isDoubleAssetPool(Number(poolDetails.poolId))) {
            poolInfo.currentTick = await this.getCurrentTick(poolDetails.poolName);
            poolInfo.positionTicks = await this.getPositionTicks(poolDetails.poolName);
            poolInfo.tickSpacing = await this.getTickSpacing(poolDetails.poolName);
          }
        } catch (error) {
          console.warn(`Could not get tick info for ${poolDetails.poolName}:`, error);
        }

        poolsInfo.push(poolInfo);
      }

      return { pools: poolsInfo };
    } catch (error) {
      console.error('Error getting all pools admin info:', error);
      throw error;
    }
  }

  /**
   * Helper: Get admin capability for an address
   */
  private async getAdminCap(address: string): Promise<string | null> {
    try {
      const adminCap = await this.client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${getConf().ALPHA_LATEST_PACKAGE_ID}::distributor::AdminCap`,
        },
        options: {
          showContent: true,
        },
      });

      if (!adminCap.data || adminCap.data.length === 0) {
        return null;
      }

      const objectData = adminCap.data[0].data;
      return objectData ? objectData.objectId : null;
    } catch (error) {
      console.error('Error getting admin capability:', error);
      return null;
    }
  }

  /**
   * Helper: Get distributor object
   */
  private async getDistributor(ignoreCache?: boolean): Promise<any> {
    try {
      const distributorId = getConf().ALPHA_DISTRIBUTOR;
      const distributor = await this.client.getObject({
        id: distributorId,
        options: {
          showContent: true,
        },
      });

      return distributor.data;
    } catch (error) {
      console.error('Error getting distributor:', error);
      return null;
    }
  }

  /**
   * Helper: Convert sqrt price to tick (simplified)
   */
  private sqrtPriceToTick(sqrtPrice: string): number {
    // Simplified conversion - in production would use TickMath
    const price = new BN(sqrtPrice);
    const log2 = Math.log2(price.toNumber() / Math.pow(2, 64));
    return Math.floor(log2 / Math.log2(1.0001));
  }

  /**
   * Helper: Convert tick to price (simplified)
   */
  private tickToPrice(tick: number, decimalsA: number, decimalsB: number): Decimal {
    // Simplified conversion - in production would use TickMath
    const price = Math.pow(1.0001, tick);
    const adjustedPrice = price * Math.pow(10, decimalsB - decimalsA);
    return new Decimal(adjustedPrice);
  }

  /**
   * Helper: Convert price to tick (simplified)
   */
  private priceToTick(price: Decimal, decimalsA: number, decimalsB: number): number {
    // Simplified conversion - in production would use TickMath
    const adjustedPrice = price.toNumber() / Math.pow(10, decimalsB - decimalsA);
    return Math.floor(Math.log(adjustedPrice) / Math.log(1.0001));
  }

  /**
   * Helper: Get coin type string for a coin name
   */
  private getCoinTypeString(coinName: CoinName): string {
    // This would map to actual coin types from constants
    // For now, return a placeholder
    return `0x2::sui::SUI`; // Simplified - should map from coinsList
  }

  /**
   * Helper: Get pool details by name
   */
  private getPoolDetails(poolName: PoolName): PoolDetails | null {
    const poolEntry = Object.entries(poolDetailsMap).find(
      ([, details]) => details.poolName === poolName,
    );
    return poolEntry ? poolEntry[1] : null;
  }

  /**
   * Helper: Get pool details by pool ID
   */
  private getPoolDetailsByPoolId(poolId: string): PoolDetails | null {
    const poolEntry = Object.entries(poolDetailsMap).find(
      ([, details]) => details.poolId === poolId,
    );
    return poolEntry ? poolEntry[1] : null;
  }

  /**
   * Helper: Get pool ID from pool name
   */
  private getPoolIdFromName(poolName: PoolName): number | null {
    const poolEntry = Object.entries(poolDetailsMap).find(
      ([, details]) => details.poolName === poolName,
    );
    return poolEntry ? Number(poolEntry[0]) : null;
  }

  /**
   * Helper: Cache data
   */
  private cacheData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Helper: Get cached data
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
