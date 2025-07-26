import { Decimal } from 'decimal.js';
import { PoolDetails, poolDetailsMap } from '../common/maps.js';
import { SuiClient } from '@mysten/sui/client';
import { APRManager } from './apr.ts';
import { TVLManager } from './tvl.ts';

export type PoolName = string;

export interface VaultBalance {
  poolName: PoolName;
  poolId: number;
  userAddress: string;
  xTokens: Decimal; // receipt tokens
  tokensInvested: Decimal; // actual underlying tokens
  tokensInvestedUSD: Decimal;
  currentValue: Decimal; // current value including gains/losses
  currentValueUSD: Decimal;
  totalReturn: Decimal; // absolute return
  totalReturnPercent: Decimal; // percentage return
  apr: number;
  apy: number;
  lastUpdated: Date;
}

export interface UserVaultSummary {
  userAddress: string;
  totalValueUSD: Decimal;
  totalReturnUSD: Decimal;
  totalReturnPercent: Decimal;
  averageAPR: number;
  averageAPY: number;
  vaultCount: number;
  topVaultByValue: VaultBalance | null;
  topVaultByReturn: VaultBalance | null;
  vaults: VaultBalance[];
  calculatedAt: Date;
}

export interface VaultPerformanceMetrics {
  vault: VaultBalance;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  riskAdjustedReturn: number;
  performanceScore: number;
}

export interface VaultAllocation {
  vault: VaultBalance;
  allocationPercent: Decimal;
  recommendedAllocation: Decimal;
  status: 'underweight' | 'overweight' | 'balanced';
}

/**
 * VaultManager - A comprehensive class for managing user vault positions and balances
 *
 * This class provides:
 * - User vault balance tracking
 * - Portfolio performance analytics
 * - Position management utilities
 * - Vault discovery and filtering
 * - Performance metrics and comparisons
 * - Portfolio allocation recommendations
 */
export class VaultManager {
  private cache: Map<string, { data: VaultBalance[]; timestamp: number }> = new Map();
  private cacheTimeout: number = 2 * 60 * 1000; // 2 minutes default (more frequent updates for balances)
  private client: SuiClient;
  private aprManager: APRManager;
  private tvlManager: TVLManager;

  constructor(
    client: SuiClient,
    aprManager: APRManager,
    tvlManager: TVLManager,
    cacheTimeout?: number,
  ) {
    this.client = client;
    this.aprManager = aprManager;
    this.tvlManager = tvlManager;
    if (cacheTimeout) {
      this.cacheTimeout = cacheTimeout;
    }
  }

  /**
   * Get all vault balances for a user
   */
  async getUserVaultBalances(userAddress: string, ignoreCache?: boolean): Promise<VaultBalance[]> {
    const cached = this.getCachedBalances(userAddress);

    if (cached && !ignoreCache) {
      return cached;
    }

    const balances = await this.fetchUserVaultBalances(userAddress);
    this.cacheBalances(userAddress, balances);

    return balances;
  }

  /**
   * Get vault balance for a specific pool
   */
  async getUserVaultBalance(
    userAddress: string,
    poolName: PoolName,
    ignoreCache?: boolean,
  ): Promise<VaultBalance | null> {
    const balances = await this.getUserVaultBalances(userAddress, ignoreCache);
    return balances.find((balance) => balance.poolName === poolName) || null;
  }

