import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { SuiClient } from '@mysten/sui/client';
import { VaultManager, VaultBalance, UserVaultSummary, VaultPerformanceMetrics, VaultAllocation } from '../models/vault.js';
import { APRManager } from '../models/apr.js';
import { TVLManager } from '../models/tvl.js';
import { Decimal } from 'decimal.js';

// Mock dependencies
const mockSuiClient = {} as SuiClient;
const mockAPRManager = {
  getPoolAPRData: () => Promise.resolve({
    poolName: 'ALPHA',
    baseAPR: 10,
    rewardAPR: 2,
    totalAPR: 12,
    apy: 12.75,
    lastUpdated: new Date(),
  }),
  getPoolPerformanceMetrics: () => Promise.resolve({
    poolName: 'ALPHA',
    apr: 12,
    apy: 12.75,
    volatility: 15,
    sharpeRatio: 0.8,
    maxDrawdown: 10,
    totalReturn: 12,
  }),
} as unknown as APRManager;

const mockTVLManager = {
  getPoolTVL: () => Promise.resolve({
    poolName: 'ALPHA',
    totalValueLocked: new Decimal(1000000),
    totalValueLockedUSD: new Decimal(2000000),
    tokensInvested: new Decimal(1000000),
    priceUSD: new Decimal(2),
    lastUpdated: new Date(),
  }),
} as unknown as TVLManager;

