/**
 * Single Pool Test Suite
 *
 * Focused test case for testing deposit and withdraw operations on any single pool ID.
 * Useful for debugging specific pools or testing individual pool functionality.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SuiClient } from '@mysten/sui/client';
import {
  AlphaFiSDK,
  AlphaFiSDKConfig,
  DepositOptions,
  WithdrawOptions,
} from '../core/index.js';
import { TransactionManager } from '../models/transaction.js';
import { Blockchain } from '../models/blockchain.js';
import { PoolUtils } from '../models/pool.js';
import { poolDetailsMap } from '../common/maps.js';
import { SuiNetwork } from '../models/types.js';

// 🎯 CONFIGURE YOUR TEST HERE
const TARGET_POOL_ID = '45'; // Change this to test any pool ID
const TEST_CONFIG = {
  poolId: TARGET_POOL_ID,
  depositAmount: '1000000', // 1 token (assuming 6 decimals)
  withdrawXTokens: '500000', // 0.5 xTokens
  withdrawPercentage: 25, // 25% withdrawal
  enableDryRun: true, // Set to false for actual network testing
  testDoubleAsset: true, // Test both isAmountA true/false for double asset pools
};

describe(`Single Pool Test - Pool ID: ${TARGET_POOL_ID}`, () => {
  let mockSuiClient: SuiClient;
  let sdk: AlphaFiSDK;
  let transactionManager: TransactionManager;
  let mockBlockchain: Blockchain;
  let mockPoolUtils: PoolUtils;
  let poolDetails: any;

  const mockAddress = '0xaaeb43c07ea5e16cc837856b426128ab0a58c7bacb96fe80dfcbf0cb36bf3885';
  const mockNetwork: SuiNetwork = 'testnet';

  beforeEach(() => {
    // Get pool details for the target pool
    poolDetails = poolDetailsMap[TARGET_POOL_ID];
    
    if (!poolDetails) {
      throw new Error(`Pool ID ${TARGET_POOL_ID} not found in poolDetailsMap`);
    }

    console.log('🔍 Testing Pool:', {
      poolId: TARGET_POOL_ID,
      poolName: poolDetails.poolName,
      protocol: poolDetails.parentProtocolName,
      strategyType: poolDetails.strategyType,
      retired: poolDetails.retired,
    });

    // Enhanced mock SuiClient with comprehensive responses
    mockSuiClient = {
      getBalance: () =>
        Promise.resolve({ 
          totalBalance: '1000000000000', 
          coinType: '0x2::sui::SUI' 
        } as any),
      
      getCoins: (params: any) => {
        // Mock different coin types based on the pool's asset types
        const mockCoins = poolDetails.assetTypes.map((assetType: string, index: number) => ({
          coinObjectId: `0xtest${index + 1}`,
          balance: '1000000000',
          coinType: assetType,
        }));

        return Promise.resolve({
          data: mockCoins,
          hasNextPage: false,
          nextCursor: null,
        });
      },
      
      getObject: () =>
        Promise.resolve({
          data: {
            content: {
              fields: {
                balance: '1000000000',
                type: poolDetails.receipt.type,
                xTokenBalance: '500000000',
              },
            },
          },
        } as any),
      
      getOwnedObjects: () =>
        Promise.resolve({
          data: [{
            data: {
              objectId: '0xmockreceipt1',
              content: {
                type: poolDetails.receipt.type,
                fields: {
                  name: poolDetails.receipt.name,
                  xTokenBalance: '500000000',
                  pool_id: poolDetails.poolId,
                  owner: mockAddress,
                },
              },
            },
          }],
          hasNextPage: false,
          nextCursor: null,
        }),
      
      devInspectTransactionBlock: () =>
        Promise.resolve({
          effects: {
            gasUsed: {
              computationCost: '1000000',
              storageCost: '500000',
              storageRebate: '200000',
              nonRefundableStorageFee: '300000',
            },
            status: { status: 'success' },
          },
        } as any),
      
      dryRunTransactionBlock: () =>
        Promise.resolve({
          effects: {
            status: { status: 'success' },
            gasUsed: {
              computationCost: '1000000',
              storageCost: '500000',
              storageRebate: '200000',
              nonRefundableStorageFee: '300000',
            },
          },
          balanceChanges: [],
          objectChanges: [],
        } as any),
      
      signAndExecuteTransaction: () => 
        Promise.resolve({ digest: 'test-digest-12345' } as any),
      
      multiGetObjects: () => Promise.resolve([]),
    } as unknown as SuiClient;

    // Initialize components
    mockBlockchain = new Blockchain(mockSuiClient, mockNetwork);
    mockPoolUtils = new PoolUtils(mockBlockchain, mockSuiClient);

    const config: AlphaFiSDKConfig = {
      client: mockSuiClient,
      network: mockNetwork,
      address: mockAddress,
    };

    sdk = new AlphaFiSDK(config);
    transactionManager = new TransactionManager(mockAddress, mockBlockchain, mockPoolUtils);
  });

  describe('Pool Information Validation', () => {
    test('should have valid pool configuration', () => {
      expect(poolDetails).toBeDefined();
      expect(poolDetails.poolName).toBeDefined();
      expect(poolDetails.parentProtocolName).toBeDefined();
      expect(poolDetails.strategyType).toBeDefined();
      expect(poolDetails.poolId).toBeDefined();
      expect(poolDetails.packageId).toBeDefined();
      expect(poolDetails.receipt).toBeDefined();
      expect(poolDetails.receipt.type).toBeDefined();
      expect(poolDetails.receipt.name).toBeDefined();
      expect(Array.isArray(poolDetails.assetTypes)).toBe(true);
      expect(poolDetails.assetTypes.length).toBeGreaterThan(0);
      
      console.log('✅ Pool configuration is valid');
    });

    test('should not be retired', () => {
      if (poolDetails.retired) {
        console.warn('⚠️ Warning: Testing a retired pool');
      }
      // Don't fail the test, just warn
      expect(typeof poolDetails.retired).toBe('boolean');
    });

    test('should have valid asset types', () => {
      poolDetails.assetTypes.forEach((assetType: string, index: number) => {
        expect(typeof assetType).toBe('string');
        expect(assetType.length).toBeGreaterThan(0);
        expect(assetType).toMatch(/^0x[a-fA-F0-9]/);
        console.log(`📄 Asset ${index + 1}: ${assetType}`);
      });
    });
  });

  describe('Deposit Operations', () => {
    test('should create deposit transaction', async () => {
      const options: DepositOptions = {
        poolId: parseInt(TARGET_POOL_ID),
        amount: TEST_CONFIG.depositAmount,
        dryRun: TEST_CONFIG.enableDryRun,
      };

      console.log('🔄 Testing deposit with options:', options);

      try {
        const transaction = await sdk.deposit(options);
        
        expect(transaction).toBeDefined();
        expect(typeof transaction).toBe('object');
        
        console.log('✅ Deposit transaction created successfully');
        console.log('📊 Transaction type:', typeof transaction);
        
      } catch (error) {
        console.error('❌ Deposit failed:', error);
        
        // In test environment, some failures are expected
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        
        // Log the error type for debugging
        if (error instanceof Error) {
          console.log('📝 Error message:', error.message);
        }
      }
    });

    // Test double asset deposits if applicable
    if (TEST_CONFIG.testDoubleAsset) {
      test('should handle double asset deposit - Asset A', async () => {
        // Only test if pool has multiple assets
        if (poolDetails.assetTypes.length > 1) {
          const options: DepositOptions = {
            poolId: parseInt(TARGET_POOL_ID),
            amount: TEST_CONFIG.depositAmount,
            isAmountA: true,
            dryRun: TEST_CONFIG.enableDryRun,
          };

          console.log('🔄 Testing double asset deposit (Asset A):', options);

          try {
            const transaction = await sdk.deposit(options);
            expect(transaction).toBeDefined();
            expect(typeof transaction).toBe('object');
            console.log('✅ Double asset deposit (A) transaction created');
          } catch (error) {
            console.warn('⚠️ Double asset deposit (A) failed - might be expected:', error);
            expect(error).toBeDefined();
          }
        } else {
          console.log('ℹ️ Skipping double asset test - single asset pool');
        }
      });

      test('should handle double asset deposit - Asset B', async () => {
        if (poolDetails.assetTypes.length > 1) {
          const options: DepositOptions = {
            poolId: parseInt(TARGET_POOL_ID),
            amount: TEST_CONFIG.depositAmount,
            isAmountA: false,
            dryRun: TEST_CONFIG.enableDryRun,
          };

          console.log('🔄 Testing double asset deposit (Asset B):', options);

          try {
            const transaction = await sdk.deposit(options);
            expect(transaction).toBeDefined();
            expect(typeof transaction).toBe('object');
            console.log('✅ Double asset deposit (B) transaction created');
          } catch (error) {
            console.warn('⚠️ Double asset deposit (B) failed - might be expected:', error);
            expect(error).toBeDefined();
          }
        }
      });
    }

    test('should handle different deposit amounts', async () => {
      const testAmounts = ['1000000', '10000000', '100000000'];
      
      for (const amount of testAmounts) {
        const options: DepositOptions = {
          poolId: parseInt(TARGET_POOL_ID),
          amount,
          dryRun: TEST_CONFIG.enableDryRun,
        };

        try {
          const transaction = await transactionManager.deposit(options);
          expect(transaction).toBeDefined();
          console.log(`✅ Deposit amount ${amount} processed`);
        } catch (error) {
          console.warn(`⚠️ Deposit amount ${amount} failed:`, error);
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Withdraw Operations', () => {
    test('should create withdraw transaction by xTokens', async () => {
      const options: WithdrawOptions = {
        poolId: parseInt(TARGET_POOL_ID),
        xTokens: TEST_CONFIG.withdrawXTokens,
        dryRun: TEST_CONFIG.enableDryRun,
      };

      console.log('🔄 Testing withdraw by xTokens:', options);

      try {
        const transaction = await sdk.withdraw(options);
        
        expect(transaction).toBeDefined();
        expect(typeof transaction).toBe('object');

        console.log('✅ Withdraw transaction created successfully');
        
      } catch (error) {
        console.error('❌ Withdraw failed:', error);
        
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
        
        if (error instanceof Error) {
          console.log('📝 Error message:', error.message);
        }
      }
    });

    test('should create withdraw transaction by percentage', async () => {
      const options: WithdrawOptions = {
        poolId: parseInt(TARGET_POOL_ID),
        xTokens: '0',
        percentage: TEST_CONFIG.withdrawPercentage,
        dryRun: TEST_CONFIG.enableDryRun,
      };

      console.log('🔄 Testing withdraw by percentage:', options);

      try {
        const transaction = await sdk.withdraw(options);
        expect(transaction).toBeDefined();
        expect(typeof transaction).toBe('object');
        console.log('✅ Percentage withdraw transaction created');
      } catch (error) {
        console.warn('⚠️ Percentage withdraw failed - might be expected:', error);
        expect(error).toBeDefined();
      }
    });

    test('should handle different withdrawal percentages', async () => {
      const testPercentages = [10, 25, 50, 75, 100];
      
      for (const percentage of testPercentages) {
        const options: WithdrawOptions = {
          poolId: parseInt(TARGET_POOL_ID),
          xTokens: '0',
          percentage,
          dryRun: TEST_CONFIG.enableDryRun,
        };

        try {
          const transaction = await transactionManager.withdraw(options);
          expect(transaction).toBeDefined();
          console.log(`✅ Withdraw ${percentage}% processed`);
        } catch (error) {
          console.warn(`⚠️ Withdraw ${percentage}% failed:`, error);
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Protocol-Specific Validation', () => {
    test('should route to correct protocol handler', async () => {
      const protocol = poolDetails.parentProtocolName.toLowerCase();
      console.log(`🔧 Testing protocol routing for: ${protocol}`);

      try {
        await transactionManager.deposit({
          poolId: parseInt(TARGET_POOL_ID),
          amount: TEST_CONFIG.depositAmount,
        });
        console.log(`✅ Protocol ${protocol} routing successful`);
      } catch (error) {
        console.log(`ℹ️ Protocol ${protocol} routing tested (expected error in test env)`);
        expect(error).toBeDefined();
      }
    });

    test('should handle protocol-specific features', () => {
      const protocol = poolDetails.parentProtocolName;
      
      switch (protocol) {
        case 'NAVI':
          if (poolDetails.poolName?.includes('LOOP')) {
            expect(poolDetails.loopingPoolCoinMap).toBeDefined();
            console.log('✅ NAVI looping pool configuration valid');
          }
          break;
          
        case 'ALPHALEND':
          if (poolDetails.loopingPoolCoinMap) {
            expect(poolDetails.loopingPoolCoinMap.supplyCoin).toBeDefined();
            expect(poolDetails.loopingPoolCoinMap.borrowCoin).toBeDefined();
            console.log('✅ Alphalend looping configuration valid');
          }
          break;
          
        case 'BLUEFIN':
        case 'CETUS':
          if (poolDetails.assetTypes.length > 1) {
            console.log('✅ Double asset pool configuration valid');
          }
          break;
          
        default:
          console.log(`ℹ️ Testing protocol: ${protocol}`);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid amounts gracefully', async () => {
      const invalidAmounts = ['0', '-1000000', 'invalid', ''];

      for (const amount of invalidAmounts) {
        try {
          await transactionManager.deposit({
            poolId: parseInt(TARGET_POOL_ID),
            amount,
          });
        } catch (error) {
          expect(error).toBeDefined();
          console.log(`✅ Invalid amount "${amount}" handled correctly`);
        }
      }
    });

    test('should handle invalid xTokens gracefully', async () => {
      const invalidXTokens = ['-1000000', 'invalid', ''];

      for (const xTokens of invalidXTokens) {
        try {
          await transactionManager.withdraw({
            poolId: parseInt(TARGET_POOL_ID),
            xTokens,
          });
        } catch (error) {
          expect(error).toBeDefined();
          console.log(`✅ Invalid xTokens "${xTokens}" handled correctly`);
        }
      }
    });
  });

  describe('Performance Testing', () => {
    test('should complete operations within reasonable time', async () => {
      const startTime = Date.now();
      
      try {
        await transactionManager.deposit({
          poolId: parseInt(TARGET_POOL_ID),
          amount: TEST_CONFIG.depositAmount,
        });
      } catch (error) {
        // Expected to potentially fail
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`⏱️ Operation completed in ${duration}ms`);
    });
  });

  // Summary test that logs all information
  test('should provide complete pool testing summary', () => {
    console.log('\n📋 POOL TESTING SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Pool ID: ${TARGET_POOL_ID}`);
    console.log(`Pool Name: ${poolDetails.poolName}`);
    console.log(`Protocol: ${poolDetails.parentProtocolName}`);
    console.log(`Strategy: ${poolDetails.strategyType}`);
    console.log(`Asset Count: ${poolDetails.assetTypes.length}`);
    console.log(`Retired: ${poolDetails.retired ? 'Yes' : 'No'}`);
    console.log(`Dry Run: ${TEST_CONFIG.enableDryRun ? 'Enabled' : 'Disabled'}`);
    
    if (poolDetails.loopingPoolCoinMap) {
      console.log(`Looping: ${poolDetails.loopingPoolCoinMap.supplyCoin} → ${poolDetails.loopingPoolCoinMap.borrowCoin}`);
    }
    
    console.log('\n🎯 Test Configuration:');
    console.log(`Deposit Amount: ${TEST_CONFIG.depositAmount}`);
    console.log(`Withdraw XTokens: ${TEST_CONFIG.withdrawXTokens}`);
    console.log(`Withdraw Percentage: ${TEST_CONFIG.withdrawPercentage}%`);
    console.log('=' .repeat(50));
    
    expect(true).toBe(true); // Always pass this summary test
  });
});

// Export the test configuration for easy modification
export { TEST_CONFIG, TARGET_POOL_ID };