  /**
   * Get comprehensive user vault summary
   */
  async getUserVaultSummary(userAddress: string, ignoreCache?: boolean): Promise<UserVaultSummary> {
    const vaults = await this.getUserVaultBalances(userAddress, ignoreCache);

    if (vaults.length === 0) {
      return {
        userAddress,
        totalValueUSD: new Decimal(0),
        totalReturnUSD: new Decimal(0),
        totalReturnPercent: new Decimal(0),
        averageAPR: 0,
        averageAPY: 0,
        vaultCount: 0,
        topVaultByValue: null,
        topVaultByReturn: null,
        vaults: [],
        calculatedAt: new Date(),
      };
    }

    let totalValueUSD = new Decimal(0);
    let totalReturnUSD = new Decimal(0);
    let totalInvestedUSD = new Decimal(0);
    let weightedAPR = 0;
    let weightedAPY = 0;

    for (const vault of vaults) {
      totalValueUSD = totalValueUSD.add(vault.currentValueUSD);
      totalReturnUSD = totalReturnUSD.add(vault.totalReturn);
      totalInvestedUSD = totalInvestedUSD.add(vault.tokensInvestedUSD);

      // Weight APR/APY by vault value
      const weight = vault.currentValueUSD
        .div(totalValueUSD.isZero() ? 1 : totalValueUSD)
        .toNumber();
      weightedAPR += vault.apr * weight;
      weightedAPY += vault.apy * weight;
    }

    const totalReturnPercent = totalInvestedUSD.isZero()
      ? new Decimal(0)
      : totalReturnUSD.div(totalInvestedUSD).mul(100);

    const topVaultByValue = vaults.reduce((max, vault) =>
      vault.currentValueUSD.gt(max.currentValueUSD) ? vault : max,
    );

    const topVaultByReturn = vaults.reduce((max, vault) =>
      vault.totalReturnPercent.gt(max.totalReturnPercent) ? vault : max,
    );

    return {
      userAddress,
      totalValueUSD,
      totalReturnUSD,
      totalReturnPercent,
      averageAPR: weightedAPR,
      averageAPY: weightedAPY,
      vaultCount: vaults.length,
      topVaultByValue,
      topVaultByReturn,
      vaults,
      calculatedAt: new Date(),
    };
  }

  /**
   * Get available vaults for investment
   */
  async getAvailableVaults(): Promise<
    Array<{
      poolName: PoolName;
      poolId: number;
      poolDetails: PoolDetails;
      apr: number;
      apy: number;
      tvlUSD: Decimal;
      isActive: boolean;
    }>
  > {
    const pools = Object.entries(poolDetailsMap).map(([id, details]) => ({
      poolId: Number(id),
      poolName: details.poolName,
      poolDetails: details,
    }));

    const results = await Promise.all(
      pools.map(async (pool) => {
        const [aprData, tvlData] = await Promise.all([
          this.aprManager.getPoolAPRData(pool.poolName),
          this.tvlManager.getPoolTVL(pool.poolName),
        ]);

        return {
          poolName: pool.poolName,
          poolId: pool.poolId,
          poolDetails: pool.poolDetails,
          apr: aprData.totalAPR,
          apy: aprData.apy,
          tvlUSD: tvlData.totalValueLockedUSD,
          isActive: true, // TODO: Add logic to determine if pool is active
        };
      }),
    );

    return results.sort((a, b) => b.apr - a.apr);
  }

  /**
   * Get vault performance metrics
   */
  async getVaultPerformanceMetrics(
    userAddress: string,
    poolName: PoolName,
  ): Promise<VaultPerformanceMetrics | null> {
    const vault = await this.getUserVaultBalance(userAddress, poolName);
    if (!vault) return null;

    // Get additional metrics from APR manager
    const aprMetrics = await this.aprManager.getPoolPerformanceMetrics(poolName);

    const sharpeRatio = aprMetrics.sharpeRatio;
    const volatility = aprMetrics.volatility;
    const maxDrawdown = aprMetrics.maxDrawdown;

    // Calculate risk-adjusted return
    const riskAdjustedReturn = vault.totalReturnPercent.toNumber() / Math.max(volatility, 1);

    // Calculate overall performance score (0-100)
    const returnScore = Math.min(vault.totalReturnPercent.toNumber() * 2, 50); // Max 50 points for returns
    const aprScore = Math.min(vault.apr, 25); // Max 25 points for APR
    const riskScore = Math.max(25 - volatility, 0); // Max 25 points, reduced by volatility
    const performanceScore = returnScore + aprScore + riskScore;

    return {
      vault,
      sharpeRatio,
      volatility,
      maxDrawdown,
      riskAdjustedReturn,
      performanceScore,
    };
  }

