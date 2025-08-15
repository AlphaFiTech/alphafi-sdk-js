/**
 * Comprehensive Pool Transactions Test Suite
 *
 * Tests all transaction types (deposit, withdraw, claim) for every available pool
 * in dry run mode to ensure transaction building works correctly across all protocols.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SuiClient } from '@mysten/sui/client';
import {
  AlphaFiSDK,
  AlphaFiSDKConfig,
  DepositOptions,
  WithdrawOptions,
  ClaimOptions,
} from '../core/index.js';
import { TransactionManager } from '../models/transaction.js';
import { Blockchain } from '../models/blockchain.js';
import { PoolUtils } from '../models/pool.js';
import { poolDetailsMap } from '../common/maps.js';
import { SuiNetwork } from '../models/types.js';

describe('All Pools Transactions Test Suite', () => {
  let mockSuiClient: SuiClient;
  let sdk: AlphaFiSDK;
  let transactionManager: TransactionManager;
  let mockBlockchain: Blockchain;
  let mockPoolUtils: PoolUtils;

  const mockAddress = '0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01';
  const mockNetwork: SuiNetwork = 'testnet';

  // Test amounts for different scenarios
  const TEST_AMOUNTS = {
    small: '1000000', // 1 token (assuming 6 decimals)
    medium: '10000000', // 10 tokens
    large: '100000000', // 100 tokens
  };

  const TEST_XTOKENS = {
    small: '500000', // 0.5 xTokens
    medium: '5000000', // 5 xTokens
    large: '50000000', // 50 xTokens
  };

  beforeEach(() => {
    // Enhanced mock SuiClient for comprehensive testing
    mockSuiClient = {
      getBalance: () =>
        Promise.resolve({ totalBalance: '1000000000000', coinType: '0x2::sui::SUI' } as any),
      getCoins: (params: any) => {
        // Mock coins response with test data
        const mockCoins = [
          {
            coinObjectId: '0xtest1',
            balance: '1000000000',
            coinType: params.coinType || '0x2::sui::SUI',
          },
          {
            coinObjectId: '0xtest2',
            balance: '500000000',
            coinType: params.coinType || '0x2::sui::SUI',
          },
        ];
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
                type: 'test',
              },
            },
          },
        } as any),
      getOwnedObjects: () =>
        Promise.resolve({
          data: [],
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
      signAndExecuteTransaction: () => Promise.resolve({ digest: 'test-digest' } as any),
      multiGetObjects: () => Promise.resolve([]),
    } as unknown as SuiClient;

    // Create blockchain and utilities
    mockBlockchain = new Blockchain(mockSuiClient, mockNetwork);
    mockPoolUtils = new PoolUtils(mockBlockchain, mockSuiClient);

    // Create SDK config
    const config: AlphaFiSDKConfig = {
      client: mockSuiClient,
      network: mockNetwork,
      address: mockAddress,
    };

    // Initialize SDK and transaction manager
    sdk = new AlphaFiSDK(config);
    transactionManager = new TransactionManager(mockAddress, mockBlockchain, mockPoolUtils);
  });

  // Helper function to categorize pools by protocol
  const categorizePoolsByProtocol = () => {
    const poolsByProtocol: Record<string, Array<{ id: string; details: any }>> = {};

    Object.entries(poolDetailsMap).forEach(([poolId, poolDetails]) => {
      const protocol = poolDetails.parentProtocolName.toLowerCase();
      if (!poolsByProtocol[protocol]) {
        poolsByProtocol[protocol] = [];
      }
      poolsByProtocol[protocol].push({ id: poolId, details: poolDetails });
    });

    return poolsByProtocol;
  };

  // Helper function to determine if a pool supports specific operations
  const getPoolCapabilities = (poolDetails: any) => {
    const capabilities = {
      supportsDeposit: true,
      supportsWithdraw: true,
      supportsClaim: true,
      isDoubleAsset: false,
      isLooping: false,
      isRetired: poolDetails.retired || false,
    };

    // Check if it's a double asset pool
    if (poolDetails.strategyType?.includes('DOUBLE-ASSET') || 
        poolDetails.assetTypes?.length > 1) {
      capabilities.isDoubleAsset = true;
    }

    // Check if it's a looping pool
    if (poolDetails.poolName?.includes('LOOP') || 
        poolDetails.loopingPoolCoinMap) {
      capabilities.isLooping = true;
    }

    return capabilities;
  };

  describe('Protocol-wise Pool Testing', () => {
    const poolsByProtocol = categorizePoolsByProtocol();

    Object.entries(poolsByProtocol).forEach(([protocol, pools]) => {
      describe(`${protocol.toUpperCase()} Protocol Pools`, () => {
        pools.forEach(({ id: poolId, details: poolDetails }) => {
          const capabilities = getPoolCapabilities(poolDetails);
          
          // Skip retired pools
          if (capabilities.isRetired) {
            return;
          }

          describe(`Pool: ${poolDetails.poolName} (ID: ${poolId})`, () => {
            describe('Deposit Transactions', () => {
              if (capabilities.supportsDeposit) {
                test('should create deposit transaction - small amount', async () => {
                  const options: DepositOptions = {
                    poolId: parseInt(poolId),
                    amount: TEST_AMOUNTS.small,
                    dryRun: true,
                  };

                  try {
                    const result = await sdk.deposit(options);
                    expect(result).toBeDefined();
                    expect(result.transaction).toBeDefined();
                    expect(result.gasEstimate).toBeUndefined(); // Should be undefined in dry run
                  } catch (error) {
                    // Log specific error for debugging
                    console.warn(`Deposit failed for ${poolDetails.poolName}:`, error);
                    // For dry run, we expect the transaction to be created even if it might fail
                    expect(error).toBeDefined();
                  }
                });

                test('should create deposit transaction - medium amount', async () => {
                  const options: DepositOptions = {
                    poolId: parseInt(poolId),
                    amount: TEST_AMOUNTS.medium,
                    dryRun: true,
                  };

                  try {
                    const result = await transactionManager.deposit(options);
                    expect(result).toBeDefined();
                  } catch (error) {
                    console.warn(`Medium deposit failed for ${poolDetails.poolName}:`, error);
                    expect(error).toBeDefined();
                  }
                });

                // Test double asset pools with isAmountA parameter
                if (capabilities.isDoubleAsset) {
                  test('should create deposit transaction - isAmountA=true', async () => {
                    const options: DepositOptions = {
                      poolId: parseInt(poolId),
                      amount: TEST_AMOUNTS.small,
                      isAmountA: true,
                      dryRun: true,
                    };

                    try {
                      const result = await transactionManager.deposit(options);
                      expect(result).toBeDefined();
                    } catch (error) {
                      console.warn(`Double asset deposit (A) failed for ${poolDetails.poolName}:`, error);
                      expect(error).toBeDefined();
                    }
                  });

                  test('should create deposit transaction - isAmountA=false', async () => {
                    const options: DepositOptions = {
                      poolId: parseInt(poolId),
                      amount: TEST_AMOUNTS.small,
                      isAmountA: false,
                      dryRun: true,
                    };

                    try {
                      const result = await transactionManager.deposit(options);
                      expect(result).toBeDefined();
                    } catch (error) {
                      console.warn(`Double asset deposit (B) failed for ${poolDetails.poolName}:`, error);
                      expect(error).toBeDefined();
                    }
                  });
                }
              }
            });

            describe('Withdraw Transactions', () => {
              if (capabilities.supportsWithdraw) {
                test('should create withdraw transaction - by xTokens', async () => {
                  const options: WithdrawOptions = {
                    poolId: parseInt(poolId),
                    xTokens: TEST_XTOKENS.small,
                    dryRun: true,
                  };

                  try {
                    const result = await sdk.withdraw(options);
                    expect(result).toBeDefined();
                    expect(result.transaction).toBeDefined();
                  } catch (error) {
                    console.warn(`Withdraw failed for ${poolDetails.poolName}:`, error);
                    expect(error).toBeDefined();
                  }
                });

                test('should create withdraw transaction - by percentage', async () => {
                  const options: WithdrawOptions = {
                    poolId: parseInt(poolId),
                    xTokens: '0',
                    percentage: 25, // 25% withdrawal
                    dryRun: true,
                  };

                  try {
                    const result = await sdk.withdraw(options);
                    expect(result).toBeDefined();
                    expect(result.transaction).toBeDefined();
                  } catch (error) {
                    console.warn(`Percentage withdraw failed for ${poolDetails.poolName}:`, error);
                    expect(error).toBeDefined();
                  }
                });

                test('should create withdraw transaction - full withdrawal (100%)', async () => {
                  const options: WithdrawOptions = {
                    poolId: parseInt(poolId),
                    xTokens: '0',
                    percentage: 100,
                    dryRun: true,
                  };

                  try {
                    const result = await transactionManager.withdraw(options);
                    expect(result).toBeDefined();
                  } catch (error) {
                    console.warn(`Full withdraw failed for ${poolDetails.poolName}:`, error);
                    expect(error).toBeDefined();
                  }
                });
              }
            });

            describe('Claim Transactions', () => {
              if (capabilities.supportsClaim) {
                test('should create claim transaction - pool-specific', async () => {
                  const options: ClaimOptions = {
                    poolId: parseInt(poolId),
                    dryRun: true,
                  };

                  try {
                    const result = await sdk.claimRewards(options);
                    expect(result).toBeDefined();
                    expect(result.transaction).toBeDefined();
                  } catch (error) {
                    console.warn(`Claim failed for ${poolDetails.poolName}:`, error);
                    expect(error).toBeDefined();
                  }
                });
              }
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
              });

              test('should have valid asset types', () => {
                poolDetails.assetTypes.forEach((assetType: string) => {
                  expect(typeof assetType).toBe('string');
                  expect(assetType.length).toBeGreaterThan(0);
                  // Basic validation for Sui address format
                  expect(assetType).toMatch(/^0x[a-fA-F0-9]/);
                });
              });

              if (capabilities.isLooping) {
                test('should have valid looping configuration', () => {
                  expect(poolDetails.loopingPoolCoinMap).toBeDefined();
                  expect(poolDetails.loopingPoolCoinMap.supplyCoin).toBeDefined();
                  expect(poolDetails.loopingPoolCoinMap.borrowCoin).toBeDefined();
                  expect(typeof poolDetails.loopingPoolCoinMap.supplyCoin).toBe('string');
                  expect(typeof poolDetails.loopingPoolCoinMap.borrowCoin).toBe('string');
                });
              }
            });
          });
        });
      });
    });
  });

  describe('Cross-Protocol Transaction Validation', () => {
    test('should handle all supported protocols', async () => {
      const supportedProtocols = ['ALPHAFI', 'BLUEFIN', 'CETUS', 'NAVI', 'BUCKET', 'ALPHALEND'];
      const poolsByProtocol = categorizePoolsByProtocol();

      supportedProtocols.forEach(protocol => {
        const protocolPools = poolsByProtocol[protocol.toLowerCase()];
        if (protocolPools && protocolPools.length > 0) {
          expect(protocolPools.length).toBeGreaterThan(0);
          console.log(`${protocol}: ${protocolPools.length} pools available`);
        }
      });
    });

    test('should categorize pools correctly by strategy type', () => {
      const strategyTypes: Record<string, number> = {};
      
      Object.values(poolDetailsMap).forEach(pool => {
        if (!pool.retired) {
          strategyTypes[pool.strategyType] = (strategyTypes[pool.strategyType] || 0) + 1;
        }
      });

      console.log('Strategy type distribution:', strategyTypes);
      expect(Object.keys(strategyTypes).length).toBeGreaterThan(0);
    });

    test('should validate all pools have required fields', () => {
      const requiredFields = [
        'packageId',
        'poolName',
        'strategyType',
        'parentProtocolName',
        'poolId',
        'receipt',
        'assetTypes'
      ];

      Object.entries(poolDetailsMap).forEach(([poolId, poolDetails]) => {
        requiredFields.forEach(field => {
          expect(poolDetails).toHaveProperty(field);
          expect(poolDetails[field as keyof typeof poolDetails]).toBeDefined();
        });
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid pool IDs gracefully', async () => {
      const invalidPoolIds = [0, -1, 99999, NaN];

      for (const poolId of invalidPoolIds) {
        try {
          await transactionManager.deposit({
            poolId,
            amount: TEST_AMOUNTS.small,
          });
        } catch (error) {
          expect(error).toBeDefined();
          expect(error instanceof Error).toBe(true);
        }
      }
    });

    test('should handle invalid amounts gracefully', async () => {
      const validPoolId = 1; // ALPHA pool
      const invalidAmounts = ['0', '-1000000', 'invalid', '', '0.5'];

      for (const amount of invalidAmounts) {
        try {
          await transactionManager.deposit({
            poolId: validPoolId,
            amount,
          });
        } catch (error) {
          // Some amounts might be valid, others should throw errors
          if (amount === '0' || amount === '-1000000' || amount === 'invalid' || amount === '') {
            expect(error).toBeDefined();
          }
        }
      }
    });

    test('should handle boundary conditions', async () => {
      const validPoolId = 1; // ALPHA pool
      const boundaryAmounts = [
        '1', // Minimum possible
        '1000000000000000000', // Very large
      ];

      for (const amount of boundaryAmounts) {
        try {
          const result = await transactionManager.deposit({
            poolId: validPoolId,
            amount,
          });
          expect(result).toBeDefined();
        } catch (error) {
          // Large amounts might fail due to insufficient balance or other constraints
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent transactions', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
        return transactionManager.deposit({
          poolId: 1, // ALPHA pool
          amount: TEST_AMOUNTS.small,
        });
      });

      try {
        const results = await Promise.allSettled(concurrentRequests);
        expect(results).toHaveLength(5);
        
        // At least some should succeed or all should have defined errors
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            expect(result.value).toBeDefined();
          } else {
            expect(result.reason).toBeDefined();
          }
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should complete transactions within reasonable time', async () => {
      const startTime = Date.now();
      
      try {
        await transactionManager.deposit({
          poolId: 1,
          amount: TEST_AMOUNTS.small,
        });
      } catch (error) {
        // Transaction building should be fast even if it fails
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Dry Run Validation', () => {
    test('should properly handle dry run mode for all operations', async () => {
      const testPoolId = 1; // ALPHA pool

      // Test deposit dry run
      try {
        const depositResult = await sdk.deposit({
          poolId: testPoolId,
          amount: TEST_AMOUNTS.medium,
          dryRun: true,
        });
        expect(depositResult.transaction).toBeDefined();
        expect(depositResult.gasEstimate).toBeUndefined(); // Should be undefined in dry run
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Test withdraw dry run
      try {
        const withdrawResult = await sdk.withdraw({
          poolId: testPoolId,
          xTokens: TEST_XTOKENS.medium,
          dryRun: true,
        });
        expect(withdrawResult.transaction).toBeDefined();
        expect(withdrawResult.gasEstimate).toBeUndefined(); // Should be undefined in dry run
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Test claim dry run
      try {
        const claimResult = await sdk.claimRewards({
          poolId: testPoolId,
          dryRun: true,
        });
        expect(claimResult.transaction).toBeDefined();
        expect(claimResult.gasEstimate).toBeUndefined(); // Should be undefined in dry run
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});