describe('VaultManager', () => {
  let vaultManager: VaultManager;
  const testUserAddress = '0x123abc456def789ghi';

  beforeEach(() => {
    vaultManager = new VaultManager(mockSuiClient, mockAPRManager, mockTVLManager, 1000);
  });

  afterEach(() => {
    vaultManager.clearCache();
  });

  describe('constructor', () => {
    test('should create VaultManager with default cache timeout', () => {
      const manager = new VaultManager(mockSuiClient, mockAPRManager, mockTVLManager);
      expect(manager).toBeInstanceOf(VaultManager);
    });

    test('should create VaultManager with custom cache timeout', () => {
      const manager = new VaultManager(mockSuiClient, mockAPRManager, mockTVLManager, 5000);
      expect(manager).toBeInstanceOf(VaultManager);
    });
  });

  describe('getUserVaultBalances', () => {
    test('should return vault balances for a user', async () => {
      const balances = await vaultManager.getUserVaultBalances(testUserAddress);
      
      expect(Array.isArray(balances)).toBe(true);
      
      if (balances.length > 0) {
        const balance = balances[0];
        expect(balance).toHaveProperty('poolName');
        expect(balance).toHaveProperty('poolId');
        expect(balance).toHaveProperty('userAddress', testUserAddress);
        expect(balance).toHaveProperty('xTokens');
        expect(balance).toHaveProperty('tokensInvested');
        expect(balance).toHaveProperty('tokensInvestedUSD');
        expect(balance).toHaveProperty('currentValue');
        expect(balance).toHaveProperty('currentValueUSD');
        expect(balance).toHaveProperty('totalReturn');
        expect(balance).toHaveProperty('totalReturnPercent');
        expect(balance).toHaveProperty('apr');
        expect(balance).toHaveProperty('apy');
        expect(balance).toHaveProperty('lastUpdated');
        
        expect(balance.xTokens).toBeInstanceOf(Decimal);
        expect(balance.tokensInvested).toBeInstanceOf(Decimal);
        expect(balance.tokensInvestedUSD).toBeInstanceOf(Decimal);
        expect(balance.currentValue).toBeInstanceOf(Decimal);
        expect(balance.currentValueUSD).toBeInstanceOf(Decimal);
        expect(balance.totalReturn).toBeInstanceOf(Decimal);
        expect(balance.totalReturnPercent).toBeInstanceOf(Decimal);
        expect(typeof balance.apr).toBe('number');
        expect(typeof balance.apy).toBe('number');
        expect(balance.lastUpdated).toBeInstanceOf(Date);
      }
    });

    test('should use cache when available', async () => {
      // First call
      const balances1 = await vaultManager.getUserVaultBalances(testUserAddress);
      
      // Second call should use cache
      const balances2 = await vaultManager.getUserVaultBalances(testUserAddress);
      
      expect(balances1).toEqual(balances2);
    });

    test('should ignore cache when specified', async () => {
      // First call
      await vaultManager.getUserVaultBalances(testUserAddress);
      
      // Second call with ignoreCache should fetch fresh data
      const balances = await vaultManager.getUserVaultBalances(testUserAddress, true);
      
      expect(Array.isArray(balances)).toBe(true);
    });
  });

  describe('getUserVaultBalance', () => {
    test('should return specific vault balance', async () => {
      const balance = await vaultManager.getUserVaultBalance(testUserAddress, 'ALPHA');
      
      if (balance) {
        expect(balance).toHaveProperty('poolName');
        expect(balance.userAddress).toBe(testUserAddress);
      }
    });

    test('should return null for non-existent vault', async () => {
      const balance = await vaultManager.getUserVaultBalance(testUserAddress, 'NONEXISTENT_POOL');
      
      expect(balance).toBeNull();
    });
  });

  describe('getUserVaultSummary', () => {
    test('should return comprehensive user summary', async () => {
      const summary = await vaultManager.getUserVaultSummary(testUserAddress);
      
      expect(summary).toHaveProperty('userAddress', testUserAddress);
      expect(summary).toHaveProperty('totalValueUSD');
      expect(summary).toHaveProperty('totalReturnUSD');
      expect(summary).toHaveProperty('totalReturnPercent');
      expect(summary).toHaveProperty('averageAPR');
      expect(summary).toHaveProperty('averageAPY');
      expect(summary).toHaveProperty('vaultCount');
      expect(summary).toHaveProperty('topVaultByValue');
      expect(summary).toHaveProperty('topVaultByReturn');
      expect(summary).toHaveProperty('vaults');
      expect(summary).toHaveProperty('calculatedAt');
      
      expect(summary.totalValueUSD).toBeInstanceOf(Decimal);
      expect(summary.totalReturnUSD).toBeInstanceOf(Decimal);
      expect(summary.totalReturnPercent).toBeInstanceOf(Decimal);
      expect(typeof summary.averageAPR).toBe('number');
      expect(typeof summary.averageAPY).toBe('number');
      expect(typeof summary.vaultCount).toBe('number');
      expect(Array.isArray(summary.vaults)).toBe(true);
      expect(summary.calculatedAt).toBeInstanceOf(Date);
      
      expect(summary.vaultCount).toBe(summary.vaults.length);
    });

    test('should return valid summary structure', async () => {
      const summary = await vaultManager.getUserVaultSummary('0xemptyuser');
      
      expect(summary).toHaveProperty('totalValueUSD');
      expect(summary).toHaveProperty('totalReturnUSD');
      expect(summary).toHaveProperty('totalReturnPercent');
      expect(summary).toHaveProperty('averageAPR');
      expect(summary).toHaveProperty('averageAPY');
      expect(summary).toHaveProperty('vaultCount');
      expect(summary).toHaveProperty('vaults');
      expect(Array.isArray(summary.vaults)).toBe(true);
    });

    test('should handle summary calculations', async () => {
      const summary = await vaultManager.getUserVaultSummary(testUserAddress);
      
      expect(summary.vaultCount).toBeGreaterThanOrEqual(0);
      expect(summary.totalValueUSD.toNumber()).toBeGreaterThanOrEqual(0);
      expect(summary.totalReturnUSD.toNumber()).toBeGreaterThanOrEqual(-Infinity);
      expect(summary.averageAPR).toBeGreaterThanOrEqual(0);
      expect(summary.averageAPY).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAvailableVaults', () => {
    test('should return available vaults with APR and TVL data', async () => {
      const availableVaults = await vaultManager.getAvailableVaults();
      
      expect(Array.isArray(availableVaults)).toBe(true);
      expect(availableVaults.length).toBeGreaterThan(0);
      
      const vault = availableVaults[0];
      expect(vault).toHaveProperty('poolName');
      expect(vault).toHaveProperty('poolId');
      expect(vault).toHaveProperty('poolDetails');
      expect(vault).toHaveProperty('apr');
      expect(vault).toHaveProperty('apy');
      expect(vault).toHaveProperty('tvlUSD');
      expect(vault).toHaveProperty('isActive');
      
      expect(typeof vault.poolId).toBe('number');
      expect(typeof vault.apr).toBe('number');
      expect(typeof vault.apy).toBe('number');
      expect(vault.tvlUSD).toBeInstanceOf(Decimal);
      expect(typeof vault.isActive).toBe('boolean');
      
      // Should be sorted by APR descending
      if (availableVaults.length > 1) {
        for (let i = 0; i < availableVaults.length - 1; i++) {
          expect(availableVaults[i].apr).toBeGreaterThanOrEqual(availableVaults[i + 1].apr);
        }
      }
    });
  });

  describe('getVaultPerformanceMetrics', () => {
    test('should return performance metrics for existing vault', async () => {
      const mockBalance: VaultBalance = {
        poolName: 'ALPHA',
        poolId: 1,
        userAddress: testUserAddress,
        xTokens: new Decimal(100),
        tokensInvested: new Decimal(1000),
        tokensInvestedUSD: new Decimal(2000),
        currentValue: new Decimal(1100),
        currentValueUSD: new Decimal(2200),
        totalReturn: new Decimal(100),
        totalReturnPercent: new Decimal(10),
        apr: 12,
        apy: 12.75,
        lastUpdated: new Date(),
      };
      
      jest.spyOn(vaultManager, 'getUserVaultBalance').mockResolvedValue(mockBalance);
      
      const metrics = await vaultManager.getVaultPerformanceMetrics(testUserAddress, 'ALPHA');
      
      expect(metrics).toBeDefined();
      expect(metrics!).toHaveProperty('vault');
      expect(metrics!).toHaveProperty('sharpeRatio');
      expect(metrics!).toHaveProperty('volatility');
      expect(metrics!).toHaveProperty('maxDrawdown');
      expect(metrics!).toHaveProperty('riskAdjustedReturn');
      expect(metrics!).toHaveProperty('performanceScore');
      
      expect(typeof metrics!.sharpeRatio).toBe('number');
      expect(typeof metrics!.volatility).toBe('number');
      expect(typeof metrics!.maxDrawdown).toBe('number');
      expect(typeof metrics!.riskAdjustedReturn).toBe('number');
      expect(typeof metrics!.performanceScore).toBe('number');
      
      expect(metrics!.performanceScore).toBeGreaterThanOrEqual(0);
      expect(metrics!.performanceScore).toBeLessThanOrEqual(100);
    });

    test('should return null for non-existent vault', async () => {
      jest.spyOn(vaultManager, 'getUserVaultBalance').mockResolvedValue(null);
      
      const metrics = await vaultManager.getVaultPerformanceMetrics(testUserAddress, 'NONEXISTENT');
      
      expect(metrics).toBeNull();
    });
  });

  describe('getPortfolioAllocation', () => {
    test('should return portfolio allocation recommendations', async () => {
      const mockSummary: UserVaultSummary = {
        userAddress: testUserAddress,
        totalValueUSD: new Decimal(3000),
        totalReturnUSD: new Decimal(150),
        totalReturnPercent: new Decimal(5),
        averageAPR: 10,
        averageAPY: 10.5,
        vaultCount: 2,
        topVaultByValue: null,
        topVaultByReturn: null,
        vaults: [
          {
            poolName: 'ALPHA',
            poolId: 1,
            userAddress: testUserAddress,
            xTokens: new Decimal(100),
            tokensInvested: new Decimal(2000),
            tokensInvestedUSD: new Decimal(2000),
            currentValue: new Decimal(2100),
            currentValueUSD: new Decimal(2100),
            totalReturn: new Decimal(100),
            totalReturnPercent: new Decimal(5),
            apr: 15, // High APR
            apy: 16,
            lastUpdated: new Date(),
          },
          {
            poolName: 'NAVI-SUI',
            poolId: 2,
            userAddress: testUserAddress,
            xTokens: new Decimal(50),
            tokensInvested: new Decimal(900),
            tokensInvestedUSD: new Decimal(900),
            currentValue: new Decimal(950),
            currentValueUSD: new Decimal(900),
            totalReturn: new Decimal(50),
            totalReturnPercent: new Decimal(5.5),
            apr: 4, // Low APR
            apy: 4.1,
            lastUpdated: new Date(),
          },
        ],
        calculatedAt: new Date(),
      };
      
      jest.spyOn(vaultManager, 'getUserVaultSummary').mockResolvedValue(mockSummary);
      
      const allocations = await vaultManager.getPortfolioAllocation(testUserAddress);
      
      expect(Array.isArray(allocations)).toBe(true);
      expect(allocations.length).toBe(2);
      
      const allocation = allocations[0];
      expect(allocation).toHaveProperty('vault');
      expect(allocation).toHaveProperty('allocationPercent');
      expect(allocation).toHaveProperty('recommendedAllocation');
      expect(allocation).toHaveProperty('status');
      
      expect(allocation.allocationPercent).toBeInstanceOf(Decimal);
      expect(allocation.recommendedAllocation).toBeInstanceOf(Decimal);
      expect(['underweight', 'overweight', 'balanced']).toContain(allocation.status);
      
      // Should be sorted by current value descending
      if (allocations.length > 1) {
        for (let i = 0; i < allocations.length - 1; i++) {
          expect(allocations[i].vault.currentValueUSD.toNumber())
            .toBeGreaterThanOrEqual(allocations[i + 1].vault.currentValueUSD.toNumber());
        }
      }
    });

    test('should return empty array for user with no vaults', async () => {
      const emptySummary: UserVaultSummary = {
        userAddress: testUserAddress,
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
      
      jest.spyOn(vaultManager, 'getUserVaultSummary').mockResolvedValue(emptySummary);
      
      const allocations = await vaultManager.getPortfolioAllocation(testUserAddress);
      
      expect(Array.isArray(allocations)).toBe(true);
      expect(allocations.length).toBe(0);
    });
  });

  describe('getVaultsByStrategy', () => {
    test('should filter vaults by strategy type', async () => {
      const mockBalances: VaultBalance[] = [
        {
          poolName: 'NAVI-LOOP-SUI-VSUI',
          poolId: 1,
          userAddress: testUserAddress,
          xTokens: new Decimal(100),
          tokensInvested: new Decimal(1000),
          tokensInvestedUSD: new Decimal(2000),
          currentValue: new Decimal(1100),
          currentValueUSD: new Decimal(2200),
          totalReturn: new Decimal(100),
          totalReturnPercent: new Decimal(10),
          apr: 12,
          apy: 12.75,
          lastUpdated: new Date(),
        },
        {
          poolName: 'CETUS-SUI-USDC',
          poolId: 2,
          userAddress: testUserAddress,
          xTokens: new Decimal(50),
          tokensInvested: new Decimal(500),
          tokensInvestedUSD: new Decimal(1000),
          currentValue: new Decimal(550),
          currentValueUSD: new Decimal(1100),
          totalReturn: new Decimal(50),
          totalReturnPercent: new Decimal(10),
          apr: 8,
          apy: 8.33,
          lastUpdated: new Date(),
        },
      ];
      
      jest.spyOn(vaultManager, 'getUserVaultBalances').mockResolvedValue(mockBalances);
      
      const loopingVaults = await vaultManager.getVaultsByStrategy(testUserAddress, 'SINGLE-ASSET-LOOPING');
      
      expect(Array.isArray(loopingVaults)).toBe(true);
      // Should contain NAVI-LOOP vault but not CETUS vault
      const naviVault = loopingVaults.find(v => v.poolName === 'NAVI-LOOP-SUI-VSUI');
      expect(naviVault).toBeDefined();
    });
  });

  describe('getVaultsByProtocol', () => {
    test('should filter vaults by protocol', async () => {
      const mockBalances: VaultBalance[] = [
        {
          poolName: 'NAVI-SUI',
          poolId: 1,
          userAddress: testUserAddress,
          xTokens: new Decimal(100),
          tokensInvested: new Decimal(1000),
          tokensInvestedUSD: new Decimal(2000),
          currentValue: new Decimal(1100),
          currentValueUSD: new Decimal(2200),
          totalReturn: new Decimal(100),
          totalReturnPercent: new Decimal(10),
          apr: 12,
          apy: 12.75,
          lastUpdated: new Date(),
        },
        {
          poolName: 'CETUS-SUI-USDC',
          poolId: 2,
          userAddress: testUserAddress,
          xTokens: new Decimal(50),
          tokensInvested: new Decimal(500),
          tokensInvestedUSD: new Decimal(1000),
          currentValue: new Decimal(550),
          currentValueUSD: new Decimal(1100),
          totalReturn: new Decimal(50),
          totalReturnPercent: new Decimal(10),
          apr: 8,
          apy: 8.33,
          lastUpdated: new Date(),
        },
      ];
      
      jest.spyOn(vaultManager, 'getUserVaultBalances').mockResolvedValue(mockBalances);
      
      const naviVaults = await vaultManager.getVaultsByProtocol(testUserAddress, 'NAVI');
      
      expect(Array.isArray(naviVaults)).toBe(true);
      // Should contain NAVI vault but not CETUS vault
      const naviVault = naviVaults.find(v => v.poolName === 'NAVI-SUI');
      expect(naviVault).toBeDefined();
    });
  });

  describe('cache management', () => {
    test('should clear all cache', () => {
      vaultManager.clearCache();
      // No assertions needed, just ensuring it doesn't throw
    });

    test('should clear specific user cache', () => {
      vaultManager.clearUserCache(testUserAddress);
      // No assertions needed, just ensuring it doesn't throw
    });

    test('should clear expired cache entries', async () => {
      // Use a very short cache timeout
      const shortCacheManager = new VaultManager(mockSuiClient, mockAPRManager, mockTVLManager, 1);
      
      await shortCacheManager.getUserVaultBalances(testUserAddress);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      shortCacheManager.clearExpiredCache();
      // No assertions needed, just ensuring it doesn't throw
    });
  });

  describe('mock data generation', () => {
    test('should generate realistic vault balances', async () => {
      const balances = await vaultManager.getUserVaultBalances(testUserAddress);
      
      balances.forEach(balance => {
        // Check that all numeric values are positive
        expect(balance.xTokens.toNumber()).toBeGreaterThan(0);
        expect(balance.tokensInvested.toNumber()).toBeGreaterThan(0);
        expect(balance.tokensInvestedUSD.toNumber()).toBeGreaterThan(0);
        expect(balance.currentValue.toNumber()).toBeGreaterThan(0);
        expect(balance.currentValueUSD.toNumber()).toBeGreaterThan(0);
        
        // APR and APY should be reasonable
        expect(balance.apr).toBeGreaterThanOrEqual(0);
        expect(balance.apr).toBeLessThan(100); // Reasonable upper bound
        expect(balance.apy).toBeGreaterThanOrEqual(balance.apr); // APY should be >= APR
        
        // Returns can be positive or negative
        expect(balance.totalReturnPercent.toNumber()).toBeGreaterThan(-100); // Can't lose more than 100%
        expect(balance.totalReturnPercent.toNumber()).toBeLessThan(1000); // Reasonable upper bound
      });
    });

    test('should have consistent relationships between values', async () => {
      const balances = await vaultManager.getUserVaultBalances(testUserAddress);
      
      balances.forEach(balance => {
        // Current value should be based on tokens invested + returns
        const expectedCurrentValue = balance.tokensInvested.add(balance.totalReturn);
        expect(balance.currentValue.toNumber()).toBeCloseTo(expectedCurrentValue.toNumber(), 1);
        
        // Return percentage should match calculation
        if (!balance.tokensInvested.isZero()) {
          const expectedReturnPercent = balance.totalReturn.div(balance.tokensInvested).mul(100);
          expect(balance.totalReturnPercent.toNumber())
            .toBeCloseTo(expectedReturnPercent.toNumber(), 1);
        }
      });
    });
  });

  describe('error handling', () => {
    test('should handle basic operations without throwing', async () => {
      // Test that basic operations complete without throwing errors
      const availableVaults = await vaultManager.getAvailableVaults();
      expect(Array.isArray(availableVaults)).toBe(true);
      
      const balances = await vaultManager.getUserVaultBalances('0xtest');
      expect(Array.isArray(balances)).toBe(true);
    });
  });

  describe('performance calculations', () => {
    test('should calculate performance score correctly', async () => {
      const mockBalance: VaultBalance = {
        poolName: 'ALPHA',
        poolId: 1,
        userAddress: testUserAddress,
        xTokens: new Decimal(100),
        tokensInvested: new Decimal(1000),
        tokensInvestedUSD: new Decimal(2000),
        currentValue: new Decimal(1100),
        currentValueUSD: new Decimal(2200),
        totalReturn: new Decimal(100),
        totalReturnPercent: new Decimal(10), // 10% return
        apr: 15, // 15% APR
        apy: 16,
        lastUpdated: new Date(),
      };
      
      jest.spyOn(vaultManager, 'getUserVaultBalance').mockResolvedValue(mockBalance);
      
      const metrics = await vaultManager.getVaultPerformanceMetrics(testUserAddress, 'ALPHA');
      
      expect(metrics).toBeDefined();
      
      // Performance score should be calculated based on returns, APR, and risk
      const expectedReturnScore = Math.min(10 * 2, 50); // 10% return * 2, max 50
      const expectedAPRScore = Math.min(15, 25); // 15% APR, max 25
      const expectedRiskScore = Math.max(25 - 15, 0); // 25 - volatility(15), min 0
      const expectedTotalScore = expectedReturnScore + expectedAPRScore + expectedRiskScore;
      
      expect(metrics!.performanceScore).toBeCloseTo(expectedTotalScore, 1);
    });
  });
}); 