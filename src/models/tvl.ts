import { Decimal } from 'decimal.js';
import { PoolDetails, poolDetailsMap } from '../common/maps.ts';
import { SuiClient } from '@mysten/sui/client';

export type PoolName = string;

export interface TVLCalculationOptions {
  ignoreCache?: boolean;
  includeUSD?: boolean;
}

export interface PoolTVLData {
  poolName: PoolName;
  totalValueLocked: Decimal; // in native token units
  totalValueLockedUSD: Decimal;
  tokensInvested: Decimal;
  utilizationRate?: Decimal; // for lending strategies
  priceUSD?: Decimal;
  lastUpdated: Date;
}

export interface TVLSummary {
  totalTVLUSD: Decimal;
  topPoolsByTVL: PoolTVLData[];
  pools: PoolTVLData[];
  calculatedAt: Date;
}

export interface TVLBreakdown {
  byProtocol: { [protocol: string]: PoolTVLData[] };
  byStrategy: { [strategy: string]: PoolTVLData[] };
  total: Decimal;
}

/**
 * TVLManager - A comprehensive class for managing Total Value Locked calculations for AlphaFi vaults
 *
 * This class provides:
 * - Pool-specific TVL calculations
 * - Protocol-wide TVL aggregation
 * - USD value calculations using price feeds
 * - TVL breakdown by protocol and strategy type
 * - Historical TVL tracking
 * - Liquidity analysis
 */
