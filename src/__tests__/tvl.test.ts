import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { SuiClient } from '@mysten/sui/client';
import { TVLManager, PoolTVLData, TVLSummary, TVLBreakdown } from '../models/tvl.js';
import { Decimal } from 'decimal.js';

// Mock SuiClient
const mockSuiClient = {} as SuiClient;

describe('TVLManager', () => {
  let tvlManager: TVLManager;

  beforeEach(() => {
    tvlManager = new TVLManager(mockSuiClient, 1000); // 1 second cache for testing
  });

  afterEach(() => {
    tvlManager.clearCache();
  });

  describe('constructor', () => {
    test('should create TVLManager with default cache timeout', () => {
      const manager = new TVLManager(mockSuiClient);
      expect(manager).toBeInstanceOf(TVLManager);
    });

    test('should create TVLManager with custom cache timeout', () => {
      const manager = new TVLManager(mockSuiClient, 5000);
      expect(manager).toBeInstanceOf(TVLManager);
    });
  });

  describe('getPoolTVL', () => {
    test('should return TVL data for a valid pool', async () => {
      const tvlData = await tvlManager.getPoolTVL('ALPHA');
      
      expect(tvlData).toHaveProperty('poolName', 'ALPHA');
      expect(tvlData).toHaveProperty('totalValueLocked');
      expect(tvlData).toHaveProperty('totalValueLockedUSD');
      expect(tvlData).toHaveProperty('tokensInvested');
      expect(tvlData).toHaveProperty('priceUSD');
      expect(tvlData).toHaveProperty('lastUpdated');
      
      expect(tvlData.totalValueLocked).toBeInstanceOf(Decimal);
      expect(tvlData.totalValueLockedUSD).toBeInstanceOf(Decimal);
      expect(tvlData.tokensInvested).toBeInstanceOf(Decimal);
      expect(tvlData.priceUSD).toBeInstanceOf(Decimal);
      expect(tvlData.lastUpdated).toBeInstanceOf(Date);
      
      expect(tvlData.totalValueLocked.toNumber()).toBeGreaterThan(0);
      expect(tvlData.totalValueLockedUSD.toNumber()).toBeGreaterThan(0);
    });

    test('should throw error for non-existent pool', async () => {
      await expect(tvlManager.getPoolTVL('NONEXISTENT_POOL')).rejects.toThrow('Pool not found');
    });

    test('should use cache when available', async () => {
      // First call
      const tvlData1 = await tvlManager.getPoolTVL('ALPHA');
      
      // Second call should use cache
      const tvlData2 = await tvlManager.getPoolTVL('ALPHA');
      
      expect(tvlData1.lastUpdated).toEqual(tvlData2.lastUpdated);
    });

    test('should ignore cache when option is set', async () => {
      // First call
      const tvlData1 = await tvlManager.getPoolTVL('ALPHA');
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Second call with ignoreCache should return fresh data
      const tvlData2 = await tvlManager.getPoolTVL('ALPHA', { ignoreCache: true });
      
      expect(tvlData1.lastUpdated.getTime()).not.toEqual(tvlData2.lastUpdated.getTime());
    });

    test('should include utilization rate for looping strategies', async () => {
      const tvlData = await tvlManager.getPoolTVL('NAVI-LOOP-SUI-VSUI');
      
      if (tvlData.utilizationRate) {
        expect(tvlData.utilizationRate).toBeInstanceOf(Decimal);
        expect(tvlData.utilizationRate.toNumber()).toBeGreaterThan(0);
        expect(tvlData.utilizationRate.toNumber()).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getPoolsTVL', () => {
    test('should return TVL data for multiple pools', async () => {
      const poolTVLs = await tvlManager.getPoolsTVL(['ALPHA', 'NAVI-SUI']);
      
      expect(Array.isArray(poolTVLs)).toBe(true);
      expect(poolTVLs.length).toBe(2);
      
      const alphaPool = poolTVLs.find(pool => pool.poolName === 'ALPHA');
      const naviPool = poolTVLs.find(pool => pool.poolName === 'NAVI-SUI');
      
      expect(alphaPool).toBeDefined();
      expect(naviPool).toBeDefined();
    });

    test('should return TVL data for all pools when no specific pools provided', async () => {
      const poolTVLs = await tvlManager.getPoolsTVL();
      
      expect(Array.isArray(poolTVLs)).toBe(true);
      expect(poolTVLs.length).toBeGreaterThan(0);
    });
  });

  describe('getTVLSummary', () => {
    test('should return comprehensive TVL summary', async () => {
      const summary = await tvlManager.getTVLSummary(['ALPHA', 'NAVI-SUI', 'CETUS-SUI-USDC']);
      
      expect(summary).toHaveProperty('totalTVLUSD');
      expect(summary).toHaveProperty('topPoolsByTVL');
      expect(summary).toHaveProperty('pools');
      expect(summary).toHaveProperty('calculatedAt');
      
      expect(summary.totalTVLUSD).toBeInstanceOf(Decimal);
      expect(Array.isArray(summary.topPoolsByTVL)).toBe(true);
      expect(Array.isArray(summary.pools)).toBe(true);
      expect(summary.calculatedAt).toBeInstanceOf(Date);
      
      expect(summary.pools.length).toBe(3);
      expect(summary.topPoolsByTVL.length).toBeLessThanOrEqual(10);
      
      // Top pools should be sorted by TVL descending
      if (summary.topPoolsByTVL.length > 1) {
        for (let i = 0; i < summary.topPoolsByTVL.length - 1; i++) {
          expect(summary.topPoolsByTVL[i].totalValueLockedUSD.toNumber())
            .toBeGreaterThanOrEqual(summary.topPoolsByTVL[i + 1].totalValueLockedUSD.toNumber());
        }
      }
    });

    test('should calculate total TVL correctly', async () => {
      const summary = await tvlManager.getTVLSummary(['ALPHA', 'NAVI-SUI']);
      
      let calculatedTotal = new Decimal(0);
      for (const pool of summary.pools) {
        calculatedTotal = calculatedTotal.add(pool.totalValueLockedUSD);
      }
      
      expect(summary.totalTVLUSD.toNumber()).toBeCloseTo(calculatedTotal.toNumber(), 2);
    });
  });

  describe('getTVLBreakdown', () => {
    test('should return TVL breakdown by protocol and strategy', async () => {
      const breakdown = await tvlManager.getTVLBreakdown();
      
      expect(breakdown).toHaveProperty('byProtocol');
      expect(breakdown).toHaveProperty('byStrategy');
      expect(breakdown).toHaveProperty('total');
      
      expect(typeof breakdown.byProtocol).toBe('object');
      expect(typeof breakdown.byStrategy).toBe('object');
      expect(breakdown.total).toBeInstanceOf(Decimal);
      
      // Should have entries for major protocols
      expect(Object.keys(breakdown.byProtocol).length).toBeGreaterThan(0);
      expect(Object.keys(breakdown.byStrategy).length).toBeGreaterThan(0);
    });

    test('should group pools correctly by protocol', async () => {
      const breakdown = await tvlManager.getTVLBreakdown();
      
      if (breakdown.byProtocol.NAVI) {
        expect(Array.isArray(breakdown.byProtocol.NAVI)).toBe(true);
        const naviPools = breakdown.byProtocol.NAVI;
        
        // All pools in NAVI group should have NAVI as protocol
        naviPools.forEach(pool => {
          expect(pool.poolName).toMatch(/NAVI/);
        });
      }
      
      if (breakdown.byProtocol.CETUS) {
        expect(Array.isArray(breakdown.byProtocol.CETUS)).toBe(true);
        const cetusPools = breakdown.byProtocol.CETUS;
        
        // All pools in CETUS group should have CETUS as protocol
        cetusPools.forEach(pool => {
          expect(pool.poolName).toMatch(/CETUS/);
        });
      }
    });
  });

  describe('getTopPoolsByTVL', () => {
    test('should return top pools by TVL', async () => {
      const topPools = await tvlManager.getTopPoolsByTVL(3);
      
      expect(Array.isArray(topPools)).toBe(true);
      expect(topPools.length).toBeLessThanOrEqual(3);
      
      // Should be sorted by TVL descending
      if (topPools.length > 1) {
        for (let i = 0; i < topPools.length - 1; i++) {
          expect(topPools[i].totalValueLockedUSD.toNumber())
            .toBeGreaterThanOrEqual(topPools[i + 1].totalValueLockedUSD.toNumber());
        }
      }
    });

    test('should return default 5 pools when count not specified', async () => {
      const topPools = await tvlManager.getTopPoolsByTVL();
      
      expect(Array.isArray(topPools)).toBe(true);
      expect(topPools.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getPoolsByProtocol', () => {
    test('should return pools for specific protocol', async () => {
      const naviPools = await tvlManager.getPoolsByProtocol('NAVI');
      
      expect(Array.isArray(naviPools)).toBe(true);
      
      // All returned pools should be NAVI pools
      naviPools.forEach(pool => {
        expect(pool.poolName).toMatch(/NAVI/);
      });
    });

    test('should return empty array for non-existent protocol', async () => {
      const nonExistentPools = await tvlManager.getPoolsByProtocol('NONEXISTENT');
      
      expect(Array.isArray(nonExistentPools)).toBe(true);
      expect(nonExistentPools.length).toBe(0);
    });
  });

  describe('getPoolsByStrategy', () => {
    test('should return pools for specific strategy', async () => {
      const loopingPools = await tvlManager.getPoolsByStrategy('SINGLE-ASSET-LOOPING');
      
      expect(Array.isArray(loopingPools)).toBe(true);
      
      if (loopingPools.length > 0) {
        // Should have utilization rate for looping strategies
        loopingPools.forEach(pool => {
          expect(pool.utilizationRate).toBeDefined();
        });
      }
    });

    test('should return empty array for non-existent strategy', async () => {
      const nonExistentPools = await tvlManager.getPoolsByStrategy('NONEXISTENT-STRATEGY');
      
      expect(Array.isArray(nonExistentPools)).toBe(true);
      expect(nonExistentPools.length).toBe(0);
    });
  });

  describe('getPoolGrowthMetrics', () => {
    test('should return growth metrics for a pool', async () => {
      const currentTVL = await tvlManager.getPoolTVL('ALPHA');
      
      // Create mock previous data with lower TVL
      const previousTVL: PoolTVLData = {
        ...currentTVL,
        totalValueLockedUSD: currentTVL.totalValueLockedUSD.mul(0.9), // 10% lower
      };
      
      const growthMetrics = await tvlManager.getPoolGrowthMetrics('ALPHA', previousTVL);
      
      expect(growthMetrics).toHaveProperty('tvlGrowth');
      expect(growthMetrics).toHaveProperty('growthRate');
      expect(growthMetrics).toHaveProperty('trend');
      
      expect(growthMetrics.tvlGrowth).toBeInstanceOf(Decimal);
      expect(growthMetrics.growthRate).toBeInstanceOf(Decimal);
      expect(['increasing', 'decreasing', 'stable']).toContain(growthMetrics.trend);
      
      // Should show positive growth
      expect(growthMetrics.tvlGrowth.toNumber()).toBeGreaterThan(0);
      expect(growthMetrics.trend).toBe('increasing');
    });

    test('should return zero growth when no previous data', async () => {
      const growthMetrics = await tvlManager.getPoolGrowthMetrics('ALPHA');
      
      expect(growthMetrics.tvlGrowth.toNumber()).toBe(0);
      expect(growthMetrics.growthRate.toNumber()).toBe(0);
      expect(growthMetrics.trend).toBe('stable');
    });

    test('should detect decreasing trend', async () => {
      const currentTVL = await tvlManager.getPoolTVL('ALPHA');
      
      // Create mock previous data with higher TVL
      const previousTVL: PoolTVLData = {
        ...currentTVL,
        totalValueLockedUSD: currentTVL.totalValueLockedUSD.mul(1.2), // 20% higher
      };
      
      const growthMetrics = await tvlManager.getPoolGrowthMetrics('ALPHA', previousTVL);
      
      expect(growthMetrics.tvlGrowth.toNumber()).toBeLessThan(0);
      expect(growthMetrics.trend).toBe('decreasing');
    });
  });

  describe('cache management', () => {
    test('should clear cache', () => {
      tvlManager.clearCache();
      // No assertions needed, just ensuring it doesn't throw
    });

    test('should clear expired cache entries', async () => {
      // Use a very short cache timeout
      const shortCacheManager = new TVLManager(mockSuiClient, 1);
      
      await shortCacheManager.getPoolTVL('ALPHA');
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      shortCacheManager.clearExpiredCache();
      // No assertions needed, just ensuring it doesn't throw
    });
  });

  describe('mock data validation', () => {
    test('should return different TVLs for different pool types', async () => {
      const alphaTVL = await tvlManager.getPoolTVL('ALPHA');
      const naviTVL = await tvlManager.getPoolTVL('NAVI-SUI');
      const cetusTVL = await tvlManager.getPoolTVL('CETUS-SUI-USDC');
      
      // TVLs should be different for different pools
      expect(alphaTVL.totalValueLockedUSD.toNumber())
        .not.toEqual(naviTVL.totalValueLockedUSD.toNumber());
      expect(naviTVL.totalValueLockedUSD.toNumber())
        .not.toEqual(cetusTVL.totalValueLockedUSD.toNumber());
    });

    test('should return realistic price ranges', async () => {
      const tvlData = await tvlManager.getPoolTVL('ALPHA');
      
      expect(tvlData.priceUSD!.toNumber()).toBeGreaterThan(0);
      expect(tvlData.priceUSD!.toNumber()).toBeLessThan(100000); // Reasonable upper bound
    });

    test('should maintain consistency between total and USD values', async () => {
      const tvlData = await tvlManager.getPoolTVL('ALPHA');
      
      const calculatedUSD = tvlData.totalValueLocked.mul(tvlData.priceUSD!);
      expect(tvlData.totalValueLockedUSD.toNumber())
        .toBeCloseTo(calculatedUSD.toNumber(), 2);
    });
  });

  describe('edge cases', () => {
    test('should handle pools with zero TVL gracefully', async () => {
      // This test assumes there might be inactive pools
      const tvlData = await tvlManager.getPoolTVL('ALPHA');
      
      expect(tvlData.totalValueLocked.toNumber()).toBeGreaterThanOrEqual(0);
      expect(tvlData.totalValueLockedUSD.toNumber()).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty pool list', async () => {
      const poolTVLs = await tvlManager.getPoolsTVL([]);
      
      expect(Array.isArray(poolTVLs)).toBe(true);
      expect(poolTVLs.length).toBe(0);
    });
  });

  describe('price calculations', () => {
    test('should return appropriate prices for stablecoins', async () => {
      const usdcTVL = await tvlManager.getPoolTVL('BUCKET-USDC');
      
      // Stablecoin prices should be close to $1
      if (usdcTVL.priceUSD) {
        expect(usdcTVL.priceUSD.toNumber()).toBeCloseTo(1, 1);
      }
    });

    test('should return variable prices for volatile assets', async () => {
      const suiTVL = await tvlManager.getPoolTVL('NAVI-SUI');
      
      // Volatile asset prices should be variable
      if (suiTVL.priceUSD) {
        expect(suiTVL.priceUSD.toNumber()).toBeGreaterThan(0);
        expect(suiTVL.priceUSD.toNumber()).toBeGreaterThan(0.1); // Reasonable lower bound
      }
    });
  });

  describe('options handling', () => {
    test('should respect ignoreCache option', async () => {
      const tvlData1 = await tvlManager.getPoolTVL('ALPHA');
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const tvlData2 = await tvlManager.getPoolTVL('ALPHA', { ignoreCache: true });
      
      expect(tvlData1.lastUpdated.getTime()).not.toEqual(tvlData2.lastUpdated.getTime());
    });

    test('should handle includeUSD option', async () => {
      const tvlData = await tvlManager.getPoolTVL('ALPHA', { includeUSD: true });
      
      expect(tvlData.priceUSD).toBeDefined();
      expect(tvlData.totalValueLockedUSD).toBeDefined();
      expect(tvlData.totalValueLockedUSD.toNumber()).toBeGreaterThan(0);
    });
  });
}); 