  /**
   * Get portfolio allocation recommendations
   */
  async getPortfolioAllocation(userAddress: string): Promise<VaultAllocation[]> {
    const summary = await this.getUserVaultSummary(userAddress);

    if (summary.vaults.length === 0) return [];

    const allocations: VaultAllocation[] = [];

    for (const vault of summary.vaults) {
      const allocationPercent = vault.currentValueUSD.div(summary.totalValueUSD).mul(100);

      // Simple allocation recommendation based on vault performance
      let recommendedAllocation = new Decimal(20); // Default 20%

      // Adjust based on APR (higher APR = higher allocation)
      if (vault.apr > 15) recommendedAllocation = new Decimal(30);
      else if (vault.apr > 10) recommendedAllocation = new Decimal(25);
      else if (vault.apr < 5) recommendedAllocation = new Decimal(10);

      // Determine status
      let status: 'underweight' | 'overweight' | 'balanced' = 'balanced';
      const diff = allocationPercent.minus(recommendedAllocation);
      if (diff.lt(-5)) status = 'underweight';
      else if (diff.gt(5)) status = 'overweight';

      allocations.push({
        vault,
        allocationPercent,
        recommendedAllocation,
        status,
      });
    }

    return allocations.sort((a, b) =>
      b.vault.currentValueUSD.minus(a.vault.currentValueUSD).toNumber(),
    );
  }

  /**
   * Get vaults by strategy type
   */
  async getVaultsByStrategy(userAddress: string, strategyType: string): Promise<VaultBalance[]> {
    const balances = await this.getUserVaultBalances(userAddress);

    return balances.filter((balance) => {
      const poolEntry = Object.entries(poolDetailsMap).find(
        ([, details]) => details.poolName === balance.poolName,
      );
      return poolEntry && poolEntry[1].strategyType === strategyType;
    });
  }

  /**
   * Get vaults by protocol
   */
  async getVaultsByProtocol(userAddress: string, protocolName: string): Promise<VaultBalance[]> {
    const balances = await this.getUserVaultBalances(userAddress);

    return balances.filter((balance) => {
      const poolEntry = Object.entries(poolDetailsMap).find(
        ([, details]) => details.poolName === balance.poolName,
      );
      return poolEntry && poolEntry[1].parentProtocolName === protocolName;
    });
  }

  /**
   * Fetch user vault balances (mock implementation)
   */
  private async fetchUserVaultBalances(userAddress: string): Promise<VaultBalance[]> {
    // TODO: Implement actual balance fetching when alphafi-sdk functionality is available
    // For now, return mock data for demonstration

    const mockBalances: VaultBalance[] = [];
    const poolEntries = Object.entries(poolDetailsMap).slice(0, 3); // Mock 3 positions

    for (const [poolId, poolDetails] of poolEntries) {
      if (Math.random() > 0.7) continue; // Randomly skip some pools to simulate user not having positions

      const aprData = await this.aprManager.getPoolAPRData(poolDetails.poolName);
      const tvlData = await this.tvlManager.getPoolTVL(poolDetails.poolName);

      // Mock user position data
      const xTokens = new Decimal(Math.random() * 1000 + 100); // 100-1100 xTokens
      const tokensInvested = xTokens.mul(1.1); // Assuming 1:1.1 ratio for growth
      const priceUSD = tvlData.priceUSD || new Decimal(1);
      const tokensInvestedUSD = tokensInvested.mul(priceUSD);

      // Simulate some growth
      const growthFactor = new Decimal(Math.random() * 0.2 + 1); // 0-20% growth
      const currentValue = tokensInvested.mul(growthFactor);
      const currentValueUSD = currentValue.mul(priceUSD);

      const totalReturn = currentValue.minus(tokensInvested);
      const totalReturnPercent = tokensInvested.isZero()
        ? new Decimal(0)
        : totalReturn.div(tokensInvested).mul(100);

      mockBalances.push({
        poolName: poolDetails.poolName,
        poolId: Number(poolId),
        userAddress,
        xTokens,
        tokensInvested,
        tokensInvestedUSD,
        currentValue,
        currentValueUSD,
        totalReturn,
        totalReturnPercent,
        apr: aprData.totalAPR,
        apy: aprData.apy,
        lastUpdated: new Date(),
      });
    }

    return mockBalances;
  }

  /**
   * Cache user balances
   */
  private cacheBalances(userAddress: string, balances: VaultBalance[]): void {
    this.cache.set(userAddress, {
      data: balances,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached balances if still valid
   */
  private getCachedBalances(userAddress: string): VaultBalance[] | null {
    const cached = this.cache.get(userAddress);
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
   * Clear cache for specific user
   */
  clearUserCache(userAddress: string): void {
    this.cache.delete(userAddress);
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