export class TVLManager {
  private cache: Map<string, { data: PoolTVLData; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes default
  private client: SuiClient;

  constructor(client: SuiClient, cacheTimeout?: number) {
    this.client = client;
    if (cacheTimeout) {
      this.cacheTimeout = cacheTimeout;
    }
  }

  /**
   * Get TVL data for a specific pool
   */
  async getPoolTVL(poolName: PoolName, options?: TVLCalculationOptions): Promise<PoolTVLData> {
    const cached = this.getCachedTVL(poolName);

    if (cached && !options?.ignoreCache) {
      return cached;
    }

    const tvlData = await this.calculatePoolTVL(poolName, options);
    this.cacheTVLData(poolName, tvlData);

    return tvlData;
  }

  /**
   * Get TVL data for multiple pools
   */
  async getPoolsTVL(
    poolNames?: PoolName[],
    options?: TVLCalculationOptions,
  ): Promise<PoolTVLData[]> {
    const targetPools =
      poolNames || Object.keys(poolDetailsMap).map((id) => poolDetailsMap[Number(id)].poolName);
    const promises = targetPools.map((poolName) => this.getPoolTVL(poolName, options));
    return Promise.all(promises);
  }

  /**
   * Get protocol-wide TVL summary
   */
  async getTVLSummary(
    poolNames?: PoolName[],
    options?: TVLCalculationOptions,
  ): Promise<TVLSummary> {
    const poolTVLs = await this.getPoolsTVL(poolNames, options);

    let totalTVLUSD = new Decimal(0);

    for (const poolTVL of poolTVLs) {
      totalTVLUSD = totalTVLUSD.add(poolTVL.totalValueLockedUSD);
    }

    // Sort pools by TVL for top pools
    const topPools = [...poolTVLs]
      .sort((a, b) => b.totalValueLockedUSD.minus(a.totalValueLockedUSD).toNumber())
      .slice(0, 10);

    return {
      totalTVLUSD,
      topPoolsByTVL: topPools,
      pools: poolTVLs,
      calculatedAt: new Date(),
    };
  }

  /**
   * Get TVL breakdown by protocol and strategy
   */
  async getTVLBreakdown(
    poolNames?: PoolName[],
    options?: TVLCalculationOptions,
  ): Promise<TVLBreakdown> {
    const poolTVLs = await this.getPoolsTVL(poolNames, options);

    const byProtocol: { [protocol: string]: PoolTVLData[] } = {};
    const byStrategy: { [strategy: string]: PoolTVLData[] } = {};
    let total = new Decimal(0);

    for (const poolTVL of poolTVLs) {
      total = total.add(poolTVL.totalValueLockedUSD);

      // Get pool details for categorization
      const poolEntry = Object.entries(poolDetailsMap).find(
        ([, details]) => details.poolName === poolTVL.poolName,
      );

      if (poolEntry) {
        const poolDetails = poolEntry[1];

        // Group by protocol
        if (!byProtocol[poolDetails.parentProtocolName]) {
          byProtocol[poolDetails.parentProtocolName] = [];
        }
        byProtocol[poolDetails.parentProtocolName].push(poolTVL);

        // Group by strategy
        if (!byStrategy[poolDetails.strategyType]) {
          byStrategy[poolDetails.strategyType] = [];
        }
        byStrategy[poolDetails.strategyType].push(poolTVL);
      }
    }

    return {
      byProtocol,
      byStrategy,
      total,
    };
  }

  /**
   * Get top pools by TVL
   */
  async getTopPoolsByTVL(
    count: number = 5,
    options?: TVLCalculationOptions,
  ): Promise<PoolTVLData[]> {
    const poolTVLs = await this.getPoolsTVL(undefined, options);

    return poolTVLs
      .sort((a, b) => b.totalValueLockedUSD.minus(a.totalValueLockedUSD).toNumber())
      .slice(0, count);
  }

  /**
   * Get pools by protocol
   */
  async getPoolsByProtocol(
    protocolName: string,
    options?: TVLCalculationOptions,
  ): Promise<PoolTVLData[]> {
    const protocolPools = Object.entries(poolDetailsMap)
      .filter(([, details]) => details.parentProtocolName === protocolName)
      .map(([, details]) => details.poolName);

    return this.getPoolsTVL(protocolPools, options);
  }

  /**
   * Get pools by strategy type
   */
  async getPoolsByStrategy(
    strategyType: string,
    options?: TVLCalculationOptions,
  ): Promise<PoolTVLData[]> {
    const strategyPools = Object.entries(poolDetailsMap)
      .filter(([, details]) => details.strategyType === strategyType)
      .map(([, details]) => details.poolName);

    return this.getPoolsTVL(strategyPools, options);
  }

  /**
   * Calculate growth metrics for a pool
   */
  async getPoolGrowthMetrics(
    poolName: PoolName,
    previousTVLData?: PoolTVLData,
  ): Promise<{
    tvlGrowth: Decimal; // percentage change
    growthRate: Decimal;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const currentTVL = await this.getPoolTVL(poolName);

    if (!previousTVLData) {
      return {
        tvlGrowth: new Decimal(0),
        growthRate: new Decimal(0),
        trend: 'stable',
      };
    }

    const tvlGrowth = previousTVLData.totalValueLockedUSD.isZero()
      ? new Decimal(0)
      : currentTVL.totalValueLockedUSD
          .minus(previousTVLData.totalValueLockedUSD)
          .div(previousTVLData.totalValueLockedUSD)
          .mul(100);

    const growthRate = tvlGrowth.abs();
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    if (tvlGrowth.gt(1)) {
      trend = 'increasing';
    } else if (tvlGrowth.lt(-1)) {
      trend = 'decreasing';
    }

    return {
      tvlGrowth,
      growthRate,
      trend,
    };
  }

  /**
   * Calculate TVL data for a specific pool
   */
  private async calculatePoolTVL(
    poolName: PoolName,
    options?: TVLCalculationOptions,
  ): Promise<PoolTVLData> {
    // TODO: Implement actual TVL calculation when alphafi-sdk functionality is available
    // For now, return mock data based on pool types

    const poolEntry = Object.entries(poolDetailsMap).find(
      ([, details]) => details.poolName === poolName,
    );

    if (!poolEntry) {
      throw new Error(`Pool not found: ${poolName}`);
    }

    const poolDetails = poolEntry[1];

    // Mock TVL calculation based on strategy type
    const baseTVL = this.getMockTVL(poolDetails);
    const priceUSD = this.getMockPrice(poolDetails);

    const tokensInvested = baseTVL;
    const totalValueLocked = baseTVL;
    const totalValueLockedUSD = baseTVL.mul(priceUSD);

    // Mock utilization rate for certain strategies
    let utilizationRate: Decimal | undefined;
    if (poolDetails.strategyType.includes('LOOPING')) {
      utilizationRate = new Decimal(Math.random() * 0.3 + 0.6); // 60-90%
    }

    return {
      poolName,
      totalValueLocked,
      totalValueLockedUSD,
      tokensInvested,
      utilizationRate,
      priceUSD,
      lastUpdated: new Date(),
    };
  }

  /**
   * Mock TVL calculation - replace with actual implementation
   */
  private getMockTVL(poolDetails: PoolDetails): Decimal {
    // Return mock TVLs based on strategy type and protocol
    let baseTVL: number;

    switch (poolDetails.strategyType) {
      case 'SINGLE-ASSET-LOOPING':
        baseTVL = Math.random() * 5000000 + 1000000; // 1M-6M
        break;
      case 'DOUBLE-ASSET-STRATEGY':
        baseTVL = Math.random() * 3000000 + 500000; // 500K-3.5M
        break;
      case 'SINGLE-ASSET-POOL':
        baseTVL = Math.random() * 2000000 + 300000; // 300K-2.3M
        break;
      default:
        baseTVL = Math.random() * 1000000 + 100000; // 100K-1.1M
    }

    return new Decimal(baseTVL);
  }

  /**
   * Mock price calculation - replace with actual implementation
   */
  private getMockPrice(poolDetails: PoolDetails): Decimal {
    // Return mock prices based on asset types
    if ('token1' in poolDetails.assetTypes) {
      // Multi-asset pools - return average price
      return new Decimal(Math.random() * 5 + 1); // $1-$6
    } else {
      // Single asset pools
      const token = 'token' in poolDetails.assetTypes ? poolDetails.assetTypes.token : '';

      // Mock prices based on common coins
      switch (token?.toLowerCase()) {
        case 'sui':
          return new Decimal(Math.random() * 2 + 1); // $1-$3
        case 'usdc':
        case 'usdt':
          return new Decimal(1); // $1 (stablecoin)
        case 'btc':
          return new Decimal(Math.random() * 10000 + 40000); // $40K-$50K
        case 'eth':
          return new Decimal(Math.random() * 1000 + 2000); // $2K-$3K
        default:
          return new Decimal(Math.random() * 10 + 1); // $1-$11
      }
    }
  }

  /**
   * Cache TVL data
   */
  private cacheTVLData(poolName: PoolName, data: PoolTVLData): void {
    this.cache.set(poolName, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached TVL data if still valid
   */
  private getCachedTVL(poolName: PoolName): PoolTVLData | null {
    const cached = this.cache.get(poolName);
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

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}
